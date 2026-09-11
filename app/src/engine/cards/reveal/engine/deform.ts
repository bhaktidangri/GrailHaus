// The tear's per-vertex deformation math, split out of buildPackObject.ts/buildVaultPackObject.ts
// so it can be tested without them.
//
// Both engines' builders reach for the Skia art chain at module scope (art/packArt.ts →
// @shopify/react-native-skia), which does not load outside React Native — so nothing that imports
// a builder is testable under Node. That mattered once this math became the hot path worth
// optimizing: it is the single most performance-sensitive code in the reveal (it runs over
// thousands of vertices on every frame a finger is moving) and simultaneously the code whose
// mistakes are least likely to throw. A cached term keyed off the wrong vertex just makes the
// foil peel subtly wrong.
//
// This module is pure arithmetic over typed arrays — no three.js, no Skia, no React. The builders
// own the geometry, the materials and the lifecycle; they call in here for the numbers.
//
// The `*Constants` functions exist for performance, not tidiness: every term they precompute is
// a pure function of a vertex's rest position, so leaving them in the per-frame loop meant
// recomputing identical values thousands of times a second. `noise()` in particular is ten
// sin/cos calls per invocation.
import { noise } from "./noise";

/** Geometry the deform math needs from the pack it belongs to. */
export interface PackDims {
  W: number;
  H: number;
  T: number;
  seamY: number;
  /** Vertical span of the tear-away lid strip, `H / 2 - seamY`. */
  lidSpanY: number;
  /** How far ahead of the tear front the peel reaches — `material.peel`, or 0.4 for Tier 1. */
  peel: number;
}

// ---- lid (the strip that peels off) ----------------------------------------

export interface LidConstants {
  u: Float32Array;
  dy: Float32Array;
  along: Float32Array;
  alongSin: Float32Array;
  /** `center[1] - seamY`, hoisted out of the loop. */
  seamOffset: number;
}

/** Per-vertex terms of the lid deform that do not move with tear progress. */
export function lidConstants(
  rest: Float32Array,
  count: number,
  center: readonly [number, number],
  dims: PackDims
): LidConstants {
  const { W, seamY, lidSpanY } = dims;
  const u = new Float32Array(count);
  const dy = new Float32Array(count);
  const along = new Float32Array(count);
  const alongSin = new Float32Array(count);
  const cx = center[0], cy = center[1];
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const uu = (rest[i3] + cx + W / 2) / W;
    const d = rest[i3 + 1] + cy - seamY;
    const a = Math.min(1, Math.max(0, d / lidSpanY));
    u[i] = uu;
    dy[i] = d;
    along[i] = a;
    alongSin[i] = Math.sin(a * Math.PI);
  }
  return { u, dy, along, alongSin, seamOffset: cy - seamY };
}

/**
 * Peel + crinkle: each column hinges at the crimp as the rip passes it, and the sheet gathers
 * into folds — foil buckles, it does not bend smoothly.
 *
 * Writes straight into `out` (the geometry's own position array) rather than through
 * BufferAttribute's accessors, which add a bounds-checked call per component.
 *
 * `stretch` is the pre-tear thumb stretch — Vault Break and Black Label pass a real amount and
 * position; Tier 1 has no such beat and passes 0, which compiles the whole term away to 0.
 */
export function deformLid(
  out: Float32Array,
  rest: Float32Array,
  count: number,
  c: LidConstants,
  dims: PackDims,
  q: number,
  stretchAmount = 0,
  stretchU = 0
): void {
  const { peel } = dims;
  const lead = q * (1 + peel);
  const { u: us, dy: dys, along: alongs, alongSin, seamOffset } = c;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = rest[i3], z = rest[i3 + 2];
    const u = us[i], dy = dys[i], along = alongs[i];
    const t = Math.min(1, Math.max(0, (lead - u) / peel));
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    const ahead = Math.max(0, 1 - Math.abs((lead - u) / (peel * 0.35)));
    const pull = stretchAmount > 0
      ? Math.max(0, 1 - Math.abs(u - stretchU) / 0.22) * stretchAmount : 0;

    const fold = Math.sin(u * Math.PI * 13 + q * 5) * alongSin[i];
    const crinkle = fold * 0.0031 * e + noise(u * 8 + q) * 0.0012 * e;

    const gone = Math.min(1, Math.max(0, (t - 0.72) / 0.28)) ** 1.6;
    const a = e * 2.35 * (0.5 + 0.5 * along) + crinkle * 26 + ahead * 0.22 * along;
    // One sin/cos pair reused for both rotated components — identical result to calling
    // Math.cos(a)/Math.sin(a) twice over, half the transcendental calls.
    const ca = Math.cos(a), sa = Math.sin(a);
    const ny = dy * ca - z * sa;
    const nz = dy * sa + z * ca + crinkle;

    const k = 1 - gone;
    out[i3] = x - e * 0.006 * (u - 0.5) + crinkle * 0.5;
    out[i3 + 1] = (ny - seamOffset + e * 0.0022 * along - ahead * 0.0009 * (1 - along)) * k;
    out[i3 + 2] = (nz - e * 0.0015 + ahead * 0.0016 * (1 - along) + pull * 0.0042 * (0.35 + along)) * k;
  }
}

// ---- body (the two walls that spring apart into a V) -----------------------

export interface BodyConstants {
  u: Float32Array;
  d: Float32Array;
  lip: Float32Array;
  /** `|noise(u * 14 + sign) * 0.0012|` — the absolute value folded in, since that is the only
   * form the deform uses. */
  buckle: Float32Array;
}

/** Per-vertex terms of the body deform that do not move with tear progress. */
export function bodyConstants(
  rest: Float32Array,
  count: number,
  center: readonly [number, number],
  sign: number,
  dims: PackDims
): BodyConstants {
  const { W, H, seamY } = dims;
  const u = new Float32Array(count);
  const d = new Float32Array(count);
  const lip = new Float32Array(count);
  const buckle = new Float32Array(count);
  const cx = center[0], cy = center[1];
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const X = rest[i3] + cx, Y = rest[i3 + 1] + cy;
    const uu = (X + W / 2) / W;
    u[i] = uu;
    d[i] = (seamY - Y) / (H * 0.3);
    lip[i] = Math.sin(Math.PI * Math.min(1, Math.max(0, uu)));
    buckle[i] = Math.abs(noise(uu * 14 + sign) * 0.0012);
  }
  return { u, d, lip, buckle };
}

/**
 * The mouth: once the strip is off, the two walls spring apart into a V and the torn edge
 * loosens and buckles.
 */
export function deformBody(
  out: Float32Array,
  rest: Float32Array,
  count: number,
  c: BodyConstants,
  dims: PackDims,
  sign: number,
  q: number
): void {
  const { T } = dims;
  const open = Math.min(1, Math.max(0, (q - 0.22) / 0.78));
  const ripU = Math.min(1, q / 0.8);
  const tugOff = q < 0.02;
  const { u: us, d: ds, lip: lips, buckle: buckles } = c;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = rest[i3], y = rest[i3 + 1], z = rest[i3 + 2];
    const u = us[i], d = ds[i], lip = lips[i];
    const gf = Math.pow(Math.max(0, 1 - d), 2.2) * open;
    const buckle = buckles[i] * gf;
    const tug = tugOff ? 0
      : Math.max(0, 1 - Math.abs(u - ripU) / 0.16) * Math.max(0, 1 - d) * 0.0014;
    out[i3] = x * (1 + gf * 0.05 * lip);
    out[i3 + 1] = y - gf * 0.0015 + tug * 0.6;
    out[i3 + 2] = z + sign * (gf * T * 2.4 * lip + buckle + tug);
  }
}

// ---- liner (Vault Break / Black Label only) --------------------------------

export interface LinerConstants {
  d: Float32Array;
  lip: Float32Array;
  /** The static half of the wall term — `pillowZ(u, v)` at the vertex's rest position. */
  pillow: Float32Array;
}

/** Per-vertex terms of the liner deform that do not move with tear progress. `pillowZ` is two
 * Math.pow plus two Math.sin per vertex and depends only on rest position. */
export function linerConstants(
  rest: Float32Array,
  count: number,
  dims: PackDims,
  pillowZ: (u: number, v: number) => number
): LinerConstants {
  const { W, H, seamY } = dims;
  const d = new Float32Array(count);
  const lip = new Float32Array(count);
  const pillow = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = rest[i3], Y = rest[i3 + 1];
    const u = (x + W / 2) / W;
    d[i] = (seamY - Y) / (H * 0.3);
    lip[i] = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
    pillow[i] = pillowZ(u, (Y + H / 2) / H);
  }
  return { d, lip, pillow };
}

/** The metal web inside the mouth, following the body walls as they gape. */
export function deformLiner(
  out: Float32Array,
  rest: Float32Array,
  count: number,
  c: LinerConstants,
  dims: PackDims,
  sign: number,
  q: number
): void {
  const { T } = dims;
  const open = Math.min(1, Math.max(0, (q - 0.22) / 0.78));
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = rest[i3], Y = rest[i3 + 1];
    const d = c.d[i], lip = c.lip[i];
    const gf = Math.pow(Math.max(0, 1 - d), 2.2) * open;
    const wall = gf * T * 2.4 * lip + c.pillow[i];
    out[i3] = x * (1 + gf * 0.05 * lip) * 0.97;
    out[i3 + 1] = Y - gf * 0.0015;
    out[i3 + 2] = sign * wall * 0.68;
  }
}

/** True when the gape has opened far enough for the liner to be visible at all. Below this the
 * liner sits fully enclosed by the body sheets, so deforming it draws nothing. */
export function linerVisibleAt(q: number): boolean {
  return Math.min(1, Math.max(0, (q - 0.22) / 0.78)) > 0.015;
}

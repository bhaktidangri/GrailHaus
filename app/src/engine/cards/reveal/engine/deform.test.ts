// Pins the tear deformation math (./deform.ts) against the implementation it replaced.
//
// That extraction was a performance pass, not a behaviour change: precompute the per-vertex
// terms that don't depend on tear progress, write into the position buffer directly instead of
// through BufferAttribute's accessors, reuse one sin/cos pair, and skip whole passes when
// nothing moved. Not one vertex position was supposed to change.
//
// The risk in a change shaped like that is a silent visual regression. A cached term keyed off
// the wrong vertex, `Math.abs` folded to the wrong side of a multiply, a `center[1]` hoisted out
// of a loop that needed the per-sheet value — none of those throw. They just make the foil peel
// subtly wrong, which survives review and gets noticed on a device weeks later.
//
// So the reference implementations below are the deform math exactly as it stood before the
// pass (the pre-optimization loops, including their per-vertex recomputation), and every case
// asserts the shipped code still lands on the same numbers.
import { describe, expect, it } from "vitest";
import {
  bodyConstants, deformBody, deformLid, deformLiner,
  lidConstants, linerConstants, linerVisibleAt,
  type PackDims,
} from "./deform";
import { noise } from "./noise";
import { cardPackPersonality } from "../config/cardPack.config";
import { vaultBreakPersonality } from "../../vaultReveal/config/vaultBreak.config";

// Tier 1's real dimensions, so this exercises the numbers the app actually ships.
const { size, seamFrac, flapFrac } = cardPackPersonality;
const W = size.width, H = size.height, T = size.thickness;
const seamY = H / 2 - seamFrac * H;
const DIMS: PackDims = { W, H, T, seamY, lidSpanY: H / 2 - seamY, peel: 0.4 };

/** Vault Break's own peel constant differs (material.peel), so the shared math gets exercised
 * at both tiers' settings rather than only Tier 1's. */
const VAULT_DIMS: PackDims = { ...DIMS, peel: vaultBreakPersonality.material.peel };

/** A deterministic stand-in for a sheet's rest buffer: a regular grid over the sheet's extent
 * with a little per-vertex jitter, so vertices are not all on tidy round numbers (which could
 * hide an off-by-one in the cached tables). */
function makeRest(nx: number, ny: number, x0: number, x1: number, y0: number, y1: number) {
  const count = (nx + 1) * (ny + 1);
  const rest = new Float32Array(count * 3);
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let i = 0;
  for (let yi = 0; yi <= ny; yi++) {
    for (let xi = 0; xi <= nx; xi++) {
      // Stored relative to the sheet centre, exactly as PlaneGeometry does.
      rest[i * 3] = x0 + ((x1 - x0) * xi) / nx - cx;
      rest[i * 3 + 1] = y0 + ((y1 - y0) * yi) / ny - cy;
      rest[i * 3 + 2] = (rand() - 0.5) * T * 0.5;
      i++;
    }
  }
  return { rest, count, center: [cx, cy] as [number, number] };
}

// ---- reference implementations (pre-optimization, verbatim) -----------------

function referenceLid(
  rest: Float32Array, count: number, center: [number, number],
  dims: PackDims, q: number, stretchAmt = 0, stretchU = 0
): Float32Array {
  const { W: w, seamY: sy, lidSpanY, peel: PEEL } = dims;
  const out = new Float32Array(count * 3);
  const lead = q * (1 + PEEL);
  for (let i = 0; i < count; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
    const X = x + center[0];
    const u = (X + w / 2) / w;
    const t = Math.min(1, Math.max(0, (lead - u) / PEEL));
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    const ahead = Math.max(0, 1 - Math.abs((lead - u) / (PEEL * 0.35)));
    const pull = stretchAmt > 0
      ? Math.max(0, 1 - Math.abs(u - stretchU) / 0.22) * stretchAmt : 0;
    const dy = y + center[1] - sy;
    const along = Math.min(1, Math.max(0, dy / lidSpanY));

    const fold = Math.sin(u * Math.PI * 13 + q * 5) * Math.sin(along * Math.PI);
    const crinkle = fold * 0.0031 * e + noise(u * 8 + q) * 0.0012 * e;

    const gone = Math.min(1, Math.max(0, (t - 0.72) / 0.28)) ** 1.6;
    const a = e * 2.35 * (0.5 + 0.5 * along) + crinkle * 26 + ahead * 0.22 * along;
    const ny = dy * Math.cos(a) - z * Math.sin(a);
    const nz = dy * Math.sin(a) + z * Math.cos(a) + crinkle;

    const k = 1 - gone;
    out[i * 3] = x - e * 0.006 * (u - 0.5) + crinkle * 0.5;
    out[i * 3 + 1] = (ny - (center[1] - sy) + e * 0.0022 * along - ahead * 0.0009 * (1 - along)) * k;
    out[i * 3 + 2] = (nz - e * 0.0015 + ahead * 0.0016 * (1 - along) + pull * 0.0042 * (0.35 + along)) * k;
  }
  return out;
}

function referenceBody(
  rest: Float32Array, count: number, center: [number, number],
  dims: PackDims, sign: number, q: number
): Float32Array {
  const { W: w, H: h, T: t_, seamY: sy } = dims;
  const out = new Float32Array(count * 3);
  const open = Math.min(1, Math.max(0, (q - 0.22) / 0.78));
  for (let i = 0; i < count; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
    const X = x + center[0], Y = y + center[1];
    const u = (X + w / 2) / w;
    const d = (sy - Y) / (h * 0.3);
    const gf = Math.pow(Math.max(0, 1 - d), 2.2) * open;
    const lip = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
    const buckle = noise(u * 14 + sign) * 0.0012 * gf;
    const ripU = Math.min(1, q / 0.8);
    const tug = q < 0.02 ? 0
      : Math.max(0, 1 - Math.abs(u - ripU) / 0.16) * Math.max(0, 1 - d) * 0.0014;
    out[i * 3] = x * (1 + gf * 0.05 * lip);
    out[i * 3 + 1] = y - gf * 0.0015 + tug * 0.6;
    out[i * 3 + 2] = z + sign * (gf * t_ * 2.4 * lip + Math.abs(buckle) + tug);
  }
  return out;
}

const pillowZ = (u: number, v: number) => {
  const t = (v - flapFrac) / (1 - 2 * flapFrac);
  if (t <= 0 || t >= 1) return 0;
  const uu = Math.min(1, Math.max(0, u));
  return (T / 2) * Math.pow(Math.sin(Math.PI * uu), 0.55) * Math.pow(Math.sin(Math.PI * t), 0.5);
};

function referenceLiner(
  rest: Float32Array, count: number, dims: PackDims, sign: number, q: number
): Float32Array {
  const { W: w, H: h, T: t_, seamY: sy } = dims;
  const out = new Float32Array(count * 3);
  const open = Math.min(1, Math.max(0, (q - 0.22) / 0.78));
  for (let i = 0; i < count; i++) {
    const x = rest[i * 3], Y = rest[i * 3 + 1];
    const u = (x + w / 2) / w;
    const d = (sy - Y) / (h * 0.3);
    const gf = Math.pow(Math.max(0, 1 - d), 2.2) * open;
    const lip = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
    const wall = gf * t_ * 2.4 * lip + pillowZ(u, (Y + h / 2) / h);
    out[i * 3] = x * (1 + gf * 0.05 * lip) * 0.97;
    out[i * 3 + 1] = Y - gf * 0.0015;
    out[i * 3 + 2] = sign * wall * 0.68;
  }
  return out;
}

function expectSame(actual: Float32Array, expected: Float32Array) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    // Float32 round-trip through the typed arrays, so compare at float32 precision rather than
    // demanding bit-identical doubles.
    expect(actual[i]).toBeCloseTo(expected[i], 6);
  }
}

// Progress values chosen to straddle every branch in the math: sealed, the tug threshold
// (0.02), the gape threshold (0.22), mid-peel, the peel end (0.8), tear-off (0.97) and fully
// open. Off-by-one errors in a cached table show up across a sweep like this, not at one value.
const PROGRESSES = [0, 0.01, 0.02, 0.1, 0.21, 0.22, 0.35, 0.5, 0.72, 0.8, 0.9, 0.97, 1];

describe("deformLid", () => {
  const { rest, count, center } = makeRest(56, 16, -W / 2, W / 2, seamY, H / 2);

  it.each(PROGRESSES)("matches the pre-optimization math at q=%s", (q) => {
    const c = lidConstants(rest, count, center, DIMS);
    const out = new Float32Array(count * 3);
    deformLid(out, rest, count, c, DIMS, q);
    expectSame(out, referenceLid(rest, count, center, DIMS, q));
  });

  // Vault Break and Black Label pass a real pre-tear stretch; Tier 1 never does. The stretch
  // term is the one place the two tiers' lid math genuinely diverges, so it gets its own sweep.
  it.each([
    [0.2, 0.3], [0.5, 0.5], [0.8, 0.75],
  ])("matches with a pre-tear stretch of %s at u=%s", (amount, u) => {
    const c = lidConstants(rest, count, center, VAULT_DIMS);
    for (const q of [0, 0.25, 0.6, 1]) {
      const out = new Float32Array(count * 3);
      deformLid(out, rest, count, c, VAULT_DIMS, q, amount, u);
      expectSame(out, referenceLid(rest, count, center, VAULT_DIMS, q, amount, u));
    }
  });

  it("honours each tier's own peel constant", () => {
    // Vault Break's peel (0.42) differs from Tier 1's (0.4); a hardcoded constant would pass the
    // Tier 1 cases above and silently break the other two tiers.
    expect(VAULT_DIMS.peel).not.toBe(DIMS.peel);
    const c = lidConstants(rest, count, center, VAULT_DIMS);
    const out = new Float32Array(count * 3);
    deformLid(out, rest, count, c, VAULT_DIMS, 0.5);
    expectSame(out, referenceLid(rest, count, center, VAULT_DIMS, 0.5));
  });

  it("is a pure function of progress — replaying an earlier q restores that geometry", () => {
    const c = lidConstants(rest, count, center, DIMS);
    const first = new Float32Array(count * 3);
    deformLid(first, rest, count, c, DIMS, 0.4);
    // Drive it forwards and back, as a reversed drag does.
    const scratch = new Float32Array(count * 3);
    for (const q of [0.5, 0.7, 0.95, 0.6, 0.1]) deformLid(scratch, rest, count, c, DIMS, q);
    const again = new Float32Array(count * 3);
    deformLid(again, rest, count, c, DIMS, 0.4);
    expect(Array.from(again)).toEqual(Array.from(first));
  });
});

describe("deformBody", () => {
  const { rest, count, center } = makeRest(48, 40, -W / 2, W / 2, -H / 2, seamY);

  it.each(PROGRESSES)("matches the pre-optimization math at q=%s (front sheet)", (q) => {
    const c = bodyConstants(rest, count, center, 1, DIMS);
    const out = new Float32Array(count * 3);
    deformBody(out, rest, count, c, DIMS, 1, q);
    expectSame(out, referenceBody(rest, count, center, DIMS, 1, q));
  });

  // The back sheet's sign flips both the buckle noise's input and the Z displacement's
  // direction — the `Math.abs` fold in bodyConstants had to keep that straight.
  it.each(PROGRESSES)("matches the pre-optimization math at q=%s (back sheet)", (q) => {
    const c = bodyConstants(rest, count, center, -1, DIMS);
    const out = new Float32Array(count * 3);
    deformBody(out, rest, count, c, DIMS, -1, q);
    expectSame(out, referenceBody(rest, count, center, DIMS, -1, q));
  });

  it("keeps the pack sealed below the gape threshold", () => {
    const c = bodyConstants(rest, count, center, 1, DIMS);
    const sealed = new Float32Array(count * 3);
    deformBody(sealed, rest, count, c, DIMS, 1, 0);
    const stillSealed = new Float32Array(count * 3);
    deformBody(stillSealed, rest, count, c, DIMS, 1, 0.22);
    // At and below 0.22 the gape term is exactly 0, so the only thing that can differ is the
    // tug — which is confined to a band around the rip front and must not move the whole sheet.
    for (let i = 0; i < count; i++) {
      expect(stillSealed[i * 3]).toBeCloseTo(sealed[i * 3], 6);
    }
  });

  it("opens monotonically in Z as progress advances", () => {
    const c = bodyConstants(rest, count, center, 1, DIMS);
    // The vertex nearest the seam gapes the most; track the sheet's peak Z displacement.
    const peak = (q: number) => {
      const out = new Float32Array(count * 3);
      deformBody(out, rest, count, c, DIMS, 1, q);
      let m = -Infinity;
      for (let i = 0; i < count; i++) m = Math.max(m, out[i * 3 + 2]);
      return m;
    };
    expect(peak(0.4)).toBeGreaterThan(peak(0.22));
    expect(peak(0.7)).toBeGreaterThan(peak(0.4));
    expect(peak(1)).toBeGreaterThan(peak(0.7));
  });
});

describe("deformLiner", () => {
  const { rest, count } = makeRest(24, 14, -W * 0.45, W * 0.45, seamY - H * 0.28, seamY);

  it.each(PROGRESSES)("matches the pre-optimization math at q=%s", (q) => {
    const c = linerConstants(rest, count, DIMS, pillowZ);
    for (const sign of [1, -1]) {
      const out = new Float32Array(count * 3);
      deformLiner(out, rest, count, c, DIMS, sign, q);
      expectSame(out, referenceLiner(rest, count, DIMS, sign, q));
    }
  });

  // The engine skips the liner deform entirely when this is false, so the threshold has to line
  // up with the gape actually being open — otherwise the liner freezes a frame behind, or gets
  // deformed while fully occluded (the cost this guard exists to avoid).
  it("reports hidden while the mouth is shut and visible once it gapes", () => {
    expect(linerVisibleAt(0)).toBe(false);
    expect(linerVisibleAt(0.22)).toBe(false);
    expect(linerVisibleAt(0.5)).toBe(true);
    expect(linerVisibleAt(1)).toBe(true);
  });

  it("has nothing to show at the moment it becomes visible", () => {
    // Just past the threshold the gape is barely open, so the liner's wall term should still be
    // dominated by its rest pillow — i.e. it fades in rather than popping.
    const c = linerConstants(rest, count, DIMS, pillowZ);
    const justOpen = new Float32Array(count * 3);
    deformLiner(justOpen, rest, count, c, DIMS, 1, 0.24);
    const wideOpen = new Float32Array(count * 3);
    deformLiner(wideOpen, rest, count, c, DIMS, 1, 1);
    let maxJust = 0, maxWide = 0;
    for (let i = 0; i < count; i++) {
      maxJust = Math.max(maxJust, Math.abs(justOpen[i * 3 + 2]));
      maxWide = Math.max(maxWide, Math.abs(wideOpen[i * 3 + 2]));
    }
    expect(maxJust).toBeLessThan(maxWide);
  });
});

describe("precomputed constants", () => {
  const { rest, count, center } = makeRest(12, 8, -W / 2, W / 2, -H / 2, seamY);

  // These tables are the whole point of the optimization; if they were ever recomputed per frame
  // the change would be pointless, and if they were shared across sheets it would be wrong.
  it("derives body constants that do not depend on progress", () => {
    const a = bodyConstants(rest, count, center, 1, DIMS);
    const b = bodyConstants(rest, count, center, 1, DIMS);
    expect(Array.from(a.u)).toEqual(Array.from(b.u));
    expect(Array.from(a.buckle)).toEqual(Array.from(b.buckle));
  });

  it("gives the two body sheets different buckle tables", () => {
    // The buckle noise is seeded with the sheet's sign, so front and back must not collide —
    // if they did, both walls would crease identically and the pack would read as symmetrical.
    const front = bodyConstants(rest, count, center, 1, DIMS);
    const back = bodyConstants(rest, count, center, -1, DIMS);
    expect(Array.from(front.buckle)).not.toEqual(Array.from(back.buckle));
  });

  it("stores the buckle magnitude, never a negative", () => {
    const c = bodyConstants(rest, count, center, 1, DIMS);
    for (let i = 0; i < count; i++) expect(c.buckle[i]).toBeGreaterThanOrEqual(0);
  });

  it("clamps `along` into 0..1 across the lid", () => {
    const lid = makeRest(20, 10, -W / 2, W / 2, seamY, H / 2);
    const c = lidConstants(lid.rest, lid.count, lid.center, DIMS);
    for (let i = 0; i < lid.count; i++) {
      expect(c.along[i]).toBeGreaterThanOrEqual(0);
      expect(c.along[i]).toBeLessThanOrEqual(1);
    }
  });
});

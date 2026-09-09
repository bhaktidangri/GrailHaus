import type { VaultBreakPersonality } from "../../vaultReveal/config/types";

// Tier 3 — "Black Label", per GrailHaus Product Requirements Document.md §6/§11: $250, 7 cards,
// "high-stakes collecting... the user should feel 'something serious could happen here.'"
// Guarantees at least 2 Prime-or-Grail cards and a premium final reveal position; a Grail is
// never guaranteed by default ("the chase must remain meaningful").
//
// Reuses Vault Break's exact personality shape (see ../../vaultReveal/config/types.ts's header)
// — same engine, same staged-reveal machinery, same tap/drag/pinch/flip inspection. Only the
// numbers below differ: a heavier, stiffer foil; a longer, more deliberate reveal sequence (the
// PRD's "premium final reveal position" reads, here, as more time held on the notice/present
// beats before the Grail — or lack of one — actually lands); and the onyx/bronze palette +
// lighting anchored to PackTile.tsx's existing `ART_GRADIENT.black_label` (`#FFF0CC` →
// `#5C4520`), the one piece of this tier's visual identity that already shipped before this file
// existed.
const BASE_W = 0.068;

export const blackLabelPersonality: VaultBreakPersonality = {
  id: "black-label",
  // Slightly larger than Vault Break's pack (1.03x base) — a heftier object for the pricier
  // tier, same proportions.
  size: { width: BASE_W * 1.08, height: BASE_W * 1.08 * (1200 / 800), thickness: 0.0205 },
  seamFrac: 0.222,
  flapFrac: 0.074,
  palette: {
    violet: "#241a08",
    plum: "#100e08",
    ink: "#050403",
    champagne: "#c9a24a",
    champagneHi: "#f0dba0",
    champagneMid: "#8a6a2e",
    champagneDark: "#3a2a10",
    graphite: "#211f1a",
    ivory: "#f0ece2",
  },
  copy: {
    kicker: "Tier III · Sealed",
    title: "Black ",
    titleEmphasis: "Label",
    meta: ["7 CARDS", "2 PRIME OR ABOVE", "SERIES I · S·1c"],
    hintDrag: "Drag along the seam",
    hintInspect: "Tap a card to inspect",
  },
  // Stiffer, denser foil than Vault Break (lower roughness/higher metalness) — reads as a
  // heavier-gauge material under the thumb, matching "something serious could happen here."
  material: { roughness: 0.15, metalness: 0.7, peel: 0.44 },
  // A longer pre-tear stretch (0.07 vs. Vault Break's 0.05) and a stiffer spring (springK 44 vs.
  // 40) — the foil resists a beat longer before it gives, and settles with less bounce once it
  // does.
  tear: { stretch: 0.07, releaseFrac: 0.75, springK: 44, damping: 0.76, glint: 0.8 },
  liner: { enabled: true, metalness: 0.97, roughness: 0.18 },
  riseY: 0.048,
  fan: {
    stepX: 0.026, angle: 0.14, arcDrop: 0.0042, liftY: 0.024,
    heroZ: 0.026, heroScale: 1.16, grailZ: 0.02,
  },
  // Every stage runs a little longer than Vault Break's — this tier is meant to be sat with, not
  // rushed through; `notice`/`present` in particular (the rarity moment itself) get the biggest
  // bump, since a Grail here is rarer than a Vault Break Grail (see the PRD's probability
  // tables) and the PRD explicitly calls for "a premium final reveal position."
  reveal: {
    stack: 1.1, hold: 0.7, rise: 0.9, separate: 1.75, settle: 0.85,
    notice: 2.7, approach: 1.9, reveal: 1.7, present: 2.3,
  },
  haptics: { tickCount: 18, giveAt: 0.06, completeAt: 0.97 },
  // Cooler/dimmer hemi + a warm platinum-white key (vs. Vault Break's warm champagne) and a
  // bronze rim in place of Vault Break's violet — the "jewel box" reads as onyx-and-metal, not
  // as a darker version of the same violet room.
  lighting: { key: 0xfff6e6, rim: 0xc9a24a, hemiSky: 0x141210, hemiGround: 0x030302, spot: 0xffe9b0 },
};

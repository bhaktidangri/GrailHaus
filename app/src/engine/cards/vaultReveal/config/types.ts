// Ported from card-pack-reveal-prototype/src/vault/config/types.ts — Tier 2 "Vault Break".
// Kept as its own type module rather than folding into ../../reveal/config/types.ts: a
// CategoryPersonality (Tier 1) is a palette/copy/timing swap over one shared tear-only engine,
// but Vault Break adds a second engine stage the Tier 1 shape has no room for — a staged card
// reveal (stack -> hold -> rise -> separate -> settle -> notice -> approach -> reveal -> present
// -> ready) with its own per-card spring targets, a metallic inner liner, and post-reveal card
// inspection (tap/drag/pinch/flip).
//
// One deliberate change from the prototype: `VaultBreakPersonality` no longer carries `deck`.
// The prototype's own deck was six hardcoded fictional cards (fake names, fake ownership
// history, fake price history) for a standalone demo with no real pull to show — real or empty,
// a deck is passed into buildVaultPackObject as its own argument now, not baked into the
// personality. In the app's current integration it's always empty: the staged card-fan reveal
// this type shape exists for moved out of the 3D scene entirely (see VaultTearStage.tsx's
// header for why) in favor of a flat-2D screen reusing CardFlowEngine's own per-card views.

export interface VaultSize {
  width: number;
  height: number;
  thickness: number;
}

export interface VaultPalette {
  violet: string;
  plum: string;
  ink: string;
  champagne: string;
  champagneHi: string;
  champagneMid: string;
  champagneDark: string;
  graphite: string;
  ivory: string;
}

export interface VaultCopy {
  kicker: string;
  title: string;
  titleEmphasis: string;
  meta: string[];
  hintDrag: string;
  hintInspect: string;
}

export interface VaultMaterial {
  roughness: number;
  metalness: number;
  /** width, in UV fraction, of the peel front's stretch/pucker zone */
  peel: number;
}

export interface VaultTear {
  /** fraction of travel the foil visibly stretches before the tear starts */
  stretch: number;
  /** fraction of remaining reach that counts as "committed to tearing" */
  releaseFrac: number;
  springK: number;
  damping: number;
  /** multiplier on the idle/drag crimp-glint opacity, 0..~1 */
  glint: number;
}

export interface VaultLiner {
  enabled: boolean;
  metalness: number;
  roughness: number;
}

export interface VaultFan {
  stepX: number;
  angle: number;
  arcDrop: number;
  liftY: number;
  heroZ: number;
  heroScale: number;
  grailZ: number;
}

/** Duration, in seconds, of each stage of the reveal sequence. */
export interface VaultRevealTiming {
  stack: number;
  hold: number;
  rise: number;
  separate: number;
  settle: number;
  notice: number;
  approach: number;
  reveal: number;
  present: number;
}

export type CardRarity = "CORE" | "PRIME" | "GRAIL";

export interface VaultCardData {
  name: string;
  rarity: CardRarity;
  /** The real, admin-configurable rarity tier name (e.g. from `rarityTiers`) — drawn on the
   * card's ribbon instead of the hardcoded CORE/PRIME/GRAIL label so a renamed tier shows its
   * real name. `rarity` above still drives styling (glow/metalness) by ordinal bucket. */
  rarityLabel: string;
  edition: string;
  finish: string;
  value: string;
  delta: number;
  tint: string;
  glowRGB: string;
  seed: number;
  serial: string;
  held: string;
  spark: number[];
}

export interface HapticTrackConfig {
  tickCount: number;
  giveAt: number;
  completeAt: number;
}

export interface VaultBreakPersonality {
  id: "vault-break";
  size: VaultSize;
  seamFrac: number;
  flapFrac: number;
  palette: VaultPalette;
  copy: VaultCopy;
  material: VaultMaterial;
  tear: VaultTear;
  liner: VaultLiner;
  fan: VaultFan;
  reveal: VaultRevealTiming;
  haptics: HapticTrackConfig;
  riseY: number;
}

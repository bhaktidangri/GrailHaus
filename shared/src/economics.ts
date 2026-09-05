import type { PackSku } from "./types.js";

/**
 * Approximates a pack's expected payout using each rarity tier's configured
 * value-range midpoint as a stand-in for "average catalog value" — cheap to
 * compute (no item catalog join needed) and good enough to drive a live
 * admin indicator. The real audit should use actual per-item averages.
 */
export function computeExpectedValueCents(pack: PackSku): number {
  const midpointByTier = new Map(
    pack.rarityTiers.map((tier) => [tier.level, (tier.valueMinCents + tier.valueMaxCents) / 2])
  );

  let evCents = 0;
  for (const slot of pack.slotProbabilities) {
    for (const [levelKey, percent] of Object.entries(slot.probabilities)) {
      const level = Number(levelKey) as 1 | 2 | 3;
      const midpoint = midpointByTier.get(level) ?? 0;
      evCents += (percent / 100) * midpoint;
    }
  }
  return Math.round(evCents);
}

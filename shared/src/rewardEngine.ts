import type { PackItem, PackSku, PressureRule, PressureState, RarityTierLevel } from "./types.js";

const TIER_LEVELS: RarityTierLevel[] = [1, 2, 3];

function rollTier(probabilities: Record<RarityTierLevel, number>): RarityTierLevel {
  const total = TIER_LEVELS.reduce((sum, level) => sum + (probabilities[level] ?? 0), 0);
  let roll = Math.random() * total;
  for (const level of TIER_LEVELS) {
    roll -= probabilities[level] ?? 0;
    if (roll <= 0) return level;
  }
  return TIER_LEVELS[TIER_LEVELS.length - 1];
}

function applyBonus(
  probabilities: Record<RarityTierLevel, number>,
  targetTier: RarityTierLevel,
  bonusPoints: number
): Record<RarityTierLevel, number> {
  const next = { ...probabilities };
  const available = TIER_LEVELS.filter((l) => l !== targetTier && next[l] > 0);
  const takeableTotal = available.reduce((sum, l) => sum + next[l], 0);
  const actualBonus = Math.min(bonusPoints, takeableTotal);
  if (actualBonus <= 0) return next;
  for (const level of available) {
    next[level] -= actualBonus * (next[level] / takeableTotal);
  }
  next[targetTier] += actualBonus;
  return next;
}

/** Rolls a tier guaranteed to be >= minTier, weighting by the eligible tiers' relative base probabilities. */
function rollAtLeast(
  probabilities: Record<RarityTierLevel, number>,
  minTier: RarityTierLevel
): RarityTierLevel {
  const eligible = TIER_LEVELS.filter((l) => l >= minTier);
  const weights = Object.fromEntries(eligible.map((l) => [l, probabilities[l] ?? 0])) as Record<
    RarityTierLevel,
    number
  >;
  const total = eligible.reduce((sum, l) => sum + weights[l], 0);
  if (total <= 0) return minTier;
  return rollTier(weights);
}

function pickPressureRule(rules: PressureRule[]): RarityTierLevel {
  return rules[0]?.qualifyingMinTier ?? 3;
}

/**
 * Pulls one pack's worth of results. Pure and framework-agnostic — the same
 * function backs both the mobile preview pull and (once it exists) the real
 * server-side /purchase endpoint, so behavior can never drift between them.
 *
 * Interpretive calls made where the product spec was ambiguous (documented
 * here, not silently guessed): pressure thresholds are non-cumulative — the
 * highest threshold met wins, not a sum of every threshold crossed; a
 * `bonus_percent` rule only ever pulls percentage points from tiers below
 * its target (never from a tier already used to satisfy a stricter
 * guarantee); the streak resets only on a pull at/above the pack's
 * qualifying tier, tracked per this one pack SKU — never globally across a
 * user's account or shared across price tiers, which is what would reopen
 * the cross-tier "farm cheap packs, cash in on an expensive one" exploit
 * documented in the loophole audit.
 */
export function pullPack(
  pack: PackSku,
  pressureState: PressureState
): { tierLevels: RarityTierLevel[]; nextPressureState: PressureState } {
  const qualifyingTier = pickPressureRule(pack.pressureRules);
  let consecutive = pressureState.consecutiveWithoutQualifying;
  const tierLevels: RarityTierLevel[] = [];

  const orderedSlots = [...pack.slotProbabilities].sort((a, b) => a.slotPosition - b.slotPosition);

  for (const slot of orderedSlots) {
    const isFinalSlot = slot.slotPosition === pack.itemCount;
    let probabilities = { ...slot.probabilities };

    // Non-cumulative: for each target tier, only the highest met threshold's bonus applies —
    // "+3 at 5, +6 at 8" is a ladder, not +9 stacked at step 8.
    const strongestBonusByTarget = new Map<RarityTierLevel, PressureRule>();
    for (const rule of pack.pressureRules) {
      if (rule.effectType !== "bonus_percent") continue;
      if (consecutive < rule.stepsWithoutQualifying) continue;
      if ((probabilities[rule.targetTierLevel] ?? 0) <= 0) continue;
      const current = strongestBonusByTarget.get(rule.targetTierLevel);
      if (!current || rule.stepsWithoutQualifying > current.stepsWithoutQualifying) {
        strongestBonusByTarget.set(rule.targetTierLevel, rule);
      }
    }
    for (const rule of strongestBonusByTarget.values()) {
      probabilities = applyBonus(probabilities, rule.targetTierLevel, rule.effectValue ?? 0);
    }

    let forcedMinTier: RarityTierLevel | null = null;
    for (const rule of pack.pressureRules) {
      if (rule.effectType !== "guarantee_min_tier") continue;
      if (rule.appliesToFinalSlotOnly && !isFinalSlot) continue;
      if (consecutive < rule.stepsWithoutQualifying) continue;
      if (!forcedMinTier || rule.targetTierLevel > forcedMinTier) forcedMinTier = rule.targetTierLevel;
    }

    const tier = forcedMinTier ? rollAtLeast(probabilities, forcedMinTier) : rollTier(probabilities);
    tierLevels.push(tier);
    consecutive = tier >= qualifyingTier ? 0 : consecutive + 1;
  }

  return {
    tierLevels,
    nextPressureState: { packId: pack.id, consecutiveWithoutQualifying: consecutive },
  };
}

/** Turns rolled tier levels into actual catalog items, one random pick per tier from that pack's pool. */
export function resolveItems(pack: PackSku, tierLevels: RarityTierLevel[]): PackItem[] {
  return tierLevels.map((level) => {
    const pool = pack.itemsByTier[level] ?? [];
    if (pool.length === 0) {
      throw new Error(`No catalog items for ${pack.name} at tier ${level}`);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  });
}

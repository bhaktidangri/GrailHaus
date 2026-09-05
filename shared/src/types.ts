export type Category = "cards" | "watches";

/** Always integer cents. Never a float. */
export type MoneyCents = number;

export interface Profile {
  id: string;
  displayName: string | null;
  balanceCents: MoneyCents;
  createdAt: string;
}

/**
 * Rarity is an ordinal level, not a fixed name — the display name, color,
 * and value range are admin-configurable data per category (Cards:
 * Core/Prime/Grail; Watches: Heritage/Icon/Apex), not a hardcoded enum.
 */
export type RarityTierLevel = 1 | 2 | 3;

export interface RarityTier {
  level: RarityTierLevel;
  name: string;
  colorHex: string;
  valueMinCents: MoneyCents;
  valueMaxCents: MoneyCents;
}

export interface PackItem {
  id: string;
  name: string;
  rarityTierLevel: RarityTierLevel;
  textureUrl: string | null;
  baseValueCents: MoneyCents;
}

/** One pack slot's base probability distribution across tier levels — percentage points, sums to 100. */
export interface SlotProbability {
  slotPosition: number;
  probabilities: Record<RarityTierLevel, number>;
}

/**
 * A "pity"/protection rule. `qualifyingMinTier` defines what resets the streak
 * (a pull at or above this tier resets the counter to 0); `stepsWithoutQualifying`
 * is the threshold that triggers the effect. `bonus_percent` adds `effectValue`
 * percentage points to `targetTierLevel` on every slot where that tier already
 * has non-zero base probability; `guarantee_min_tier` forces the result to be at
 * least `targetTierLevel`. `appliesToFinalSlotOnly` scopes a guarantee to just the
 * pack's last slot (how the spec's "next eligible final pull" guarantees read).
 */
export interface PressureRule {
  qualifyingMinTier: RarityTierLevel;
  stepsWithoutQualifying: number;
  effectType: "bonus_percent" | "guarantee_min_tier";
  targetTierLevel: RarityTierLevel;
  effectValue: number | null;
  appliesToFinalSlotOnly: boolean;
}

export interface PackSku {
  id: string;
  category: Category;
  tier: string;
  name: string;
  priceCents: MoneyCents;
  itemCount: number;
  slotProbabilities: SlotProbability[];
  pressureRules: PressureRule[];
  rarityTiers: RarityTier[];
  itemsByTier: Record<RarityTierLevel, PackItem[]>;
}

/** An item as it comes out of a rip — same shape as PackItem, kept distinct so the reveal engine's
 * input type can evolve independently of the catalog type once real pulls exist server-side. */
export type PulledItem = PackItem;

/** Per-user, per-pack pity counter — deliberately scoped to one SKU, never global across a user's
 * account or shared across tiers. See rewardEngine.ts for why. */
export interface PressureState {
  packId: string;
  consecutiveWithoutQualifying: number;
}

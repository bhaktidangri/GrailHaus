export type Category = "cards" | "watches";

/** Always integer cents. Never a float. */
export type MoneyCents = number;

export interface Profile {
  id: string;
  displayName: string | null;
  /** The public @handle ("Collector ID"). Null until claimed — every account gets one via
   * /username right after its first sign-in, and it's permanent once set. */
  username: string | null;
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

/**
 * The full catalog record for one item — everything imported from the Pokémon/watch
 * spreadsheets, not just the minimal fields `PackItem` carries for the reveal engine. Card and
 * watch fields are both optional on every item since a given row only ever fills in one set
 * (its `category` says which); nothing here is admin-configurable the way rarity tiers or
 * probabilities are — it's catalog data, fixed at import time.
 */
export interface ItemDetail extends PackItem {
  category: Category;
  collection: string | null;
  tagline: string | null;
  traits: string | null;
  pokemonName: string | null;
  cardTitle: string | null;
  pokemonType: string | null;
  generation: string | null;
  pokedexNumber: string | null;
  watchName: string | null;
  modelName: string | null;
  brand: string | null;
  style: string | null;
  caseMaterial: string | null;
  dialColor: string | null;
  movement: string | null;
  caseSize: string | null;
  /** Bounded simulated price drift (PRD §28) — computed live on every read, not stored;
   * ticks every 30 seconds and never leaves [minValueCents, maxValueCents]. See
   * economics.ts's computePriceDrift for how. */
  currentValueCents: MoneyCents;
  minValueCents: MoneyCents;
  maxValueCents: MoneyCents;
}

/** One row in a user's portfolio — an owned item plus when and from which purchase/pack it
 * was acquired. */
export interface OwnedItem {
  ownedItemId: string;
  item: ItemDetail;
  packId: string;
  purchaseId: string | null;
  acquiredAt: string;
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
  /** Null = evergreen (always available, restocks over time — see `maxStock`). Non-null = a
   * timed drop (PRD §19-20): not purchasable before this instant, finite, never restocks. */
  goesLiveAt: string | null;
  /** Optional hard cutoff for a drop; evergreen packs never set this. */
  endsAt: string | null;
  /** Null = unlimited (not used today — every pack is either evergreen-with-restock or a
   * non-restocking drop, both finite); otherwise how many are left right now. */
  stockRemaining: number | null;
  /** The ceiling evergreen stock restocks up to, or a drop's one-time starting inventory. */
  maxStock: number | null;
}

/** An item as it comes out of a rip — same shape as PackItem, kept distinct so the reveal engine's
 * input type can evolve independently of the catalog type once real pulls exist server-side. */
export type PulledItem = PackItem;

/** One pulled item as `/purchase` actually returns it — full catalog detail plus the specific
 * `owned_items` row id that purchase created for it, so a post-reveal screen (Cards' Pack
 * Summary, Watches' post-reveal fork) can act on *that exact copy* — view it, sell it — without
 * a separate portfolio lookup. */
export interface PulledOwnedItem extends ItemDetail {
  ownedItemId: string;
}

/** Per-user, per-pack pity counter — deliberately scoped to one SKU, never global across a user's
 * account or shared across tiers. See rewardEngine.ts for why. */
export interface PressureState {
  packId: string;
  consecutiveWithoutQualifying: number;
}

/** How many copies of each catalog item (by PackItem.id) a user already owns going into a
 * pull — the input to the reward engine's ownership-weighted selection. Not persisted here;
 * this is just the shape the caller passes in after reading `owned_items`. */
export type OwnershipCounts = Record<string, number>;

export type ListingStatus = "active" | "sold" | "delisted";

/** A public-facing identity — never the raw internal profile id (which is also the Supabase
 * auth user id), only the opaque public_id + optional Collector ID, same externalization
 * `/me` already uses for `Profile.id`. */
export interface ListingParty {
  id: string;
  username: string | null;
}

/**
 * Fixed-price peer-to-peer listing (PRD §30-32). One `ownedItemId` can have at most one
 * `active` listing at a time — enforced by a DB constraint, not application logic. `feePercent`
 * /`feeCents`/`sellerProceedsCents` are the *actual* recorded split once `status` is `sold`
 * (computed once, atomically, at sale time, and never recalculated after); for a still-`active`
 * listing they're a live preview computed from the current admin-configured rate, which can
 * still change before a sale actually happens.
 */
/** One row in the "Recently Revealed" feed — a real pack pull (not a marketplace transfer),
 * newest first. `username` is null for the rare account that hasn't claimed a Collector ID yet
 * (shouldn't normally happen post-onboarding, but the feed degrades gracefully either way). */
export interface RecentPull {
  ownedItemId: string;
  item: ItemDetail;
  username: string | null;
  acquiredAt: string;
}

export interface Listing {
  id: string;
  ownedItemId: string;
  item: ItemDetail;
  seller: ListingParty;
  buyer: ListingParty | null;
  priceCents: MoneyCents;
  status: ListingStatus;
  feePercent: number | null;
  feeCents: MoneyCents | null;
  sellerProceedsCents: MoneyCents | null;
  createdAt: string;
  resolvedAt: string | null;
}

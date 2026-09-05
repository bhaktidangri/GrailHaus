import { pool } from "../../db/pool.js";
import type { ItemRow, PackRow, PressureRuleRow, RarityTierRow, SlotProbabilityRow } from "./packs.types.js";

export async function findPacks(category?: string): Promise<PackRow[]> {
  if (category) {
    const { rows } = await pool.query<PackRow>(
      "select id, category, tier, name, price_cents, item_count from public.packs where category = $1 order by price_cents asc",
      [category]
    );
    return rows;
  }
  const { rows } = await pool.query<PackRow>(
    "select id, category, tier, name, price_cents, item_count from public.packs order by category, price_cents asc"
  );
  return rows;
}

export async function findItemsForPacks(packIds: string[]): Promise<ItemRow[]> {
  if (packIds.length === 0) return [];
  const { rows } = await pool.query<ItemRow>(
    "select id, pack_id, name, rarity_tier_level, texture_url, base_value_cents from public.items where pack_id = any($1)",
    [packIds]
  );
  return rows;
}

export async function findSlotProbabilitiesForPacks(packIds: string[]): Promise<SlotProbabilityRow[]> {
  if (packIds.length === 0) return [];
  const { rows } = await pool.query<SlotProbabilityRow>(
    "select pack_id, slot_position, rarity_tier_level, probability_percent from public.slot_probabilities where pack_id = any($1)",
    [packIds]
  );
  return rows;
}

export async function findPressureRulesForPacks(packIds: string[]): Promise<PressureRuleRow[]> {
  if (packIds.length === 0) return [];
  const { rows } = await pool.query<PressureRuleRow>(
    `select pack_id, qualifying_min_tier, steps_without_qualifying, effect_type, target_tier_level, effect_value, applies_to_final_slot_only
     from public.pressure_rules where pack_id = any($1)`,
    [packIds]
  );
  return rows;
}

export async function findRarityTiers(category?: string): Promise<RarityTierRow[]> {
  if (category) {
    const { rows } = await pool.query<RarityTierRow>(
      "select category, tier_level, name, color_hex, value_min_cents, value_max_cents from public.rarity_tiers where category = $1 order by tier_level",
      [category]
    );
    return rows;
  }
  const { rows } = await pool.query<RarityTierRow>(
    "select category, tier_level, name, color_hex, value_min_cents, value_max_cents from public.rarity_tiers order by category, tier_level"
  );
  return rows;
}

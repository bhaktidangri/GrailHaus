import type { Category, PackItem, PackSku, PressureRule, RarityTier, RarityTierLevel, SlotProbability } from "@grailhaus/shared";
import {
  findItemsForPacks,
  findPacks,
  findPressureRulesForPacks,
  findRarityTiers,
  findSlotProbabilitiesForPacks,
} from "./packs.repository.js";

export async function listPacks(category?: Category): Promise<PackSku[]> {
  const [packRows, rarityTierRows] = await Promise.all([findPacks(category), findRarityTiers(category)]);
  const packIds = packRows.map((p) => p.id);

  const [itemRows, slotRows, pressureRows] = await Promise.all([
    findItemsForPacks(packIds),
    findSlotProbabilitiesForPacks(packIds),
    findPressureRulesForPacks(packIds),
  ]);

  const rarityTiersByCategory = new Map<string, RarityTier[]>();
  for (const row of rarityTierRows) {
    const list = rarityTiersByCategory.get(row.category) ?? [];
    list.push({
      level: row.tier_level as RarityTierLevel,
      name: row.name,
      colorHex: row.color_hex,
      valueMinCents: Number(row.value_min_cents),
      valueMaxCents: Number(row.value_max_cents),
    });
    rarityTiersByCategory.set(row.category, list);
  }

  return packRows.map((pack) => {
    const itemsByTier: Record<RarityTierLevel, PackItem[]> = { 1: [], 2: [], 3: [] };
    for (const item of itemRows) {
      if (item.pack_id !== pack.id) continue;
      itemsByTier[item.rarity_tier_level as RarityTierLevel].push({
        id: item.id,
        name: item.name,
        rarityTierLevel: item.rarity_tier_level as RarityTierLevel,
        textureUrl: item.texture_url,
        baseValueCents: Number(item.base_value_cents),
      });
    }

    const slotsByPosition = new Map<number, SlotProbability>();
    for (const row of slotRows) {
      if (row.pack_id !== pack.id) continue;
      const slot = slotsByPosition.get(row.slot_position) ?? {
        slotPosition: row.slot_position,
        probabilities: { 1: 0, 2: 0, 3: 0 },
      };
      slot.probabilities[row.rarity_tier_level as RarityTierLevel] = Number(row.probability_percent);
      slotsByPosition.set(row.slot_position, slot);
    }

    const pressureRules: PressureRule[] = pressureRows
      .filter((r) => r.pack_id === pack.id)
      .map((r) => ({
        qualifyingMinTier: r.qualifying_min_tier as RarityTierLevel,
        stepsWithoutQualifying: r.steps_without_qualifying,
        effectType: r.effect_type,
        targetTierLevel: r.target_tier_level as RarityTierLevel,
        effectValue: r.effect_value,
        appliesToFinalSlotOnly: r.applies_to_final_slot_only,
      }));

    return {
      id: pack.id,
      category: pack.category as Category,
      tier: pack.tier,
      name: pack.name,
      priceCents: Number(pack.price_cents),
      itemCount: pack.item_count,
      slotProbabilities: [...slotsByPosition.values()].sort((a, b) => a.slotPosition - b.slotPosition),
      pressureRules,
      rarityTiers: rarityTiersByCategory.get(pack.category) ?? [],
      itemsByTier,
    };
  });
}

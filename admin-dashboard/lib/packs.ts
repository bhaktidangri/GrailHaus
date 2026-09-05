import { pool } from "./db";
import { computeRealEvForAllPacks } from "./ev";
import type { Category, PackSku, RarityTierLevel } from "@grailhaus/shared";

export interface PackWithEv extends PackSku {
  evCents: number;
}

export async function listPacksWithEv(): Promise<PackWithEv[]> {
  const [packsRes, rarityRes, slotRes, evByPack] = await Promise.all([
    pool.query<{
      id: string;
      category: string;
      tier: string;
      name: string;
      price_cents: string;
      item_count: number;
    }>("select id, category, tier, name, price_cents, item_count from public.packs order by category, price_cents"),
    pool.query<{
      category: string;
      tier_level: number;
      name: string;
      color_hex: string;
      value_min_cents: string;
      value_max_cents: string;
    }>(
      "select category, tier_level, name, color_hex, value_min_cents, value_max_cents from public.rarity_tiers order by category, tier_level"
    ),
    pool.query<{ pack_id: string; slot_position: number; rarity_tier_level: number; probability_percent: string }>(
      "select pack_id, slot_position, rarity_tier_level, probability_percent from public.slot_probabilities"
    ),
    computeRealEvForAllPacks(),
  ]);

  const rarityByCategory = new Map<string, PackSku["rarityTiers"]>();
  for (const row of rarityRes.rows) {
    const list = rarityByCategory.get(row.category) ?? [];
    list.push({
      level: row.tier_level as RarityTierLevel,
      name: row.name,
      colorHex: row.color_hex,
      valueMinCents: Number(row.value_min_cents),
      valueMaxCents: Number(row.value_max_cents),
    });
    rarityByCategory.set(row.category, list);
  }

  return packsRes.rows.map((pack) => {
    const slotsByPosition = new Map<number, PackSku["slotProbabilities"][number]>();
    for (const row of slotRes.rows) {
      if (row.pack_id !== pack.id) continue;
      const slot = slotsByPosition.get(row.slot_position) ?? {
        slotPosition: row.slot_position,
        probabilities: { 1: 0, 2: 0, 3: 0 },
      };
      slot.probabilities[row.rarity_tier_level as RarityTierLevel] = Number(row.probability_percent);
      slotsByPosition.set(row.slot_position, slot);
    }

    const packSku: PackSku = {
      id: pack.id,
      category: pack.category as Category,
      tier: pack.tier,
      name: pack.name,
      priceCents: Number(pack.price_cents),
      itemCount: pack.item_count,
      slotProbabilities: [...slotsByPosition.values()].sort((a, b) => a.slotPosition - b.slotPosition),
      pressureRules: [],
      rarityTiers: rarityByCategory.get(pack.category) ?? [],
      itemsByTier: { 1: [], 2: [], 3: [] },
    };

    return { ...packSku, evCents: evByPack.get(pack.id) ?? 0 };
  });
}

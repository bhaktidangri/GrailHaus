import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category, RarityTier, RarityTierLevel } from "@grailhaus/shared";
import { packsService } from "../services/packsService";

/**
 * Every `PackSku` in a category carries the identical, admin-configured `rarityTiers` array
 * (see server's packs.service.ts — it's read fresh from the `rarity_tiers` table onto every
 * pack row for that category, not per-SKU data). This reads it off the same `["packs",
 * category]` query every other catalog screen already shares, rather than each Discover screen
 * hardcoding its own "Core"/"Prime"/"Grail" name map — those names (and colors) are editable
 * from the admin dashboard's Rarity Tiers page and must never go stale here.
 */
export function useRarityTiers(category: Category): Partial<Record<RarityTierLevel, RarityTier>> {
  const query = useQuery({ queryKey: ["packs", category], queryFn: () => packsService.list(category) });

  return useMemo(() => {
    const tiers = query.data?.[0]?.rarityTiers ?? [];
    const byLevel: Partial<Record<RarityTierLevel, RarityTier>> = {};
    for (const tier of tiers) byLevel[tier.level] = tier;
    return byLevel;
  }, [query.data]);
}

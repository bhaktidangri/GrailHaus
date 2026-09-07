import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@grailhaus/shared";
import { packsService } from "../services/packsService";
import { useDropsViewModel } from "./useDropsViewModel";

export interface CategorySummary {
  tierCount: number;
  fromPriceCents: number | null;
}

/**
 * Home's door cards need a tier count + starting price per category, which
 * is just the evergreen slice of the same catalog Shelf/World already reads
 * (see useShelfViewModel) — no separate endpoint. Shares its `["packs",
 * "all"]` query with useDropsViewModel's identical call; react-query
 * dedupes by key, so this doesn't cost a second network request.
 */
export function useHomeViewModel() {
  const packsQuery = useQuery({
    queryKey: ["packs", "all"],
    queryFn: () => packsService.list(),
  });
  const { drops, isLoading: dropsLoading } = useDropsViewModel();

  const evergreenByCategory = useMemo<Record<Category, CategorySummary>>(() => {
    const evergreen = (packsQuery.data ?? []).filter((p) => p.goesLiveAt == null);
    const summarize = (category: Category): CategorySummary => {
      const packs = evergreen.filter((p) => p.category === category);
      const prices = packs.map((p) => p.priceCents);
      return { tierCount: packs.length, fromPriceCents: prices.length ? Math.min(...prices) : null };
    };
    return { cards: summarize("cards"), watches: summarize("watches") };
  }, [packsQuery.data]);

  const featuredDrop = useMemo(() => drops.find((d) => d.phase === "live") ?? null, [drops]);
  const upcomingDrops = useMemo(() => drops.filter((d) => d.phase === "soon"), [drops]);

  return {
    evergreenByCategory,
    featuredDrop,
    upcomingDrops,
    isLoading: packsQuery.isLoading || dropsLoading,
  };
}

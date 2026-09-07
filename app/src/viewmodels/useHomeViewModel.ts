import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category, Listing } from "@grailhaus/shared";
import { packsService } from "../services/packsService";
import { marketplaceService } from "../services/marketplaceService";
import { useDropsViewModel } from "./useDropsViewModel";
import { useCollectionViewModel } from "./useCollectionViewModel";

export interface CategorySummary {
  tierCount: number;
  fromPriceCents: number | null;
}

export interface CollectionProgressSummary {
  /** False until this account is signed in *and* actually owns something — there's no
   * real number to show before that, so the screen falls back to its own placeholder. */
  hasData: boolean;
  totalValueCents: number;
  cardsSharePercent: number;
  watchesSharePercent: number;
}

const MARKETPLACE_HIGHLIGHTS_LIMIT = 3;

/**
 * Home's door cards need a tier count + starting price per category, which
 * is just the evergreen slice of the same catalog Shelf/World already reads
 * (see useShelfViewModel) — no separate endpoint. Shares its `["packs",
 * "all"]` query with useDropsViewModel's identical call; react-query
 * dedupes by key, so this doesn't cost a second network request.
 *
 * Collection Progress and Marketplace Highlights are real as far as the API goes today —
 * `/me/portfolio` and `/listings` back them — but each still has fields the mockup wants that
 * no endpoint provides yet (day-over-day portfolio delta, per-set completion counts, comp-price
 * deltas, offer counts). See HomeScreen.tsx's own top comment for the itemized list; this
 * viewmodel only ever returns real numbers, never invents the missing ones.
 */
export function useHomeViewModel() {
  const packsQuery = useQuery({
    queryKey: ["packs", "all"],
    queryFn: () => packsService.list(),
  });
  const { drops, isLoading: dropsLoading } = useDropsViewModel();
  const collection = useCollectionViewModel();
  const listingsQuery = useQuery({ queryKey: ["listings", "all"], queryFn: () => marketplaceService.browse() });

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

  const collectionProgress = useMemo<CollectionProgressSummary>(
    () => ({
      hasData: collection.isSignedIn && collection.owned.length > 0,
      totalValueCents: collection.totalValueCents,
      cardsSharePercent: collection.cardsSharePercent,
      watchesSharePercent: collection.watchesSharePercent,
    }),
    [collection.isSignedIn, collection.owned.length, collection.totalValueCents, collection.cardsSharePercent, collection.watchesSharePercent]
  );

  const recentListings = useMemo<Listing[]>(
    () =>
      [...(listingsQuery.data ?? [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MARKETPLACE_HIGHLIGHTS_LIMIT),
    [listingsQuery.data]
  );

  return {
    evergreenByCategory,
    featuredDrop,
    upcomingDrops,
    collectionProgress,
    recentListings,
    isLoading: packsQuery.isLoading || dropsLoading,
  };
}

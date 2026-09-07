import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { Category, ItemDetail } from "@grailhaus/shared";
import { packsService } from "../services/packsService";
import { itemsService } from "../services/itemsService";
import { marketplaceService } from "../services/marketplaceService";
import { portfolioService } from "../services/portfolioService";

export interface DiscoverItem {
  detail: ItemDetail;
  packId: string;
  packName: string;
  packPriceCents: number;
  ownedCount: number;
  listedCount: number;
  lowestListingCents: number | null;
}

export interface DiscoverGroup {
  key: string;
  label: string;
  subtitle: string;
  versions: DiscoverItem[];
  minValueCents: number;
  maxValueCents: number;
  ownedTotal: number;
}

/**
 * Discover's whole premise — "Pikachu is not one object, it's nine printings" — needs the full
 * catalog roster grouped by real Pokémon/brand identity, which no single endpoint returns.
 * Built entirely from three endpoints that do exist: `/packs` (the roster + which pack/price
 * can drop each item), `/items/:id` (full detail incl. live drift value, fetched per item —
 * the catalog is ~30-50 items/category per the PRD, so this is a bounded fan-out, not an
 * unbounded one), `/listings` and `/me/portfolio` (ownership + market availability). Nothing
 * here is simulated data standing in for a search index that doesn't exist.
 */
export function useDiscoverViewModel(category: Category) {
  const packsQuery = useQuery({ queryKey: ["packs", category], queryFn: () => packsService.list(category) });
  const listingsQuery = useQuery({ queryKey: ["listings", category], queryFn: () => marketplaceService.browse(category) });
  const portfolioQuery = useQuery({ queryKey: ["portfolio", "me"], queryFn: portfolioService.list });

  const roster = useMemo(() => {
    const packs = packsQuery.data ?? [];
    const out: { itemId: string; packId: string; packName: string; packPriceCents: number }[] = [];
    for (const pack of packs) {
      for (const items of Object.values(pack.itemsByTier)) {
        for (const item of items) {
          out.push({ itemId: item.id, packId: pack.id, packName: pack.name, packPriceCents: pack.priceCents });
        }
      }
    }
    return out;
  }, [packsQuery.data]);

  const detailQueries = useQueries({
    queries: roster.map((r) => ({
      queryKey: ["items", r.itemId],
      queryFn: () => itemsService.get(r.itemId),
      staleTime: 60_000,
    })),
  });

  const isLoading = packsQuery.isLoading || listingsQuery.isLoading || portfolioQuery.isLoading || detailQueries.some((q) => q.isLoading);

  const items = useMemo<DiscoverItem[]>(() => {
    const listings = listingsQuery.data ?? [];
    const owned = portfolioQuery.data ?? [];

    const listedByItem = new Map<string, { count: number; lowestCents: number }>();
    for (const l of listings) {
      const entry = listedByItem.get(l.item.id);
      if (!entry) listedByItem.set(l.item.id, { count: 1, lowestCents: l.priceCents });
      else {
        entry.count += 1;
        entry.lowestCents = Math.min(entry.lowestCents, l.priceCents);
      }
    }
    const ownedByItem = new Map<string, number>();
    for (const o of owned) {
      ownedByItem.set(o.item.id, (ownedByItem.get(o.item.id) ?? 0) + 1);
    }

    const out: DiscoverItem[] = [];
    roster.forEach((r, i) => {
      const detail = detailQueries[i]?.data;
      if (!detail) return;
      const listed = listedByItem.get(r.itemId);
      out.push({
        detail,
        packId: r.packId,
        packName: r.packName,
        packPriceCents: r.packPriceCents,
        ownedCount: ownedByItem.get(r.itemId) ?? 0,
        listedCount: listed?.count ?? 0,
        lowestListingCents: listed?.lowestCents ?? null,
      });
    });
    return out;
  }, [roster, detailQueries, listingsQuery.data, portfolioQuery.data]);

  // Cards group by the Pokémon they depict — "Pikachu" is nine printings, not one card.
  // Watches group by brand — nobody types a reference number, they think "Rolex" first.
  const groups = useMemo<DiscoverGroup[]>(() => {
    const keyOf = (d: ItemDetail) => (category === "cards" ? d.pokemonName ?? d.name : d.brand ?? "Independent");
    const subtitleOf = (versions: DiscoverItem[]) => {
      const first = versions[0].detail;
      return category === "cards" ? first.pokemonType ?? "" : `${versions.length} model${versions.length === 1 ? "" : "s"}`;
    };

    const map = new Map<string, DiscoverItem[]>();
    for (const item of items) {
      const key = keyOf(item.detail);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    return [...map.entries()]
      .map(([key, versions]) => {
        const sorted = [...versions].sort((a, b) => a.detail.rarityTierLevel - b.detail.rarityTierLevel);
        return {
          key,
          label: key,
          subtitle: subtitleOf(sorted),
          versions: sorted,
          minValueCents: Math.min(...sorted.map((v) => v.detail.currentValueCents)),
          maxValueCents: Math.max(...sorted.map((v) => v.detail.currentValueCents)),
          ownedTotal: sorted.reduce((sum, v) => sum + v.ownedCount, 0),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items, category]);

  return {
    isLoading,
    error: packsQuery.error ? (packsQuery.error as Error).message : null,
    items,
    groups,
    listedNowCount: (listingsQuery.data ?? []).length,
    setOrBrandCount: new Set(items.map((i) => (category === "cards" ? i.detail.collection : i.detail.brand))).size,
  };
}

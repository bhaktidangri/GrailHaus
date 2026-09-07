import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OwnedItem } from "@grailhaus/shared";
import { portfolioService } from "../services/portfolioService";
import { useAuthStore } from "../state/authStore";

export interface CollectionGroup {
  key: string;
  label: string;
  items: OwnedItem[];
  valueCents: number;
}

/**
 * ViewModel for the Portfolio hub and both category worlds (Binder / Vault).
 * `/me/portfolio` is the only server truth here — grouping and totals are all
 * derived client-side from it, nothing here is invented data.
 */
export function useCollectionViewModel() {
  const isSignedIn = useAuthStore((s) => s.token != null);
  // `/me/portfolio` requires an app session — matches useSessionViewModel's gating on
  // `/me`, otherwise every signed-out mount fires a guaranteed 401.
  const query = useQuery({
    queryKey: ["portfolio", "me"],
    queryFn: portfolioService.list,
    enabled: isSignedIn,
  });

  const owned = query.data ?? [];

  const cards = useMemo(() => owned.filter((o) => o.item.category === "cards"), [owned]);
  const watches = useMemo(() => owned.filter((o) => o.item.category === "watches"), [owned]);

  const totalValueCents = useMemo(() => owned.reduce((sum, o) => sum + o.item.currentValueCents, 0), [owned]);
  const cardsValueCents = useMemo(() => cards.reduce((sum, o) => sum + o.item.currentValueCents, 0), [cards]);
  const watchesValueCents = useMemo(() => watches.reduce((sum, o) => sum + o.item.currentValueCents, 0), [watches]);

  // Real groupings only — `collection`/`brand` come straight off the catalog row, never guessed.
  const collections = useMemo(() => groupBy(cards, (o) => o.item.collection ?? "Uncategorized"), [cards]);
  const brands = useMemo(() => groupBy(watches, (o) => o.item.brand ?? "Independent"), [watches]);

  return {
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    owned,
    cards,
    watches,
    totalValueCents,
    cardsValueCents,
    watchesValueCents,
    cardsSharePercent: totalValueCents > 0 ? Math.round((cardsValueCents / totalValueCents) * 100) : 0,
    watchesSharePercent: totalValueCents > 0 ? Math.round((watchesValueCents / totalValueCents) * 100) : 0,
    collections,
    brands,
  };
}

function groupBy(items: OwnedItem[], keyFn: (item: OwnedItem) => string): CollectionGroup[] {
  const map = new Map<string, OwnedItem[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()]
    .map(([key, groupItems]) => ({
      key,
      label: key,
      items: groupItems,
      valueCents: groupItems.reduce((sum, o) => sum + o.item.currentValueCents, 0),
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
}

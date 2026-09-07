import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { packsService } from "../services/packsService";

/** One GET /packs call, split by category client-side rather than two
 * requests. Evergreen only — a pack with a `goesLiveAt` is a timed drop and
 * belongs on the Drops tab (see useDropsViewModel), same rule as Shelf. */
export function useExploreViewModel() {
  const query = useQuery({
    queryKey: ["packs"],
    queryFn: () => packsService.list(),
  });

  const { cards, watches } = useMemo(() => {
    const evergreen = (query.data ?? []).filter((sku) => sku.goesLiveAt == null);
    return {
      cards: evergreen.filter((sku) => sku.category === "cards"),
      watches: evergreen.filter((sku) => sku.category === "watches"),
    };
  }, [query.data]);

  return {
    cards,
    watches,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}

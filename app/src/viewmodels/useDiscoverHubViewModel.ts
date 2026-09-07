import { useQuery } from "@tanstack/react-query";
import { packsService } from "../services/packsService";
import { marketplaceService } from "../services/marketplaceService";

/** Cheap hub-level counts — real totals straight off `/packs` and `/listings`, without the
 * per-item `/items/:id` fan-out `useDiscoverViewModel` does once you're actually inside a
 * category (the hub only needs sums, not each item's full detail). */
export function useDiscoverHubViewModel() {
  const cardsPacks = useQuery({ queryKey: ["packs", "cards"], queryFn: () => packsService.list("cards") });
  const watchesPacks = useQuery({ queryKey: ["packs", "watches"], queryFn: () => packsService.list("watches") });
  const cardsListings = useQuery({ queryKey: ["listings", "cards"], queryFn: () => marketplaceService.browse("cards") });
  const watchesListings = useQuery({ queryKey: ["listings", "watches"], queryFn: () => marketplaceService.browse("watches") });

  const cardsItemCount = (cardsPacks.data ?? []).reduce((sum, p) => sum + p.itemCount, 0);
  const watchesItemCount = (watchesPacks.data ?? []).reduce((sum, p) => sum + p.itemCount, 0);

  return {
    isLoading: cardsPacks.isLoading || watchesPacks.isLoading,
    cards: {
      itemCount: cardsItemCount,
      tierCount: (cardsPacks.data ?? []).length,
      listedNow: (cardsListings.data ?? []).length,
    },
    watches: {
      itemCount: watchesItemCount,
      tierCount: (watchesPacks.data ?? []).length,
      listedNow: (watchesListings.data ?? []).length,
    },
  };
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@grailhaus/shared";
import { marketplaceService } from "../services/marketplaceService";
import { NetworkError } from "../services/apiClient";
import { retryOnceOnNetworkError } from "../lib/retryOnNetworkError";

export type BuyResult = { ok: true } | { ok: false; error: string };

function buyFailureMessage(reason: string | null): string {
  if (reason === "already_sold") return "Already sold — someone bought it first.";
  if (reason === "delisted") return "The seller took this listing down.";
  if (reason === "insufficient_funds") return "Not enough balance for this purchase.";
  return "That purchase couldn't be completed.";
}

/** The buy mutation on its own — used by BuyListingScreen, which only needs to fire one
 * purchase and doesn't want the browse screen's `/listings` query mounted alongside it. */
export function useBuyListingViewModel() {
  const [isBuying, setBuying] = useState(false);
  const queryClient = useQueryClient();

  async function buy(listingId: string): Promise<BuyResult> {
    setBuying(true);
    try {
      // Safe to replay verbatim on a dropped connection: buyListing re-locks the listing and
      // checks its *current* state before doing anything, and explicitly treats "this same
      // buyer already won it" as completed rather than a failure (marketplace.service.ts) — so
      // a network blip mid-buy resolves itself here instead of leaving the user unsure whether
      // tapping "Buy" again would risk a double charge.
      const result = await retryOnceOnNetworkError(() => marketplaceService.buy(listingId));
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "me"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      if (result.status !== "completed") {
        return { ok: false, error: buyFailureMessage(result.failureReason) };
      }
      return { ok: true };
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "me"] });
      if (err instanceof NetworkError) {
        return { ok: false, error: "Lost connection before we could confirm. Pull to refresh — it may have already gone through." };
      }
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't reach GrailHaus — try again." };
    } finally {
      setBuying(false);
    }
  }

  return { isBuying, buy };
}

export function useMarketplaceViewModel(category?: Category) {
  const { isBuying, buy } = useBuyListingViewModel();

  const query = useQuery({
    queryKey: ["listings", category ?? "all"],
    queryFn: () => marketplaceService.browse(category),
  });

  return {
    listings: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    isBuying,
    buy,
  };
}

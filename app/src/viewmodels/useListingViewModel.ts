import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Listing } from "@grailhaus/shared";
import { marketplaceService } from "../services/marketplaceService";

export type ListResult = { ok: true } | { ok: false; error: string };
export type UpdatePriceResult = { ok: true; listing: Listing } | { ok: false; error: string };

/** ViewModel behind "Sell" on an owned item, and "Edit Price"/"Delist" on an active listing. */
export function useListingViewModel() {
  const [isWorking, setWorking] = useState(false);
  const queryClient = useQueryClient();

  async function createListing(ownedItemId: string, priceCents: number): Promise<ListResult> {
    setWorking(true);
    try {
      await marketplaceService.create(ownedItemId, priceCents);
      queryClient.invalidateQueries({ queryKey: ["portfolio", "me"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't list that item." };
    } finally {
      setWorking(false);
    }
  }

  async function delist(listingId: string): Promise<ListResult> {
    setWorking(true);
    try {
      await marketplaceService.delist(listingId);
      queryClient.invalidateQueries({ queryKey: ["portfolio", "me"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't delist that item." };
    } finally {
      setWorking(false);
    }
  }

  async function updatePrice(listingId: string, priceCents: number): Promise<UpdatePriceResult> {
    setWorking(true);
    try {
      const listing = await marketplaceService.updatePrice(listingId, priceCents);
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      return { ok: true, listing };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't update the price." };
    } finally {
      setWorking(false);
    }
  }

  return { isWorking, createListing, delist, updatePrice };
}

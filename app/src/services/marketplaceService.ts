import type { Category, Listing, RarityTierLevel } from "@grailhaus/shared";
import { apiGet, apiPost } from "./apiClient";

export interface FeePreview {
  feePercent: number;
  feeCents: number;
  sellerProceedsCents: number;
}

export const marketplaceService = {
  browse: (category?: Category): Promise<Listing[]> =>
    apiGet<Listing[]>(category ? `/listings?category=${category}&limit=100` : "/listings?limit=100"),
  get: (id: string): Promise<Listing> => apiGet<Listing>(`/listings/${id}`),
  create: (ownedItemId: string, priceCents: number): Promise<Listing> =>
    apiPost<Listing>("/listings", { ownedItemId, priceCents }),
  delist: (id: string): Promise<Listing> => apiPost<Listing>(`/listings/${id}/delist`, {}),
  updatePrice: (id: string, priceCents: number): Promise<Listing> =>
    apiPost<Listing>(`/listings/${id}/price`, { priceCents }),
  buy: (id: string): Promise<{ status: "completed" | "failed"; failureReason: string | null; listing: Listing }> =>
    apiPost(`/listings/${id}/buy`, {}),
  /** Live preview at today's configured rate — same math the server applies at listing-create
   * time, just not yet committed. Lets the sell screen show a real net figure while the seller
   * is still typing a price, matching the mockup's "fee and net update live." */
  previewFee: (category: Category, rarityTierLevel: RarityTierLevel, priceCents: number): Promise<FeePreview> =>
    apiGet<FeePreview>(
      `/marketplace/fee-preview?category=${category}&rarityTierLevel=${rarityTierLevel}&priceCents=${priceCents}`
    ),
};

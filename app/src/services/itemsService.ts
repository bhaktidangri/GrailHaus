import type { ItemDetail } from "@grailhaus/shared";
import { apiGet } from "./apiClient";

export const itemsService = {
  get: (id: string): Promise<ItemDetail> => apiGet<ItemDetail>(`/items/${id}`),
};

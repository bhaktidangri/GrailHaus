import type { OwnedItem } from "@grailhaus/shared";
import { apiGet } from "./apiClient";

export const portfolioService = {
  list: (): Promise<OwnedItem[]> => apiGet<OwnedItem[]>("/me/portfolio?limit=200"),
};

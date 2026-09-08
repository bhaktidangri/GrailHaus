import type { RecentPull } from "@grailhaus/shared";
import { apiGet } from "./apiClient";

export const activityService = {
  recent: (limit = 20): Promise<RecentPull[]> => apiGet<RecentPull[]>(`/activity/recent?limit=${limit}`),
};

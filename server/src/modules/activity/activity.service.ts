import type { RecentPull } from "@grailhaus/shared";
import { toItemDetail } from "../items/items.service.js";
import { findRecentPulls } from "./activity.repository.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function getRecentPulls(limit = DEFAULT_LIMIT): Promise<RecentPull[]> {
  const rows = await findRecentPulls(Math.min(Math.max(1, limit), MAX_LIMIT));
  return rows.map((row) => ({
    ownedItemId: row.owned_item_id,
    item: toItemDetail(row),
    username: row.username,
    acquiredAt: row.acquired_at,
  }));
}

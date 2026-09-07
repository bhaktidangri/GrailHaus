import type { OwnedItem } from "@grailhaus/shared";
import { toItemDetail } from "../items/items.service.js";
import { findOwnedItems } from "./portfolio.repository.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function getPortfolio(userId: string, limit = DEFAULT_LIMIT, offset = 0): Promise<OwnedItem[]> {
  const boundedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const rows = await findOwnedItems(userId, boundedLimit, Math.max(0, offset));
  return rows.map((row) => ({
    ownedItemId: row.owned_item_id,
    item: toItemDetail(row.item),
    packId: row.pack_id,
    purchaseId: row.purchase_id,
    acquiredAt: row.acquired_at,
  }));
}

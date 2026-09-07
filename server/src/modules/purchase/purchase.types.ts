import type { PulledItem } from "@grailhaus/shared";

export type PurchaseStatus = "pending" | "completed" | "failed";

export interface PurchaseResultPayload {
  items: PulledItem[];
  /** Same order as `items` — the `owned_items.id` each pulled item got, captured once at
   * insert time so a later cached/retried read (`findByIdempotencyKey`) doesn't need a separate,
   * ambiguous-on-duplicates lookup to reconstruct it. */
  ownedItemIds: string[];
}

export interface PurchaseRow {
  id: string;
  idempotency_key: string;
  user_id: string;
  pack_id: string;
  quantity: number;
  total_price_cents: string | null;
  status: PurchaseStatus;
  failure_reason: string | null;
  result: PurchaseResultPayload | null;
  created_at: string;
  completed_at: string | null;
}

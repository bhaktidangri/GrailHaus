import type { PulledItem } from "@grailhaus/shared";

export type PurchaseStatus = "pending" | "completed" | "failed";

export interface PurchaseResultPayload {
  items: PulledItem[];
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

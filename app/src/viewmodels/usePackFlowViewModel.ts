import { useState } from "react";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import type { PackSku } from "@grailhaus/shared";
import { usePackFlowStore } from "../state/packFlowStore";
import { categoryRegistry } from "../engine/categories/registry";
import { purchaseService } from "../services/purchaseService";
import { clearPendingPurchase, setPendingPurchase } from "../lib/pendingPurchase";

export type StartFlowResult = { ok: true } | { ok: false; error: string };

/**
 * ViewModel for the whole post-payment flow (Pack/Vault Detail's confirm sheet through the
 * Reveal tab's summary). Views only ever call `startFlow` / read `items`+`config`+`phase` here
 * — they don't know about the flow store, the purchase API, or the category registry directly.
 *
 * `startFlow` is the real atomic purchase (POST /purchase), not a client-side roll — pack
 * contents are decided server-side, inside the same transaction that debits the balance and
 * decrements stock, and are already persisted by the time this resolves. The idempotency key
 * is minted and written to secure storage *before* the network call, so a dropped connection
 * or a killed app can be safely retried with the same key rather than risking a double charge.
 *
 * Because the purchase has already fully resolved by the time `phase` becomes `"processing"`,
 * that phase is pure pacing (a deliberate pause before the reveal, per the mockup), not a wait
 * for the payment/stock/contents steps it visually narrates — those are already done.
 */
export function usePackFlowViewModel() {
  const sku = usePackFlowStore((s) => s.sku);
  const items = usePackFlowStore((s) => s.items);
  const purchaseId = usePackFlowStore((s) => s.purchaseId);
  const phase = usePackFlowStore((s) => s.phase);
  const start = usePackFlowStore((s) => s.start);
  const setPhase = usePackFlowStore((s) => s.setPhase);
  const clear = usePackFlowStore((s) => s.clear);
  const [isPurchasing, setPurchasing] = useState(false);
  const queryClient = useQueryClient();

  async function startFlow(pack: PackSku): Promise<StartFlowResult> {
    setPurchasing(true);
    try {
      const idempotencyKey = Crypto.randomUUID();
      await setPendingPurchase({ idempotencyKey, packId: pack.id, quantity: 1 });

      const result = await purchaseService.purchase(idempotencyKey, pack.id, 1);
      await clearPendingPurchase();
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "me"] });

      if (result.status !== "completed") {
        return { ok: false, error: failureMessage(result.failureReason) };
      }
      start(pack, result.items, result.purchaseId);
      return { ok: true };
    } catch (err) {
      // Left in secure storage on purpose — a network failure here means the server may or may
      // not have already completed this purchase. The next attempt (explicit retry, or the
      // app-boot reconciliation in lib/pendingPurchase.ts) reuses the same key rather than
      // risking a second charge for the same tap.
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't reach GrailHaus — try again." };
    } finally {
      setPurchasing(false);
    }
  }

  return {
    sku,
    items,
    purchaseId,
    phase,
    config: sku ? categoryRegistry[sku.category] : null,
    isActive: sku != null && items != null,
    isPurchasing,
    startFlow,
    setPhase,
    finishFlow: clear,
  };
}

function failureMessage(reason: string | null): string {
  if (reason === "insufficient_funds") return "Not enough balance for this pack.";
  if (reason === "insufficient_stock") return "That pack just sold out.";
  if (reason === "not_live_yet") return "This drop hasn't gone live yet.";
  if (reason === "drop_ended") return "This drop has ended.";
  return "That purchase couldn't be completed.";
}

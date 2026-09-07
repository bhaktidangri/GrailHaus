import { useState } from "react";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import type { PackSku } from "@grailhaus/shared";
import { useRevealStore } from "../state/revealStore";
import { categoryRegistry } from "../engine/categories/registry";
import { purchaseService } from "../services/purchaseService";
import { clearPendingPurchase, setPendingPurchase } from "../lib/pendingPurchase";

export type StartRevealResult = { ok: true } | { ok: false; error: string };

/**
 * ViewModel for the Reveal screen. Views only ever call `startReveal` / read `items`+`config`
 * here — they don't know about the reveal store, the purchase API, or the category registry
 * directly.
 *
 * `startReveal` is the real atomic purchase (POST /purchase), not a client-side roll — pack
 * contents are decided server-side, inside the same transaction that debits the balance and
 * decrements stock, and are already persisted by the time this resolves. The idempotency key
 * is minted and written to secure storage *before* the network call, so a dropped connection
 * or a killed app can be safely retried with the same key rather than risking a double charge.
 */
export function useRevealViewModel() {
  const sku = useRevealStore((s) => s.sku);
  const items = useRevealStore((s) => s.items);
  const start = useRevealStore((s) => s.start);
  const clear = useRevealStore((s) => s.clear);
  const [isPurchasing, setPurchasing] = useState(false);
  const queryClient = useQueryClient();

  async function startReveal(pack: PackSku, quantity: 1 | 10 = 1): Promise<StartRevealResult> {
    setPurchasing(true);
    try {
      const idempotencyKey = Crypto.randomUUID();
      await setPendingPurchase({ idempotencyKey, packId: pack.id, quantity });

      const result = await purchaseService.purchase(idempotencyKey, pack.id, quantity);
      await clearPendingPurchase();
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });

      if (result.status !== "completed") {
        return { ok: false, error: failureMessage(result.failureReason) };
      }
      start(pack, result.items);
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
    config: sku ? categoryRegistry[sku.category] : null,
    isActive: sku != null && items != null,
    isPurchasing,
    startReveal,
    finishReveal: clear,
  };
}

function failureMessage(reason: string | null): string {
  if (reason === "insufficient_funds") return "Not enough balance for this pack.";
  if (reason === "insufficient_stock") return "That pack just sold out.";
  if (reason === "not_live_yet") return "This drop hasn't gone live yet.";
  if (reason === "drop_ended") return "This drop has ended.";
  return "That purchase couldn't be completed.";
}

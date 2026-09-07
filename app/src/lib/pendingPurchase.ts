import * as SecureStore from "expo-secure-store";

const KEY = "grailhaus_pending_purchase";

export interface PendingPurchase {
  idempotencyKey: string;
  packId: string;
  quantity: number;
}

/**
 * The one thing that makes "never twice, never lost" survive an app kill, not just a network
 * blip: the idempotency key is written here *before* the purchase request ever goes out, and
 * cleared only once that key's outcome is known for certain. If the app dies mid-purchase, the
 * next launch finds this and reconciles via GET /purchases/:idempotencyKey instead of either
 * silently dropping the attempt or letting the user fire a brand-new one.
 */
export async function setPendingPurchase(pending: PendingPurchase): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(pending));
}

export async function getPendingPurchase(): Promise<PendingPurchase | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPurchase;
  } catch {
    return null;
  }
}

export async function clearPendingPurchase(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

/**
 * Runs once at app boot: if the app was killed between minting an idempotency key and learning
 * its outcome, this asks the server what actually happened (no re-execution — see
 * purchase.service.ts's claim-then-execute design) instead of leaving that purchase in limbo
 * forever or letting a future retry mint a fresh key for an attempt that may have already gone
 * through. The purchase's correctness never depended on this running — the server already
 * settled it one way or the other — this is purely about the client not losing track.
 */
export async function reconcilePendingPurchase(): Promise<void> {
  const pending = await getPendingPurchase();
  if (!pending) return;

  // Deferred import: avoids a require cycle with services that themselves touch auth state.
  const { purchaseService } = await import("../services/purchaseService");
  try {
    const result = await purchaseService.getByIdempotencyKey(pending.idempotencyKey);
    if (result.status === "pending") return; // still genuinely in flight — check again next launch
  } catch {
    return; // couldn't reach the server to find out — leave it for next launch
  }
  await clearPendingPurchase();
}

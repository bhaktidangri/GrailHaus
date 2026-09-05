import { pullPack, resolveItems, type PackSku, type PulledItem } from "@grailhaus/shared";
import { usePressureStore } from "../state/pressureStore";

/**
 * TODO: replace with `POST /purchase` once Deliverable 2's atomic purchase
 * endpoint exists — contents must be decided server-side at purchase time.
 * This runs the *real* reward engine (shared/src/rewardEngine.ts) against
 * the pack's live progressive-probability and pity-rule data returned by
 * `/packs`, so behavior here matches what the real endpoint will do; only
 * the pity *state* is a client-side stand-in (also TODO: move server-side).
 */
export function mockPullFromPool(sku: PackSku): PulledItem[] {
  const pressure = usePressureStore.getState();
  const currentState = { packId: sku.id, consecutiveWithoutQualifying: pressure.get(sku.id) };

  const { tierLevels, nextPressureState } = pullPack(sku, currentState);
  pressure.set(sku.id, nextPressureState.consecutiveWithoutQualifying);

  return resolveItems(sku, tierLevels);
}

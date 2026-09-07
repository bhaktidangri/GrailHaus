import { create } from "zustand";
import type { ItemDetail, PackSku } from "@grailhaus/shared";

/**
 * Where a purchase is in the post-payment flow — `RevealScreen` branches its
 * whole render on this. `"revealing"` is deliberately coarse: each category's
 * flow engine (CardFlowEngine / VaultFlowEngine) keeps its own local
 * sub-phase (introduction, per-card index, final-card hold, door/silhouette/
 * full-reveal beats, ...) the same way the old RevealEngine already kept
 * local `phase`/`index` state — this store only needs to know enough to
 * route to the right engine and to survive a re-mount of the Reveal tab.
 */
export type FlowPhase = "processing" | "ready" | "revealing" | "summary";

interface PackFlowState {
  sku: PackSku | null;
  /** Full catalog detail, not just the reward engine's minimal PulledItem shape — POST
   * /purchase enriches its response before this store ever sees it. */
  items: ItemDetail[] | null;
  /** The real purchase record's id — lets the engine be `key`-ed per purchase, so tapping
   * "Rip Another" (a genuinely new POST /purchase, not a client-side re-roll) remounts the
   * flow engine at "processing" instead of leaving stale per-card `useState` behind from the
   * previous pull. */
  purchaseId: string | null;
  phase: FlowPhase;
  /** Begins a flow right after a successful purchase — payment, stock decrement and item
   * assignment are already committed server-side by this point, so `"processing"` here is
   * pure pacing, not a wait for anything to actually finish. */
  start: (sku: PackSku, items: ItemDetail[], purchaseId: string) => void;
  setPhase: (phase: FlowPhase) => void;
  clear: () => void;
}

/** Holds the in-flight purchase flow so tapping "Rip"/"Unlock" on Shelf can hand off to the
 * Reveal tab (sibling tabs, not a stack, so this can't just be a navigation param). */
export const usePackFlowStore = create<PackFlowState>((set) => ({
  sku: null,
  items: null,
  purchaseId: null,
  phase: "processing",
  start: (sku, items, purchaseId) => set({ sku, items, purchaseId, phase: "processing" }),
  setPhase: (phase) => set({ phase }),
  clear: () => set({ sku: null, items: null, purchaseId: null, phase: "processing" }),
}));

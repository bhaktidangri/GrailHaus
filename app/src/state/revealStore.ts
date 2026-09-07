import { create } from "zustand";
import type { ItemDetail, PackSku } from "@grailhaus/shared";

interface RevealState {
  sku: PackSku | null;
  /** Full catalog detail, not just the reward engine's minimal PulledItem shape — POST
   * /purchase enriches its response before this store ever sees it. */
  items: ItemDetail[] | null;
  start: (sku: PackSku, items: ItemDetail[]) => void;
  clear: () => void;
}

/** Holds the in-flight reveal so tapping "Rip" on the Shelf tab can hand off to the Reveal tab
 * (sibling tabs, not a stack, so this can't just be a navigation param). */
export const useRevealStore = create<RevealState>((set) => ({
  sku: null,
  items: null,
  start: (sku, items) => set({ sku, items }),
  clear: () => set({ sku: null, items: null }),
}));

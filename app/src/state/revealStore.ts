import { create } from "zustand";
import type { PackSku, PulledItem } from "@grailhaus/shared";

interface RevealState {
  sku: PackSku | null;
  items: PulledItem[] | null;
  start: (sku: PackSku, items: PulledItem[]) => void;
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

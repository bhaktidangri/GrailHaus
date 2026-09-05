import { useRevealStore } from "../state/revealStore";
import { categoryRegistry } from "../engine/categories/registry";
import { mockPullFromPool } from "./mockPullFromPool";
import type { PackSku } from "@grailhaus/shared";

/**
 * ViewModel for the Reveal screen. Views only ever call `startReveal` /
 * read `items`+`config` here — they don't know about the reveal store, the
 * mock-pull policy, or the category registry directly.
 */
export function useRevealViewModel() {
  const sku = useRevealStore((s) => s.sku);
  const items = useRevealStore((s) => s.items);
  const start = useRevealStore((s) => s.start);
  const clear = useRevealStore((s) => s.clear);

  function startReveal(pack: PackSku) {
    start(pack, mockPullFromPool(pack));
  }

  return {
    sku,
    items,
    config: sku ? categoryRegistry[sku.category] : null,
    isActive: sku != null && items != null,
    startReveal,
    finishReveal: clear,
  };
}

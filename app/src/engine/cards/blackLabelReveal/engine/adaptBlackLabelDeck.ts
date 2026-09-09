import type { PackSku, PulledOwnedItem } from "@grailhaus/shared";
import { adaptPulledItemsToVaultDeck } from "../../vaultReveal/engine/adaptRealDeck";
import type { VaultCardData } from "../../vaultReveal/config/types";

/** Same real-data mapping as Vault Break's adaptPulledItemsToVaultDeck — see that file's header
 * for what's real vs. a styling choice — just with this tier's own "BL-" serial prefix instead
 * of "VB-". */
export function adaptPulledItemsToBlackLabelDeck(items: PulledOwnedItem[], sku: PackSku): VaultCardData[] {
  return adaptPulledItemsToVaultDeck(items, sku, "BL");
}

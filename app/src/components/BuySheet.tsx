import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { PackSku } from "@grailhaus/shared";
import { accent, ink, spacing, typography } from "../theme/tokens";
import { PackFace } from "./PackFace";
import { WatchDial } from "./WatchDial";
import { GameButton } from "./GameButton";
import { QuietButton } from "./QuietButton";
import { ART_GRADIENT, TIER_LABEL } from "./PackTile";
import { buySheet as copy } from "../content/copy";

/**
 * The confirm step between "tap a tile" and the real purchase call — states
 * balance-after before the tap, per the mockup, and per the PRD's own
 * atomicity story (the user should never be surprised by what a purchase
 * cost). Quantity is a Buy 1 / Buy 10 toggle, not a free stepper: the backend
 * only accepts `quantity: 1 | 10` (`POST /purchase`), and rejects bulk for
 * watches outright — so the toggle is hidden entirely for watches, and
 * disabled for cards when fewer than 10 remain.
 */
export function BuySheet({
  visible,
  sku,
  balanceCents,
  isPurchasing,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  sku: PackSku | null;
  balanceCents: number | null;
  isPurchasing: boolean;
  onClose: () => void;
  onConfirm: (quantity: 1 | 10) => void;
}) {
  const [quantity, setQuantity] = useState<1 | 10>(1);

  useEffect(() => {
    if (visible) setQuantity(1);
  }, [visible, sku?.id]);

  if (!sku) return null;
  const isWatches = sku.category === "watches";
  const canBulk = !isWatches && (sku.stockRemaining == null || sku.stockRemaining >= 10);
  const totalCents = sku.priceCents * quantity;
  const balanceAfter = balanceCents != null ? balanceCents - totalCents : null;
  const insufficient = balanceAfter != null && balanceAfter < 0;
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.street_rip;
  const tone = isWatches ? accent.watches : accent.cards;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: isWatches ? "#12100C" : "#171029" }]}>
          <View style={styles.grabber} />

          <View style={styles.itemRow}>
            {isWatches ? (
              <WatchDial art={art} size={58} />
            ) : (
              <PackFace art={art} width={58} height={81} radius={11} crimp />
            )}
            <View style={styles.itemInfo}>
              <Text style={isWatches ? typography.tierPillWatches : typography.tierPill}>
                {TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase()}
              </Text>
              <Text style={[isWatches ? typography.packNameWatches : typography.packNameHero, styles.itemName]}>
                {sku.name}
              </Text>
            </View>
          </View>

          {canBulk && (
            <View style={styles.qtyRow}>
              {([1, 10] as const).map((q) => {
                const isActive = quantity === q;
                return (
                  <Pressable
                    key={q}
                    onPress={() => setQuantity(q)}
                    style={[styles.qtyItem, isActive && { backgroundColor: `${tone.c1}33`, borderColor: tone.c1 }]}
                  >
                    <Text style={[styles.qtyLabel, isActive && { color: "#fff" }]}>{copy.quantity(q)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.breakdown}>
            <Row label={copy.lineItem(quantity, sku.priceCents)} value={`$${(totalCents / 100).toFixed(2)}`} />
            {balanceCents != null && <Row label={copy.balanceNow} value={`$${(balanceCents / 100).toFixed(2)}`} />}
            <View style={styles.divider} />
            <Row
              label={copy.balanceAfter}
              value={balanceAfter != null ? `$${(balanceAfter / 100).toFixed(2)}` : "—"}
              emphasize
            />
          </View>

          {insufficient && <Text style={styles.warning}>{copy.insufficientBalance}</Text>}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancel} disabled={isPurchasing}>
              <Text style={styles.cancelLabel}>{copy.cancel}</Text>
            </Pressable>
            {isWatches ? (
              <QuietButton
                label={isPurchasing ? copy.working : copy.confirm}
                accent={tone}
                onPress={() => !isPurchasing && !insufficient && onConfirm(quantity)}
                dark
                style={styles.confirmWrap}
              />
            ) : (
              <GameButton
                label={isPurchasing ? copy.working : copy.confirm}
                accent={tone}
                onPress={() => !isPurchasing && !insufficient && onConfirm(quantity)}
                style={styles.confirmWrap}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={emphasize ? styles.rowValueBig : styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(6,3,14,0.72)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignSelf: "center",
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: spacing.lg },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { marginTop: 4 },
  qtyRow: { flexDirection: "row", gap: 9, marginTop: spacing.lg },
  qtyItem: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyLabel: { ...typography.chipLabel, color: ink.textMuted },
  breakdown: { marginTop: spacing.xl, gap: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  rowLabel: typography.metaLine,
  rowValue: { ...typography.body, color: ink.text },
  rowValueBig: { ...typography.display, fontSize: 26 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  warning: { ...typography.errorText, marginTop: spacing.md, textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, alignItems: "center" },
  cancel: { flex: 1, alignItems: "center", justifyContent: "center", height: 58 },
  cancelLabel: { ...typography.linkMuted, letterSpacing: 1 },
  confirmWrap: { flex: 1.4 },
});

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ItemDetail, PackSku, PulledOwnedItem } from "@grailhaus/shared";
import { StatBox } from "../../components/StatBox";
import { TIER_LABEL } from "../../components/PackTile";
import { accents, fonts, ink, spacing } from "../../theme/tokens";

/**
 * The terminal screen for a bulk (10-pack) rip — "everything pulled across ten packs, total
 * spend versus total value, and the best pull surfaced as the hero," per the multi-pack
 * requirement. Distinct from each individual pack's own mini `SummaryView` (CardFlowEngine) —
 * this is what the batch hands off to once the last pack's "SEE FULL RESULTS" is tapped, or the
 * user taps "Skip to results" early from any pack in the batch (see RevealScreen/
 * usePackFlowViewModel.skipToResults — every pack's contents already exist regardless of how
 * many were actually watched play out, so skipping ahead here never loses or re-rolls anything).
 *
 * This is also the screen "force-stop at pack six of ten, reopen" can land directly on if the
 * device happened to die exactly between the last pack finishing and this screen's own summary
 * being dismissed — same `resumedToSummary` contract every other terminal screen in this engine
 * honors (see packFlowStore's own header), just at the batch level instead of the per-pack one.
 */
export function BatchSummaryScreen({
  sku,
  packs,
  isRipAgainWorking,
  onRipAgain,
  onGoHome,
  onViewCollection,
}: {
  sku: PackSku;
  packs: PulledOwnedItem[][];
  isRipAgainWorking: boolean;
  onRipAgain: () => void;
  onGoHome: () => void;
  onViewCollection: () => void;
}) {
  const allItems: ItemDetail[] = packs.flat();
  const totalSpendCents = sku.priceCents * packs.length;
  const totalValueCents = allItems.reduce((sum, i) => sum + i.baseValueCents, 0);
  const profitCents = totalValueCents - totalSpendCents;
  const best = allItems.reduce<ItemDetail | null>(
    (a, b) => (a == null || b.baseValueCents > a.baseValueCents ? b : a),
    null
  );
  const bestTier = best ? sku.rarityTiers.find((t) => t.level === best.rarityTierLevel) : null;
  const tierLabel = TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase();

  return (
    <View style={styles.fill}>
      <View style={styles.summaryHeader}>
        <Text style={styles.eyebrow}>{packs.length}-PACK COMPLETE</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.summaryScroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.profit, { color: profitCents >= 0 ? "#8BF285" : "#F0554A" }]}>
          {profitCents >= 0 ? "+" : "-"}${(Math.abs(profitCents) / 100).toFixed(0)}
        </Text>
        <Text style={styles.summarySub}>
          ${(totalValueCents / 100).toFixed(0)} pulled across {packs.length} packs · $
          {(totalSpendCents / 100).toFixed(0)} spent · {allItems.length} cards
        </Text>

        {best && bestTier && (
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>BEST PULL</Text>
            <View style={styles.heroTile}>
              {best.textureUrl ? (
                <Image
                  source={best.textureUrl}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
              ) : null}
              <LinearGradient
                colors={
                  best.textureUrl
                    ? ["transparent", "rgba(0,0,0,0.6)"]
                    : [`${bestTier.colorHex}CC`, "rgba(0,0,0,0.55)"]
                }
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.heroTierLabel}>{bestTier.name.toUpperCase()}</Text>
              <Text style={styles.heroValue}>${(best.baseValueCents / 100).toFixed(0)}</Text>
            </View>
            <Text style={styles.heroName} numberOfLines={1}>
              {best.name}
            </Text>
          </View>
        )}

        <View style={styles.resultsGrid}>
          {packs.map((pack, packIndex) =>
            pack.map((item, i) => {
              const tier = sku.rarityTiers.find((t) => t.level === item.rarityTierLevel);
              return (
                <View key={`${packIndex}-${item.id}-${i}`} style={styles.resultTile}>
                  {item.textureUrl ? (
                    <Image
                      source={item.textureUrl}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  ) : null}
                  <LinearGradient
                    colors={
                      item.textureUrl
                        ? ["transparent", "rgba(0,0,0,0.55)"]
                        : [`${tier?.colorHex ?? "#888"}CC`, "rgba(0,0,0,0.5)"]
                    }
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.resultValue}>${(item.baseValueCents / 100).toFixed(0)}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.statRow}>
          <StatBox label="PACKS" value={String(packs.length)} />
          <StatBox label="CARDS" value={String(allItems.length)} />
          <StatBox label="TOTAL VALUE" value={`$${(totalValueCents / 100).toFixed(0)}`} />
        </View>

        <Text style={styles.addedNote}>✓ All {allItems.length} cards added to your collection</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onRipAgain} disabled={isRipAgainWorking}>
          <LinearGradient colors={[accents.cards.top, accents.cards.bottom]} style={styles.primaryButton}>
            {isRipAgainWorking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonLabel}>RIP 10 MORE {tierLabel.toUpperCase()}</Text>
            )}
          </LinearGradient>
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable onPress={onViewCollection} disabled={isRipAgainWorking} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>VIEW COLLECTION</Text>
          </Pressable>
          <Pressable onPress={onGoHome} disabled={isRipAgainWorking} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>BACK TO HOME</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0b0b10", paddingTop: 56, paddingHorizontal: 20 },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.62)" },
  summaryHeader: { alignItems: "center" },
  scroll: { flex: 1, marginTop: 20 },
  summaryScroll: { alignItems: "center", gap: spacing.lg, paddingBottom: 220 },
  profit: { fontFamily: fonts.black, fontSize: 44 },
  summarySub: { fontFamily: fonts.medium, fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", paddingHorizontal: spacing.lg },
  heroCard: { alignItems: "center", gap: 8, marginTop: spacing.sm },
  heroEyebrow: { fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 2, color: accents.cards.top },
  heroTile: {
    width: 128,
    height: 176,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroTierLabel: {
    position: "absolute",
    top: 10,
    left: 10,
    fontFamily: fonts.extrabold,
    fontSize: 9,
    letterSpacing: 1,
    color: "#fff",
  },
  heroValue: { fontFamily: fonts.black, fontSize: 20, color: "#fff" },
  heroName: { fontFamily: fonts.bold, fontSize: 14, color: ink.text, maxWidth: 200 },
  resultsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" },
  resultTile: {
    width: 48,
    height: 66,
    borderRadius: 9,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 5,
  },
  resultValue: { fontFamily: fonts.bold, fontSize: 10, color: "#fff" },
  statRow: { flexDirection: "row", gap: 10, width: "100%" },
  addedNote: { fontFamily: fonts.semibold, fontSize: 12.5, color: "#8BF285" },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: "#0b0b10",
  },
  primaryButton: {
    height: 62,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.26)",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 260,
    paddingHorizontal: 24,
  },
  primaryButtonLabel: { fontFamily: fonts.black, fontSize: 15, letterSpacing: 0.8, color: "#fff" },
  secondaryRow: { flexDirection: "row", gap: spacing.sm, width: "100%", minWidth: 260 },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonLabel: { fontFamily: fonts.bold, fontSize: 12.5, letterSpacing: 0.5, color: "rgba(255,255,255,0.85)" },
});

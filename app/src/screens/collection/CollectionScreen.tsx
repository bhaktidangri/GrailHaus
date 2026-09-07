import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSessionViewModel } from "../../viewmodels/useSessionViewModel";
import { useCollectionViewModel } from "../../viewmodels/useCollectionViewModel";
import { colors, typography } from "../../theme/tokens";
import { collection as copy } from "../../content/copy";
import type { CollectionStackParamList } from "../../navigation/CollectionStack";

type Nav = NativeStackNavigationProp<CollectionStackParamList, "Collection">;

/**
 * The Portfolio tab's root — a fork, not a tab bar (mockup 13a): two doors, each carrying its
 * own count and value, because cards and watches are read completely differently below this
 * point (a binder vs a vault). Every number here comes straight off `/me/portfolio` — nothing
 * is invented to fill the mockup's "+1.84%" style day-over-day badge, since a portfolio-level
 * change figure isn't something the API tracks.
 */
export function CollectionScreen() {
  const navigation = useNavigation<Nav>();
  const session = useSessionViewModel();
  const vm = useCollectionViewModel();

  const categories = (vm.cards.length > 0 ? 1 : 0) + (vm.watches.length > 0 ? 1 : 0);

  return (
    <View style={styles.fill}>
      <View style={styles.base} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.sub}>{copy.itemCount(vm.owned.length, categories)}</Text>
        </View>
        {session.balanceCents != null && (
          <View style={styles.balancePill}>
            <LinearGradient colors={["#FFE27A", "#E0A016"]} style={styles.coin} />
            <Text style={styles.balanceText}>{(session.balanceCents / 100).toLocaleString()}</Text>
          </View>
        )}
      </View>

      {vm.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : vm.owned.length === 0 ? (
        <Text style={styles.empty}>{copy.empty}</Text>
      ) : (
        <View style={styles.body}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>{copy.totalValue}</Text>
            <Text style={styles.totalValue}>${(vm.totalValueCents / 100).toLocaleString()}</Text>
            <View style={styles.splitBar}>
              <View style={{ flex: Math.max(vm.cardsSharePercent, 1), backgroundColor: "#B14BFF" }} />
              <View style={{ flex: Math.max(vm.watchesSharePercent, 1), backgroundColor: "#F2C46B" }} />
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#B14BFF" }]} />
                <Text style={styles.legendText}>{copy.cardsLabel(vm.cardsSharePercent)}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#F2C46B" }]} />
                <Text style={styles.legendText}>{copy.watchesLabel(vm.watchesSharePercent)}</Text>
              </View>
            </View>
          </View>

          {vm.cards.length > 0 && (
            <Pressable style={styles.door} onPress={() => navigation.navigate("Binder", undefined)}>
              <LinearGradient
                colors={["rgba(177,75,255,0.26)", "rgba(91,31,214,0.14)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.doorBorder, { borderColor: "rgba(177,75,255,0.55)" }]} />
              <Text style={styles.doorEyebrow}>{copy.binder.eyebrow}</Text>
              <Text style={styles.doorTitle}>{copy.binder.title}</Text>
              <Text style={styles.doorSummary}>
                {copy.cardsSummary(vm.cards.length, vm.collections.length, vm.cardsValueCents)}
              </Text>
              <View style={styles.doorCta}>
                <LinearGradient colors={["#B14BFF", "#5B1FD6"]} style={styles.doorCtaBtn}>
                  <Text style={styles.doorCtaLabel}>{copy.binder.cta}</Text>
                </LinearGradient>
              </View>
            </Pressable>
          )}

          {vm.watches.length > 0 && (
            <Pressable style={styles.door} onPress={() => navigation.navigate("Vault")}>
              <LinearGradient
                colors={["rgba(242,196,107,0.2)", "rgba(122,90,34,0.1)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.doorBorder, { borderColor: "rgba(242,196,107,0.5)" }]} />
              <Text style={[styles.doorEyebrow, { color: "#F2C46B" }]}>{copy.vault.eyebrow}</Text>
              <Text style={styles.doorTitle}>{copy.vault.title}</Text>
              <Text style={styles.doorSummary}>
                {copy.watchesSummary(vm.watches.length, vm.brands.length, vm.watchesValueCents)}
              </Text>
              <View style={styles.doorCta}>
                <LinearGradient colors={["#FFD75E", "#E08A16"]} style={styles.doorCtaBtn}>
                  <Text style={[styles.doorCtaLabel, { color: "#2A1706" }]}>{copy.vault.cta}</Text>
                </LinearGradient>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  base: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: typography.heroWordmark,
  sub: { ...typography.sectionSub, marginTop: 4 },
  balancePill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  coin: { width: 14, height: 14, borderRadius: 7 },
  balanceText: typography.countMain,
  loading: { marginTop: 60 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 60, paddingHorizontal: 32 },
  body: { padding: 20, gap: 14 },
  totalCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
  },
  totalLabel: typography.eyebrow,
  totalValue: { ...typography.heroWordmark, fontSize: 38, marginTop: 6 },
  splitBar: { flexDirection: "row", height: 8, borderRadius: 5, overflow: "hidden", marginTop: 16, gap: 3 },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 11 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 3 },
  legendText: { ...typography.metaLine, color: "rgba(255,255,255,0.72)" },
  door: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
  },
  doorBorder: { ...StyleSheet.absoluteFill, borderRadius: 22, borderWidth: 2 },
  doorEyebrow: { ...typography.eyebrow, letterSpacing: 3.4, color: "#E0C4FF" },
  doorTitle: { ...typography.pageHeading, fontSize: 26, marginTop: 7 },
  doorSummary: { ...typography.sectionSub, marginTop: 5 },
  doorCta: { marginTop: 14, alignSelf: "flex-start" },
  doorCtaBtn: { height: 38, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  doorCtaLabel: { ...typography.chipLabel, fontSize: 12.5, color: "#fff" },
});

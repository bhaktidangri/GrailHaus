import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { marketplaceService } from "../../services/marketplaceService";
import { useTabBarClearance } from "../../navigation/tabBarVisibility";
import { colors, ink, typography } from "../../theme/tokens";
import { itemFork as copy } from "../../content/copy";
import type { DiscoverStackParamList } from "../../navigation/DiscoverStack";

type Nav = NativeStackNavigationProp<DiscoverStackParamList, "ItemFork">;
type Route = RouteProp<DiscoverStackParamList, "ItemFork">;

const RARITY_NAME: Record<1 | 2 | 3, string> = { 1: "Core", 2: "Prime", 3: "Grail" };
const RARITY_NAME_WATCH: Record<1 | 2 | 3, string> = { 1: "Heritage", 2: "Icon", 3: "Apex" };

/** The honest fork the whole Discover journey is built around (mockup 18a/18b): every catalog
 * item ends in one decision, priced against each other with real numbers — chase it in the
 * pack that can drop it, or buy the exact one from someone who already pulled it. */
export function ItemForkScreen() {
  const navigation = useNavigation<Nav>();
  const { category, item } = useRoute<Route>().params;
  const { detail } = item;
  const isWatch = category === "watches";
  const tabBarClearance = useTabBarClearance();

  const listingsQuery = useQuery({
    queryKey: ["listings", category],
    queryFn: () => marketplaceService.browse(category),
  });

  const matchingListing = useMemo(
    () => (listingsQuery.data ?? []).find((l) => l.item.id === detail.id) ?? null,
    [listingsQuery.data, detail.id]
  );

  const rarityName = isWatch ? RARITY_NAME_WATCH[detail.rarityTierLevel] : RARITY_NAME[detail.rarityTierLevel];

  // Crossing from Discover's stack into a sibling tab's own nested stack (Marketplace's
  // ListingDetail, Home's World) isn't expressible in RootTabParamList's types — each tab
  // only declares its own top-level screen — so this jump is deliberately loosely typed.
  const parentNavigate = navigation.getParent()?.navigate as
    | ((name: string, params?: object) => void)
    | undefined;

  function handleBuyExact() {
    if (matchingListing) {
      parentNavigate?.("Marketplace", { screen: "ListingDetail", params: { listing: matchingListing } });
    } else {
      parentNavigate?.("Marketplace");
    }
  }

  function handleTryLuck() {
    parentNavigate?.("Home", { screen: "World", params: { category } });
  }

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Wash lives in content coordinates, not as a screen-fixed sibling — a fixed wash
            would stay pinned to the viewport as the header/hero scroll away, bleeding into
            whatever section (value, fork options) scrolls into that same screen region. */}
        <View style={styles.washWrap}>
          <LinearGradient
            colors={[isWatch ? "rgba(242,196,107,0.2)" : "rgba(177,75,255,0.24)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
              <View style={styles.backChevron} />
            </Pressable>
            <Text style={styles.headerLabel}>{rarityName.toUpperCase()} VERSION</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.heroRow}>
            {isWatch ? (
              <WatchDial art={itemArtGradient(detail)} size={124} />
            ) : (
              <CardFace gradient={itemArtGradient(detail)} width={124} height={173} borderColor="rgba(255,215,94,0.78)" />
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.name}>{(detail.cardTitle ?? detail.watchName ?? detail.name).toUpperCase()}</Text>
              <Text style={styles.subName}>
                {[detail.pokemonName ?? detail.brand, rarityName].filter(Boolean).join(" · ")}
              </Text>

              <View style={styles.specRows}>
                <SpecRow label={copy.rarity} value={rarityName} valueColor={colors.goldTop} />
                <SpecRow label={copy.collectionLabel} value={detail.collection ?? detail.brand ?? "—"} />
                <SpecRow label={copy.youOwn} value={item.ownedCount > 0 ? String(item.ownedCount) : copy.none} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.valueCard}>
            <Text style={styles.sectionLabel}>{copy.estimatedValue}</Text>
            <Text style={styles.valueBig}>${(detail.currentValueCents / 100).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{copy.availability}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{copy.listedNow}</Text>
              <Text style={styles.statValue}>{item.listedCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{copy.packPrice}</Text>
              <Text style={styles.statValue}>${(item.packPriceCents / 100).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: tabBarClearance }]}>
        <Text style={styles.howTitle}>{copy.howToGet}</Text>
        <View style={styles.forkRow}>
          <Pressable style={[styles.forkButton, styles.forkLuck]} onPress={handleTryLuck}>
            <Text style={styles.forkLabel}>{copy.tryYourLuck}</Text>
            <Text style={styles.forkSub}>{copy.fromPack(item.packName)}</Text>
          </Pressable>
          <Pressable style={[styles.forkButton, styles.forkBuy]} onPress={handleBuyExact}>
            <Text style={[styles.forkLabel, styles.forkLabelDark]}>{copy.buyExact}</Text>
            <Text style={[styles.forkSub, styles.forkSubDark]}>
              {matchingListing ? copy.listingsFrom(item.listedCount, matchingListing.priceCents) : copy.noListings}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SpecRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={[styles.specValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  scroll: { paddingBottom: 20 },
  washWrap: { position: "relative" },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  backChevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2.2,
    borderBottomWidth: 2.2,
    borderColor: "#fff",
    transform: [{ rotate: "45deg" }, { translateX: 1 }],
  },
  headerLabel: { ...typography.eyebrow, letterSpacing: 2.4, color: colors.goldTop },
  heroRow: { flexDirection: "row", gap: 15, paddingHorizontal: 20, paddingTop: 16, alignItems: "flex-start" },
  heroInfo: { flex: 1, minWidth: 0 },
  name: { ...typography.pageHeading, fontSize: 23 },
  subName: { ...typography.sectionSub, marginTop: 5 },
  specRows: { marginTop: 12, gap: 7 },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  specLabel: { ...typography.metaLine, fontSize: 10, color: "rgba(255,255,255,0.62)" },
  specValue: { ...typography.metaLine, fontSize: 11, color: "#fff" },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: typography.eyebrow,
  valueCard: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "rgba(255,215,94,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,94,0.36)",
  },
  valueBig: { ...typography.heroWordmark, fontSize: 30, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 11 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statLabel: { fontSize: 9, fontWeight: "600" as const, letterSpacing: 1.3, color: "rgba(255,255,255,0.62)" },
  statValue: { ...typography.title, fontSize: 19, marginTop: 3 },
  footer: { padding: 20, paddingBottom: 28 },
  howTitle: { ...typography.chipLabel, fontSize: 15, marginBottom: 11 },
  forkRow: { flexDirection: "row", gap: 10 },
  forkButton: {
    flex: 1,
    height: 64,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.26)",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  forkLuck: { backgroundColor: colors.violetTop },
  forkBuy: { backgroundColor: colors.goldTop },
  forkLabel: { ...typography.chipLabel, fontSize: 12.5, color: "#fff" },
  forkLabelDark: { color: "#2A1706" },
  forkSub: { fontSize: 10, fontWeight: "600" as const, color: "rgba(255,255,255,0.78)" },
  forkSubDark: { color: "rgba(42,23,6,0.75)" },
});

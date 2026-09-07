import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Category, Listing } from "@grailhaus/shared";
import { useSessionViewModel } from "../../viewmodels/useSessionViewModel";
import { useMarketplaceViewModel } from "../../viewmodels/useMarketplaceViewModel";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { colors, ink, typography } from "../../theme/tokens";
import { marketplace as copy } from "../../content/copy";
import type { MarketplaceStackParamList } from "../../navigation/MarketplaceStack";

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, "Marketplace">;

const CATEGORY_TABS: { key: Category | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "cards", label: "Cards" },
  { key: "watches", label: "Watches" },
];

/**
 * Browse split from My Listings at the top (mockup 12a) so a seller never has to leave the
 * marketplace to check their own book. "My Listings" is filtered client-side by username —
 * `/listings` is a public, unauthenticated-friendly browse endpoint with no seller filter, and
 * `Listing.seller.id` is deliberately an opaque public id rather than the caller's own profile
 * id, so username is the only real signal available to match "is this mine" here.
 */
export function MarketplaceScreen() {
  const navigation = useNavigation<Nav>();
  const session = useSessionViewModel();
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [category, setCategory] = useState<Category | null>(null);
  const vm = useMarketplaceViewModel(category ?? undefined);

  const listings = useMemo(() => {
    if (tab === "browse") return vm.listings;
    if (!session.profile?.username) return [];
    return vm.listings.filter((l) => l.seller.username === session.profile!.username);
  }, [vm.listings, tab, session.profile]);

  const mineCount = useMemo(
    () => (session.profile?.username ? vm.listings.filter((l) => l.seller.username === session.profile!.username).length : 0),
    [vm.listings, session.profile]
  );

  return (
    <View style={styles.fill}>
      {/* Bounded to the fixed header+toggle+filter rows (never scrolls) rather than the whole
          screen — a full-screen wash here would stay pinned behind the grid's scrolled rows too. */}
      <LinearGradient colors={["rgba(177,75,255,0.24)", "transparent"]} style={styles.base} />
      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>
        {session.balanceCents != null && (
          <View style={styles.balancePill}>
            <LinearGradient colors={["#FFE27A", "#E0A016"]} style={styles.coin} />
            <Text style={styles.balanceText}>{(session.balanceCents / 100).toLocaleString()}</Text>
          </View>
        )}
      </View>

      <View style={styles.toggleRow}>
        <Pressable style={styles.toggleBtn} onPress={() => setTab("browse")}>
          {tab === "browse" ? (
            <LinearGradient colors={["#B14BFF", "#5B1FD6"]} style={styles.toggleFill}>
              <Text style={styles.toggleLabelActive}>{copy.browse}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.toggleInactive}>
              <Text style={styles.toggleLabel}>{copy.browse}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.toggleBtn} onPress={() => setTab("mine")}>
          {tab === "mine" ? (
            <LinearGradient colors={["#B14BFF", "#5B1FD6"]} style={styles.toggleFill}>
              <Text style={styles.toggleLabelActive}>{copy.myListings}</Text>
              {mineCount > 0 && <Badge n={mineCount} />}
            </LinearGradient>
          ) : (
            <View style={styles.toggleInactive}>
              <Text style={styles.toggleLabel}>{copy.myListings}</Text>
              {mineCount > 0 && <Badge n={mineCount} />}
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        {CATEGORY_TABS.map((c) => (
          <Pressable key={c.label} style={[styles.chip, category === c.key && styles.chipActive]} onPress={() => setCategory(c.key)}>
            <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {vm.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l: Listing) => l.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <Text style={styles.empty}>{tab === "browse" ? copy.empty : copy.myListingsEmpty}</Text>
          }
          renderItem={({ item: listing }: { item: Listing }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ListingDetail", { listing })}
            >
              {listing.item.category === "watches" ? (
                <View style={styles.watchCardFace}>
                  <WatchDial art={itemArtGradient(listing.item)} size={110} />
                </View>
              ) : (
                <CardFace gradient={itemArtGradient(listing.item)} width={cellWidth} height={132} style={styles.cellFace} />
              )}
              <Text style={styles.cardName} numberOfLines={1}>
                {(listing.item.cardTitle ?? listing.item.watchName ?? listing.item.name).toUpperCase()}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {listing.item.collection ?? listing.item.brand ?? ""}
              </Text>
              <Text style={styles.cardPrice}>${(listing.priceCents / 100).toLocaleString()}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{n}</Text>
    </View>
  );
}

const cellWidth = 160;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  base: { position: "absolute", top: 0, left: 0, right: 0, height: 320 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: typography.heroWordmark,
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
  toggleRow: { flexDirection: "row", gap: 5, paddingHorizontal: 20, paddingTop: 18 },
  toggleBtn: { flex: 1, height: 42 },
  toggleFill: { flex: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  toggleInactive: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  toggleLabel: { ...typography.chipLabel, fontSize: 13.5, color: "rgba(255,255,255,0.55)" },
  toggleLabelActive: { ...typography.chipLabel, fontSize: 13.5, color: "#fff" },
  badge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: "#FF5C7A",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { ...typography.footNote, fontWeight: "900" as const, color: "#fff", fontSize: 10.5 },
  chipRow: { flexDirection: "row", gap: 7, paddingHorizontal: 20, paddingTop: 14 },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: "rgba(177,75,255,0.24)", borderColor: "rgba(177,75,255,0.6)" },
  chipText: { ...typography.metaLine, fontSize: 11.5, color: "rgba(255,255,255,0.55)" },
  chipTextActive: { color: "#E0C4FF" },
  loading: { marginTop: 60 },
  grid: { padding: 20, gap: 12 },
  gridRow: { gap: 12 },
  card: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 9,
  },
  cellFace: { width: "100%" },
  watchCardFace: { height: 132, alignItems: "center", justifyContent: "center" },
  cardName: { ...typography.footNote, fontWeight: "800" as const, color: "#fff", marginTop: 9, fontSize: 11.5 },
  cardSub: { ...typography.footNote, marginTop: 2, fontSize: 10 },
  cardPrice: { ...typography.title, fontSize: 16, marginTop: 7 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 60, width: "100%" },
});

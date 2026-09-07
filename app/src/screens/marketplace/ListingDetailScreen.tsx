import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { useSessionViewModel } from "../../viewmodels/useSessionViewModel";
import { useListingViewModel } from "../../viewmodels/useListingViewModel";
import { useRarityTiers } from "../../viewmodels/useRarityTiers";
import { useTabBarClearance } from "../../navigation/tabBarVisibility";
import { colors, ink, typography } from "../../theme/tokens";
import { listingDetail as copy } from "../../content/copy";
import type { MarketplaceStackParamList } from "../../navigation/MarketplaceStack";

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, "ListingDetail">;
type Route = RouteProp<MarketplaceStackParamList, "ListingDetail">;

export function ListingDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { listing } = useRoute<Route>().params;
  const item = listing.item;
  const isWatch = item.category === "watches";
  // Admin-configurable (rarity_tiers table) — this used to be a hardcoded "Common"/"Rare"/
  // "Chase" map that didn't even match the real tier names ("Core"/"Prime"/"Grail" etc.).
  const rarityTiers = useRarityTiers(item.category);
  const session = useSessionViewModel();
  const { isWorking, delist } = useListingViewModel();
  const isMine = session.profile?.username != null && session.profile.username === listing.seller.username;
  const tabBarClearance = useTabBarClearance();

  async function handleDelist() {
    const result = await delist(listing.id);
    if (result.ok) navigation.goBack();
    else Alert.alert("Couldn't delist", result.error);
  }

  return (
    <View style={styles.fill}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 160 + tabBarClearance }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Wash lives in content coordinates, not as a screen-fixed sibling — a fixed wash
            would stay pinned to the viewport as the header/hero scroll away, bleeding into
            whatever section (seller card, actions) scrolls into that same screen region. */}
        <View style={styles.washWrap}>
          <LinearGradient
            colors={[isWatch ? "rgba(242,196,107,0.2)" : "rgba(177,75,255,0.24)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
              <View style={styles.backChevron} />
            </Pressable>
            <Text style={styles.headerLabel}>LISTING</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.heroWrap}>
            {isWatch ? (
              <WatchDial art={itemArtGradient(item)} size={150} />
            ) : (
              <CardFace
                gradient={itemArtGradient(item)}
                width={174}
                height={243}
                borderColor="rgba(255,215,94,0.75)"
                badge={(rarityTiers[item.rarityTierLevel]?.name ?? "").toUpperCase()}
                style={styles.rotatedFace}
              />
            )}
          </View>

          <Text style={styles.name}>{(item.cardTitle ?? item.watchName ?? item.name).toUpperCase()}</Text>
          <Text style={styles.sub}>{[item.collection ?? item.brand, item.style].filter(Boolean).join(" · ")}</Text>
        </View>

        <View style={styles.info}>

          <View style={styles.askRow}>
            <View>
              <Text style={styles.askLabel}>{copy.ask}</Text>
              <Text style={styles.askValue}>${(listing.priceCents / 100).toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.seller.username ? `@${listing.seller.username}` : "Collector"}</Text>
              <Text style={styles.sellerMeta}>{copy.from(listing.seller.username)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { bottom: tabBarClearance }]}>
        {isMine ? (
          <Pressable style={styles.delistButton} onPress={handleDelist} disabled={isWorking}>
            {isWorking ? <ActivityIndicator color="#FF8DA1" /> : <Text style={styles.delistLabel}>CANCEL LISTING</Text>}
          </Pressable>
        ) : (
          <Pressable style={styles.buyButton} onPress={() => navigation.navigate("BuyListing", { listing })}>
            <LinearGradient colors={isWatch ? ["#FFD75E", "#E08A16"] : ["#B14BFF", "#5B1FD6"]} style={StyleSheet.absoluteFill} />
            <Text style={[styles.buyLabel, isWatch && { color: "#2A1706" }]}>{copy.buyNow}</Text>
            <View style={styles.buyPricePill}>
              <Text style={[styles.buyPriceText, isWatch && { color: "#2A1706" }]}>
                ${(listing.priceCents / 100).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  scroll: { paddingBottom: 160 },
  washWrap: { position: "relative" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 38,
    height: 38,
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
  headerLabel: { ...typography.eyebrow, letterSpacing: 2.4 },
  heroWrap: { alignItems: "center", paddingTop: 16 },
  rotatedFace: { transform: [{ rotate: "-3deg" }] },
  info: { paddingHorizontal: 22, paddingTop: 18 },
  name: { ...typography.pageHeading, fontSize: 30, textAlign: "center", paddingHorizontal: 22 },
  sub: { ...typography.sectionSub, marginTop: 5, textAlign: "center", paddingHorizontal: 22 },
  askRow: { alignItems: "center", marginTop: 18 },
  askLabel: typography.eyebrow,
  askValue: { ...typography.heroWordmark, fontSize: 34, marginTop: 3 },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 20,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sellerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.violetTop },
  sellerInfo: { flex: 1, minWidth: 0 },
  sellerName: { ...typography.body, fontSize: 13 },
  sellerMeta: { ...typography.footNote, marginTop: 1 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 22 },
  buyButton: {
    height: 60,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    overflow: "hidden",
  },
  buyLabel: { ...typography.buttonLabel, color: "#fff" },
  buyPricePill: { height: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.22)", justifyContent: "center" },
  buyPriceText: { ...typography.chipLabel, fontSize: 14, color: "#fff" },
  delistButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,92,122,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,92,122,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  delistLabel: { ...typography.chipLabel, fontSize: 14, color: "#FF8DA1" },
});

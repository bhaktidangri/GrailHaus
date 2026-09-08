import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp, type CompositeNavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Category, PackSku } from "@grailhaus/shared";
import { useSessionViewModel } from "../viewmodels/useSessionViewModel";
import { useShelfViewModel } from "../viewmodels/useShelfViewModel";
import { useAuthStore } from "../state/authStore";
import { PackTile, ART_GRADIENT, TIER_LABEL, HERO_TIER } from "../components/PackTile";
import { PackFace } from "../components/PackFace";
import { CategorySwitch } from "../components/CategorySwitch";
import { useHideTabBarOnScroll, useTabBarClearance } from "../navigation/tabBarVisibility";
import { fonts, ink, typography } from "../theme/tokens";
import { brand, shelf as shelfCopy, packTile as packTileCopy } from "../content/copy";
import type { RootTabParamList } from "../navigation/RootTabs";
import type { HomeStackParamList } from "../navigation/HomeStack";
import type { AppStackParamList } from "../navigation/AppNavigator";

const REGISTER: Record<Category, { label: string; wash: [string, string] }> = {
  cards: { label: shelfCopy.categoryLabel.cards, wash: ["rgba(177,75,255,0.24)", "transparent"] },
  watches: { label: shelfCopy.categoryLabel.watches, wash: ["rgba(242,196,107,0.2)", "transparent"] },
};

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList>,
  CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList, "World">,
    BottomTabNavigationProp<RootTabParamList>
  >
>;

/**
 * "World" — a single category's shelf, reached through a door on Home or
 * flipped in place with the Cards/Watches switch (per the final "full app"
 * mockup pass, which puts the switch on the shelf itself rather than only
 * on Home's doors). Switching calls `setParams` rather than pushing a new
 * route, so there's still exactly one World screen on the stack. View only:
 * no fetch calls, no business logic — everything comes from the viewmodels
 * below. Both categories drill into their own detail screen from here now —
 * cards into PackDetail, watches into VaultDetail — neither buys straight
 * off this list.
 */
export function ShelfScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { category } = useRoute<RouteProp<HomeStackParamList, "World">>().params;
  const session = useSessionViewModel();
  const shelf = useShelfViewModel(category);
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const scrollHandler = useHideTabBarOnScroll();
  const tabBarClearance = useTabBarClearance();

  const register = REGISTER[category];

  const priceRange = useMemo(() => {
    if (shelf.packs.length === 0) return null;
    const prices = shelf.packs.map((p) => p.priceCents).sort((a, b) => a - b);
    return { min: prices[0], max: prices[prices.length - 1] };
  }, [shelf.packs]);

  return (
    <View style={styles.fill}>
      {/* Bounded to the fixed header+heading area (never scrolls) rather than the whole screen
          — a full-screen wash here would stay pinned behind the scrolled tier cards too. */}
      <LinearGradient colors={register.wash} style={styles.base} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brand}>
          <View style={styles.brandChip}>
            <Image source={require("../../assets/icon.png")} style={styles.brandIcon} />
          </View>
          <Text style={styles.brandText}>{brand.name}</Text>
        </View>
        {session.isSignedIn ? (
          session.balanceCents != null && (
            <View style={styles.balancePill}>
              <LinearGradient colors={["#FFE27A", "#E0A016"]} style={styles.coin} />
              <Text style={styles.balanceText}>{(session.balanceCents / 100).toLocaleString()}</Text>
            </View>
          )
        ) : (
          <Pressable style={styles.signInChip} onPress={() => requireAuth(() => {})}>
            <Text style={styles.signInText}>{shelfCopy.signIn}</Text>
          </Pressable>
        )}
      </View>

      <CategorySwitch value={category} onChange={(next) => navigation.setParams({ category: next })} />

      <View style={styles.heading}>
        {category === "cards" ? (
          <>
            <Text style={styles.eyebrow}>{shelfCopy.explorePacks.eyebrow}</Text>
            <Text style={styles.headingTitle}>{shelfCopy.explorePacks.heading}</Text>
            <Text style={styles.headingSub}>{shelfCopy.explorePacks.sub}</Text>
          </>
        ) : (
          <>
            <Text style={styles.headingTitle}>{register.label}</Text>
            <Text style={styles.headingSub}>
              {priceRange
                ? shelfCopy.priceRangeSub(
                    (priceRange.min / 100).toLocaleString(),
                    (priceRange.max / 100).toLocaleString()
                  )
                : " "}
            </Text>
          </>
        )}
      </View>

      {shelf.error && <Text style={styles.error}>{shelfCopy.serverUnreachable(shelf.error)}</Text>}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {category === "cards"
          ? shelf.packs.map((sku) => (
              <TierRow key={sku.id} sku={sku} onPress={() => navigation.navigate("PackDetail", { skuId: sku.id })} />
            ))
          : shelf.packs.map((sku) => (
              <PackTile key={sku.id} sku={sku} onBuy={() => navigation.navigate("VaultDetail", { skuId: sku.id })} />
            ))}
        {!shelf.isLoading && shelf.packs.length === 0 && <Text style={styles.empty}>{shelfCopy.emptyPacks}</Text>}

        {category === "cards" && shelf.packs.length > 0 && (
          <>
            <View style={styles.trustNote}>
              <View style={styles.trustCheck}>
                <Ionicons name="checkmark" size={14} color="#8BF285" />
              </View>
              <Text style={styles.trustNoteText}>{shelfCopy.explorePacks.trustNote}</Text>
            </View>
            <Pressable onPress={() => navigation.navigate("Portfolio")}>
              <Text style={styles.collectionLink}>{shelfCopy.explorePacks.collectionLink}</Text>
            </Pressable>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

/** One row in "Pick your tier" — the middle (hero) tier gets a highlighted
 * border/shadow and a floating "MOST OPENED" tag, per the mockup. */
function TierRow({ sku, onPress }: { sku: PackSku; onPress: () => void }) {
  const isFeatured = HERO_TIER.has(sku.tier);
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.street_rip;

  return (
    <Pressable onPress={onPress} style={[styles.tierRow, isFeatured && styles.tierRowFeatured]}>
      {isFeatured && (
        <View style={styles.mostOpenedTag}>
          <Text style={styles.mostOpenedText}>{shelfCopy.explorePacks.mostOpened}</Text>
        </View>
      )}
      <View style={styles.tierRowArt}>
        <PackFace art={art} width={76} height={104} radius={10} />
      </View>
      <View style={styles.tierRowInfo}>
        <Text style={styles.tierRowEyebrow}>{TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase()}</Text>
        <Text style={styles.tierRowName} numberOfLines={1}>
          {sku.name}
        </Text>
        <Text style={styles.tierRowSub}>{packTileCopy.countLabel(sku.category, sku.itemCount)}</Text>
        <View style={styles.tierRowPriceRow}>
          <Text style={styles.tierRowPrice}>${(sku.priceCents / 100).toLocaleString()}</Text>
          {sku.stockRemaining != null && (
            <Text style={styles.tierRowStock}>
              {sku.stockRemaining} {shelfCopy.explorePacks.leftSuffix}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  base: { position: "absolute", top: 0, left: 0, right: 0, height: 240 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandChip: { width: 26, height: 26, borderRadius: 8, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.14)" },
  brandIcon: { width: "100%", height: "100%" },
  brandText: typography.navBrand,
  balancePill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  coin: { width: 14, height: 14, borderRadius: 7 },
  balanceText: typography.countMain,
  signInChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(177,75,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: typography.chipLabel,
  heading: { paddingHorizontal: 20, paddingTop: 20 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, color: "rgba(255,255,255,0.55)" },
  headingTitle: { fontFamily: fonts.black, fontSize: 30, letterSpacing: -0.9, lineHeight: 32, color: ink.text, marginTop: 4 },
  headingSub: { ...typography.sectionSub, marginTop: 4 },
  scroll: { flex: 1 },
  list: { padding: 20, paddingTop: 16, gap: 12, paddingBottom: 40 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 32 },
  error: {
    ...typography.errorText,
    paddingHorizontal: 20,
    marginTop: 8,
  },

  tierRow: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
  },
  tierRowFeatured: {
    borderColor: "rgba(177,75,255,0.5)",
    shadowColor: "#B14BFF",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 6,
    marginTop: 10,
  },
  mostOpenedTag: {
    position: "absolute",
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    height: 19,
    borderRadius: 999,
    backgroundColor: "rgba(177,75,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  mostOpenedText: { fontFamily: fonts.extrabold, fontSize: 9, letterSpacing: 0.6, color: "#fff" },
  tierRowArt: { flexShrink: 0 },
  tierRowInfo: { flex: 1, minWidth: 0, justifyContent: "center" },
  tierRowEyebrow: typography.tierPill,
  tierRowName: { ...typography.packNameHero, fontSize: 20, marginTop: 6 },
  tierRowSub: { ...typography.packSub, marginTop: 4 },
  tierRowPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 8 },
  tierRowPrice: { fontFamily: fonts.black, fontSize: 20, color: ink.text },
  tierRowStock: { ...typography.footNote },

  trustNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  trustCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(99,232,92,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustNoteText: { ...typography.packSub, flex: 1 },
  collectionLink: {
    ...typography.linkMuted,
    color: "#C99BFF",
    textAlign: "center",
    marginTop: 4,
  },
});

import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp, type CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Category, PackSku } from "@grailhaus/shared";
import { useSessionViewModel } from "../viewmodels/useSessionViewModel";
import { useShelfViewModel } from "../viewmodels/useShelfViewModel";
import { useRevealViewModel } from "../viewmodels/useRevealViewModel";
import { useAuthStore } from "../state/authStore";
import { PackTile } from "../components/PackTile";
import { RadialGlow } from "../components/RadialGlow";
import { BuySheet } from "../components/BuySheet";
import { useHideTabBarOnScroll } from "../navigation/tabBarVisibility";
import { colors, typography } from "../theme/tokens";
import { shelf as shelfCopy } from "../content/copy";
import type { RootTabParamList } from "../navigation/RootTabs";
import type { HomeStackParamList } from "../navigation/HomeStack";

const REGISTER: Record<Category, { label: string; glow: string }> = {
  cards: { label: shelfCopy.categoryLabel.cards, glow: "177,75,255" },
  watches: { label: shelfCopy.categoryLabel.watches, glow: "242,196,107" },
};

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, "World">,
  BottomTabNavigationProp<RootTabParamList>
>;

/**
 * "World" — a single category, fully committed, reached only through a door
 * on Home. No switch here: the mockup never lets you flip categories once
 * you're inside a world, only from Home's two doors. View only: no fetch
 * calls, no business logic — everything comes from the viewmodels below.
 */
export function ShelfScreen() {
  const navigation = useNavigation<Nav>();
  const { category } = useRoute<RouteProp<HomeStackParamList, "World">>().params;
  const [sheetSku, setSheetSku] = useState<PackSku | null>(null);
  const session = useSessionViewModel();
  const shelf = useShelfViewModel(category);
  const reveal = useRevealViewModel();
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const scrollHandler = useHideTabBarOnScroll();
  // A ref, not state: a rapid double-tap must be blocked before React's next render, or both
  // taps mint their own idempotency key and become two real, separately-charged purchases —
  // the key only protects a retry of the *same* attempt, not two distinct ones.
  const isRippingRef = useRef(false);

  const register = REGISTER[category];

  const priceRange = useMemo(() => {
    if (shelf.packs.length === 0) return null;
    const prices = shelf.packs.map((p) => p.priceCents).sort((a, b) => a - b);
    return { min: prices[0], max: prices[prices.length - 1] };
  }, [shelf.packs]);

  function handleConfirm(quantity: 1 | 10) {
    const sku = sheetSku;
    if (!sku) return;
    // Browsing a world never requires a session — only the moment of intent does.
    requireAuth(async () => {
      if (isRippingRef.current) return;
      isRippingRef.current = true;
      try {
        const result = await reveal.startReveal(sku, quantity);
        if (result.ok) {
          setSheetSku(null);
          navigation.navigate("Reveal");
        } else {
          Alert.alert("Couldn't rip that pack", result.error);
        }
      } finally {
        isRippingRef.current = false;
      }
    });
  }

  return (
    <View style={styles.fill}>
      <View style={styles.base} />
      <RadialGlow rgb={register.glow} peakOpacity={0.26} top="-6%" size={520} />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
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

      <View style={styles.heading}>
        <Text style={styles.headingTitle}>{register.label}</Text>
        <Text style={styles.headingSub}>
          {priceRange
            ? shelfCopy.priceRangeSub(
                (priceRange.min / 100).toLocaleString(),
                (priceRange.max / 100).toLocaleString()
              )
            : " "}
        </Text>
      </View>

      {shelf.error && <Text style={styles.error}>{shelfCopy.serverUnreachable(shelf.error)}</Text>}

      <Animated.FlatList
        style={styles.flatList}
        data={shelf.packs}
        keyExtractor={(sku: PackSku) => sku.id}
        contentContainerStyle={styles.list}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={({ item }: { item: PackSku }) => (
          <PackTile sku={item} onPress={() => setSheetSku(item)} disabled={reveal.isPurchasing} />
        )}
        ListEmptyComponent={!shelf.isLoading ? <Text style={styles.empty}>{shelfCopy.emptyPacks}</Text> : null}
      />

      <BuySheet
        visible={sheetSku != null}
        sku={sheetSku}
        balanceCents={session.balanceCents}
        isPurchasing={reveal.isPurchasing}
        onClose={() => setSheetSku(null)}
        onConfirm={handleConfirm}
      />
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
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
  signInChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(177,75,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: typography.chipLabel,
  heading: { paddingHorizontal: 20, paddingTop: 20 },
  headingTitle: typography.pageHeading,
  headingSub: { ...typography.sectionSub, marginTop: 4 },
  flatList: { flex: 1 },
  list: { padding: 20, paddingTop: 16, gap: 12 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 32 },
  error: {
    ...typography.errorText,
    paddingHorizontal: 20,
    marginTop: 8,
  },
});

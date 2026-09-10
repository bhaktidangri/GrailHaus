import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PackSku } from "@grailhaus/shared";
import { useSessionViewModel } from "../viewmodels/useSessionViewModel";
import { useExploreViewModel } from "../viewmodels/useExploreViewModel";
import { useDiscoverAllCategoriesViewModel, type DiscoverItem } from "../viewmodels/useDiscoverViewModel";
import { useCategoriesViewModel } from "../viewmodels/useCategoriesViewModel";
import { useAuthStore } from "../state/authStore";
import { PackTile, ART_GRADIENT, tierLabel, HERO_TIER } from "../components/PackTile";
import { PackFace } from "../components/PackFace";
import { CardFace } from "../components/CardFace";
import { WatchDial } from "../components/WatchDial";
import { itemArtGradient } from "../content/cardArt";
import { useHideTabBarOnScroll } from "../navigation/tabBarVisibility";
import { fonts, ink, typography } from "../theme/tokens";
import { brand, explore as copy, packTile as packTileCopy } from "../content/copy";
import type { RootTabParamList } from "../navigation/RootTabs";
import type { AppStackParamList } from "../navigation/AppNavigator";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
>;

/**
 * Replaces the old idle "Reveal" tab (empty unless a purchase was already
 * in flight) with a real browse entry point: both categories' evergreen
 * catalog, straight off GET /packs, in one place. Both drill into their own
 * detail screen before a purchase — cards into PackDetail, watches into
 * VaultDetail — like Shelf's own tier rows already do.
 */
export function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const session = useSessionViewModel();
  const catalog = useExploreViewModel();
  const { categories } = useCategoriesViewModel();
  const discover = useDiscoverAllCategoriesViewModel();
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const scrollHandler = useHideTabBarOnScroll();

  return (
    <View style={styles.fill}>
      <LinearGradient colors={["rgba(177,75,255,0.16)", "transparent"]} style={styles.base} />

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
            <Text style={styles.signInText}>{copy.signIn}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.headingTitle}>{copy.heading}</Text>
        <Text style={styles.headingSub}>{copy.sub}</Text>
      </View>

      {catalog.error && <Text style={styles.error}>{copy.serverUnreachable(catalog.error)}</Text>}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* One section per real category (not a hardcoded Cards/Watches pair) — cards keeps its
            own multi-pull TierRow treatment, every other category (watches, and anything added
            after, e.g. handbags) shares the single-box PackTile treatment, same fallback rule
            ShelfScreen's own pack list already uses. */}
        {categories.map((c) => {
          const skus = catalog.byCategory[c.id] ?? [];
          return (
            <Section key={c.id} title={c.label}>
              {skus.length > 0 ? (
                c.id === "cards" ? (
                  skus.map((sku) => (
                    <TierRow key={sku.id} sku={sku} onPress={() => navigation.navigate("PackDetail", { skuId: sku.id })} />
                  ))
                ) : (
                  skus.map((sku) => (
                    <PackTile key={sku.id} sku={sku} onBuy={() => navigation.navigate("VaultDetail", { skuId: sku.id })} />
                  ))
                )
              ) : !catalog.isLoading ? (
                <Text style={styles.empty}>{copy.emptySection(c.label)}</Text>
              ) : null}
            </Section>
          );
        })}

        {categories.map((c) => {
          const catalog = discover.byCategory[c.id];
          return (
            <Section key={c.id} title={copy.allOf(c.label, catalog?.items.length ?? 0)}>
              <CatalogGrid
                category={c.id}
                items={catalog?.items ?? []}
                isLoading={discover.isLoading}
                emptyLabel={copy.emptySection(c.label)}
                onPress={(item) => navigation.navigate("ItemFork", { category: c.id, item })}
              />
            </Section>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/** Same compact/hero tier row as Shelf's cards column, duplicated locally
 * rather than shared — Explore's row has no "MOST OPENED" featured styling
 * since it's showing every tier across both categories at once, not one
 * category's own pick-your-tier list. */
function TierRow({ sku, onPress }: { sku: PackSku; onPress: () => void }) {
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.street_rip;
  const isHero = HERO_TIER.has(sku.tier);

  return (
    <Pressable onPress={onPress} style={[styles.tierRow, isHero && styles.tierRowFeatured]}>
      <PackFace art={art} width={64} height={88} radius={10} />
      <View style={styles.tierRowInfo}>
        <Text style={styles.tierRowEyebrow}>{tierLabel(sku)}</Text>
        <Text style={styles.tierRowName} numberOfLines={1}>
          {sku.name}
        </Text>
        <Text style={styles.tierRowSub}>{packTileCopy.countLabel(sku.category, sku.itemCount)}</Text>
        <View style={styles.tierRowPriceRow}>
          <Text style={styles.tierRowPrice}>${(sku.priceCents / 100).toLocaleString()}</Text>
          {sku.stockRemaining != null && <Text style={styles.tierRowStock}>{sku.stockRemaining} left</Text>}
        </View>
      </View>
    </Pressable>
  );
}

/** The full individual-item catalog (every printing/model, not just the 3 buyable pack
 * tiers) — plain wrapped grid rather than a virtualized FlatList since every face here is a
 * cheap gradient, not an image; simplest thing that shows all of it. Browse-only: tapping
 * opens ItemFork (chase it in a pack vs. buy the exact one), same destination Discover's own
 * drill-down already uses — an individual card/watch isn't itself purchasable, only the pack
 * that can drop it is. */
function CatalogGrid({
  category,
  items,
  isLoading,
  emptyLabel,
  onPress,
}: {
  category: string;
  items: DiscoverItem[];
  isLoading: boolean;
  emptyLabel: string;
  onPress: (item: DiscoverItem) => void;
}) {
  if (items.length === 0) {
    return !isLoading ? <Text style={styles.empty}>{emptyLabel}</Text> : null;
  }
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <CatalogCell key={item.detail.id} category={category} item={item} onPress={() => onPress(item)} />
      ))}
    </View>
  );
}

function CatalogCell({
  category,
  item,
  onPress,
}: {
  category: string;
  item: DiscoverItem;
  onPress: () => void;
}) {
  const detail = item.detail;
  return (
    <Pressable onPress={onPress} style={styles.cell}>
      {/* Cards keeps its own rectangular card-face art; every other category shares the
          watch-dial treatment as a generic fallback — same rule as the rest of this pass. */}
      {category === "cards" ? (
        <CardFace gradient={itemArtGradient(detail)} imageUrl={detail.textureUrl} width={64} height={89} />
      ) : (
        <WatchDial art={itemArtGradient(detail)} size={64} />
      )}
      {/* Cards: lead with the Pokémon identity (what you're browsing for), the print name
          (cardTitle) is the secondary line — same split ItemFork's own heading/subheading use,
          just swapped since a printing name alone ("Black Forecast") isn't scannable without
          knowing which Pokémon it belongs to. Flat fallback chain (not a category check) for the
          primary line, so a category with neither pokemonName nor watchName (e.g. handbags)
          still shows its real catalog name instead of going blank. */}
      <Text style={styles.cellName} numberOfLines={1}>
        {detail.pokemonName ?? detail.watchName ?? detail.name}
      </Text>
      {category === "cards" && detail.cardTitle && (
        <Text style={styles.cellSub} numberOfLines={1}>
          {detail.cardTitle}
        </Text>
      )}
      <Text style={styles.cellPrice}>${(detail.currentValueCents / 100).toLocaleString()}</Text>
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
  list: { padding: 20, paddingTop: 16, gap: 28, paddingBottom: 40 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 12 },
  error: { ...typography.errorText, paddingHorizontal: 20, marginTop: 8 },

  section: { gap: 12 },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: -0.2, color: ink.text },
  sectionBody: { gap: 12 },

  tierRow: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
  },
  tierRowFeatured: { borderColor: "rgba(177,75,255,0.5)" },
  tierRowInfo: { flex: 1, minWidth: 0, justifyContent: "center" },
  tierRowEyebrow: typography.tierPill,
  tierRowName: { ...typography.packNameHero, fontSize: 18, marginTop: 5 },
  tierRowSub: { ...typography.packSub, marginTop: 3 },
  tierRowPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 7 },
  tierRowPrice: { fontFamily: fonts.black, fontSize: 18, color: ink.text },
  tierRowStock: { ...typography.footNote },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: {
    width: 92,
    padding: 8,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cellName: { fontFamily: fonts.semibold, fontSize: 10.5, color: ink.text, marginTop: 7, textAlign: "center" },
  cellSub: { fontFamily: fonts.medium, fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 1, textAlign: "center" },
  cellPrice: { fontFamily: fonts.bold, fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 },
});

import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { OwnedItem } from "@grailhaus/shared";
import { useSessionViewModel } from "../../viewmodels/useSessionViewModel";
import { useCollectionViewModel } from "../../viewmodels/useCollectionViewModel";
import { useTabBarClearance } from "../../navigation/tabBarVisibility";
import { SignInPrompt } from "../../components/SignInPrompt";
import { GlossyButton } from "../../components/GlossyButton";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { accents, colors, shadow, spacing, typography } from "../../theme/tokens";
import { collection as copy } from "../../content/copy";
import type { CollectionStackParamList } from "../../navigation/CollectionStack";

const HOLDINGS_PREVIEW_COUNT = 8;

type Nav = NativeStackNavigationProp<CollectionStackParamList, "Collection">;
/** Reaches the Explore tab from this screen — Portfolio's own stack has no route for it, so
 * this jumps up to the root tab navigator the same way RevealScreen/ItemForkScreen already do
 * for the same kind of cross-tab hop. */
function rootNavigateExplore(navigation: Nav) {
  (navigation.navigate as (name: string, params?: object) => void)("Tabs", { screen: "Explore" });
}

/**
 * The Portfolio tab's root — a fork, not a tab bar (mockup 13a): two doors, each carrying its
 * own count and value, because cards and watches are read completely differently below this
 * point (a binder vs a vault). Every number here comes straight off `/me/portfolio` — nothing
 * is invented to fill the mockup's "+1.84%" style day-over-day badge, since a portfolio-level
 * change figure isn't something the API tracks.
 */
export function CollectionScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const session = useSessionViewModel();
  const vm = useCollectionViewModel();
  const tabBarClearance = useTabBarClearance();

  const categories = (vm.cards.length > 0 ? 1 : 0) + (vm.watches.length > 0 ? 1 : 0);

  // Highest-value holdings first — a portfolio's whole point is showing what you actually hold,
  // not just a count and a door to tap through for it. Real ownership order (by current value),
  // not the arbitrary order /me/portfolio happens to return.
  const topCards = useMemo(
    () => [...vm.cards].sort((a, b) => b.item.currentValueCents - a.item.currentValueCents).slice(0, HOLDINGS_PREVIEW_COUNT),
    [vm.cards]
  );
  const topWatches = useMemo(
    () => [...vm.watches].sort((a, b) => b.item.currentValueCents - a.item.currentValueCents).slice(0, HOLDINGS_PREVIEW_COUNT),
    [vm.watches]
  );

  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={["rgba(177,75,255,0.2)", colors.bg, "#04010A"]}
        locations={[0, 0.42, 1]}
        style={styles.base}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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

      {!vm.isSignedIn ? (
        <SignInPrompt title={copy.signInTitle} body={copy.signInBody} />
      ) : vm.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : vm.owned.length === 0 ? (
        <EmptyCollectionState onExplore={() => rootNavigateExplore(navigation)} />
      ) : (
        // A plain non-scrolling View here meant the Vault door's bottom (including its CTA
        // button) could sit underneath the floating tab bar on shorter screens, with no way to
        // scroll past it — this content is real and often taller than one screen once both
        // doors are showing.
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarClearance }]} showsVerticalScrollIndicator={false}>
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
            <>
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

              <HoldingsPreview
                title={copy.topCards}
                accentColor="#E0C4FF"
                category="cards"
                items={topCards}
                totalCount={vm.cards.length}
                onPressItem={(owned) => navigation.navigate("CardDetail", { owned })}
                onSeeAll={() => navigation.navigate("Binder", undefined)}
              />
            </>
          )}

          {vm.watches.length > 0 && (
            <>
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

              <HoldingsPreview
                title={copy.topWatches}
                accentColor="#F2C46B"
                category="watches"
                items={topWatches}
                totalCount={vm.watches.length}
                onPressItem={(owned) => navigation.navigate("WatchDetail", { owned })}
                onSeeAll={() => navigation.navigate("Vault")}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/** The doors alone (a count + a button) never actually showed a single real card or watch —
 * this is what makes the hub read as a portfolio rather than a menu: the highest-value pieces
 * you actually hold, with real art, right here, one tap from their own detail page. */
function HoldingsPreview({
  title,
  accentColor,
  category,
  items,
  totalCount,
  onPressItem,
  onSeeAll,
}: {
  title: string;
  accentColor: string;
  category: "cards" | "watches";
  items: OwnedItem[];
  totalCount: number;
  onPressItem: (owned: OwnedItem) => void;
  onSeeAll: () => void;
}) {
  return (
    <View style={styles.previewSection}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>{title}</Text>
        {totalCount > items.length && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={[styles.previewSeeAll, { color: accentColor }]}>{copy.seeAllCount(totalCount)}</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
        {items.map((owned) => (
          <Pressable key={owned.ownedItemId} style={styles.previewCell} onPress={() => onPressItem(owned)}>
            {category === "watches" ? (
              <WatchDial art={itemArtGradient(owned.item)} size={84} />
            ) : (
              <CardFace gradient={itemArtGradient(owned.item)} imageUrl={owned.item.textureUrl} width={84} height={117} />
            )}
            <Text style={styles.previewName} numberOfLines={1}>
              {(owned.item.cardTitle ?? owned.item.watchName ?? owned.item.name).toUpperCase()}
            </Text>
            <Text style={styles.previewValue}>${(owned.item.currentValueCents / 100).toLocaleString()}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Was a single line of small muted text floating in empty space — easy to miss entirely
 * against the dark background, and gave a signed-in-but-nothing-owned-yet collector no way to
 * act on it. Matches SignInPrompt's structure (icon → title → body → real CTA) for the other
 * "nothing here yet" state this screen can land on. */
function EmptyCollectionState({ onExplore }: { onExplore: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <LinearGradient colors={[accents.cards.top, accents.cards.bottom]} style={[styles.emptyBadge, shadow.glow(accents.cards.glow)]}>
        <Ionicons name="gift-outline" size={30} color={colors.textPrimary} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
      <Text style={styles.empty}>{copy.empty}</Text>
      <View style={styles.emptyButton}>
        <GlossyButton label={copy.emptyCta} onPress={onExplore} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  base: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
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
  emptyWrap: { alignItems: "center", paddingHorizontal: 32, marginTop: 56, gap: 10 },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.title, textAlign: "center" },
  empty: { ...typography.sectionSub, textAlign: "center" },
  emptyButton: { width: "100%", marginTop: 14 },
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

  previewSection: { marginTop: -2, gap: 10 },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewTitle: { fontFamily: typography.title.fontFamily, fontSize: 15, color: colors.textPrimary },
  previewSeeAll: { ...typography.linkMuted, fontSize: 12.5 },
  previewRow: { gap: 12, paddingRight: 4 },
  previewCell: { width: 84 },
  previewName: { ...typography.footNote, color: colors.textPrimary, marginTop: 7 },
  previewValue: { ...typography.footNote, color: colors.textMuted, marginTop: 1 },
});

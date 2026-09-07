import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Category } from "@grailhaus/shared";
import { useSessionViewModel } from "../viewmodels/useSessionViewModel";
import { useHomeViewModel } from "../viewmodels/useHomeViewModel";
import { useHideTabBarOnScroll } from "../navigation/tabBarVisibility";
import { useAuthStore } from "../state/authStore";
import { useOnboardingStore } from "../state/onboardingStore";
import { resetOnboarding } from "../lib/onboarding";
import { PackFace } from "../components/PackFace";
import { WatchDial } from "../components/WatchDial";
import { Countdown } from "../components/Countdown";
import { ART_GRADIENT, TIER_LABEL } from "../components/PackTile";
import type { DropView } from "../viewmodels/useDropsViewModel";
import { accents, colors, ink, spacing, typography } from "../theme/tokens";
import { brand, shelf as shelfCopy, home as copy } from "../content/copy";
import type { RootTabParamList } from "../navigation/RootTabs";
import type { HomeStackParamList } from "../navigation/HomeStack";
import type { AppStackParamList } from "../navigation/AppNavigator";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, "Home">,
  CompositeNavigationProp<BottomTabNavigationProp<RootTabParamList>, NativeStackNavigationProp<AppStackParamList>>
>;

/**
 * The dashboard — the mockup's "seven engagements, then the three doors"
 * screen (turn 14a). Two sections (Featured Drop, Upcoming Drops) are real,
 * drawn from the same `PackSku` data as Shelf/Drops. The other three
 * (Recently Revealed, Collection Progress, Marketplace Highlights) have no
 * backing data yet — Portfolio and Marketplace aren't built — so they render
 * as honest empty states rather than invented numbers.
 */
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const session = useSessionViewModel();
  const home = useHomeViewModel();
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const setNeedsOnboarding = useOnboardingStore((s) => s.setNeedsOnboarding);
  const scrollHandler = useHideTabBarOnScroll();

  function handleReplayOnboarding() {
    if (!__DEV__) return;
    resetOnboarding();
    setNeedsOnboarding(true);
  }

  return (
    <View style={styles.fill}>
      <View style={[styles.header, home.featuredDrop && styles.headerLive]}>
        <Pressable style={styles.brand} onLongPress={handleReplayOnboarding} disabled={!__DEV__}>
          <View style={styles.brandChip}>
            <Image source={require("../../assets/icon.png")} style={styles.brandIcon} />
          </View>
          <Text style={styles.brandText}>{brand.name}</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <View style={styles.iconButton}>
            <View style={styles.iconGlyph} />
            <View style={styles.iconDot} />
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
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* A gentle, low-opacity ambient wash behind the *whole* scroll content — not the
            page's raw near-black token on its own, which reads as flat blue-black once nothing
            else is layered on top of it. Kept subtle and content-relative (scrolls with
            everything, sized generously rather than to any one section) so it can't bleed into
            or fight with the richer, self-contained gradients on the cards sitting above it. */}
        <View style={styles.scrollInner}>
          <LinearGradient colors={["rgba(177,75,255,0.12)", "transparent"]} style={styles.ambientWash} />

          {home.featuredDrop && (
            <FeaturedDropCard
              drop={home.featuredDrop}
              onPress={() => navigation.navigate("DropDetail", { packId: home.featuredDrop!.sku.id })}
            />
          )}

          <View style={styles.doors}>
            <DoorCard
              category="cards"
              summary={home.evergreenByCategory.cards}
              onPress={() => navigation.navigate("World", { category: "cards" })}
            />
            <DoorCard
              category="watches"
              summary={home.evergreenByCategory.watches}
              onPress={() => navigation.navigate("World", { category: "watches" })}
            />
          </View>

          {home.upcomingDrops.length > 0 && (
            <Section title={copy.upcomingDrops.title}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingRow}>
                {home.upcomingDrops.map((d) => (
                  <UpcomingDropCard key={d.sku.id} drop={d} />
                ))}
              </ScrollView>
            </Section>
          )}

          <Section title={copy.recentlyRevealed.title} sub={copy.recentlyRevealed.sub} actionLabel={copy.recentlyRevealed.action}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.revealedRow}>
              {SAMPLE_RECENT_PULLS.map((pull) => (
                <RecentPullCard key={pull.handle} pull={pull} />
              ))}
              <View style={styles.revealedMore}>
                <Text style={styles.revealedMoreText}>+41</Text>
              </View>
            </ScrollView>
          </Section>

          <Section
            title={copy.collectionProgress.title}
            actionLabel={copy.collectionProgress.action}
            onAction={() => navigation.navigate("Portfolio")}
          >
            <CollectionProgressCard />
          </Section>

          <Section
            title={copy.marketplaceHighlights.title}
            actionLabel={copy.marketplaceHighlights.action}
            onAction={() => navigation.navigate("Marketplace")}
          >
            <View style={{ gap: spacing.sm }}>
              {SAMPLE_LISTINGS.map((listing) => (
                <ListingRow key={listing.name} listing={listing} />
              ))}
            </View>
          </Section>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function FeaturedDropCard({ drop, onPress }: { drop: DropView; onPress: () => void }) {
  const { sku } = drop;
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.obsidian_vault;
  const remaining = sku.stockRemaining;
  const max = sku.maxStock;
  const pips = max != null && max > 0 && max <= 20 ? max : null;
  const filledPips = pips != null && remaining != null ? Math.round((remaining / max!) * pips) : 0;

  return (
    <View>
      <View style={styles.featuredEyebrowRow}>
        <View style={styles.liveDot} />
        <Text style={styles.featuredEyebrow}>{copy.featuredDrop.eyebrow}</Text>
      </View>

      <View style={styles.featured}>
        <LinearGradient
          colors={["rgba(255,92,122,0.3)", "rgba(90,12,32,0.5)", "rgba(10,6,20,0.85)"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.featuredArt} pointerEvents="none">
          <View style={[styles.featuredArtCard, { transform: [{ rotate: "6deg" }] }]}>
            <PackFace art={art} width={74} height={104} radius={11} />
          </View>
          <View style={[styles.featuredArtCard, styles.featuredArtCardBack, { transform: [{ rotate: "-8deg" }] }]}>
            <PackFace art={art} width={74} height={104} radius={11} />
          </View>
        </View>

        <Text style={styles.featuredKicker}>
          {sku.category.toUpperCase()} · {TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase()}
        </Text>
        <Text style={styles.featuredName}>{sku.name}</Text>
        <Text style={styles.featuredSub}>
          {sku.itemCount} {sku.category === "cards" ? "cards" : "watch"} · ${(sku.priceCents / 100).toLocaleString()}
        </Text>

        {remaining != null && max != null && (
          <View style={styles.featuredStockRow}>
            <View style={styles.leftPill}>
              <Text style={styles.leftPillLabel}>LEFT</Text>
              <Text style={styles.leftPillValue}>{copy.featuredDrop.left(remaining, max)}</Text>
            </View>
          </View>
        )}

        {pips != null && (
          <View style={styles.pipRow}>
            {Array.from({ length: pips }).map((_, i) => (
              <View key={i} style={[styles.pip, i < filledPips ? styles.pipFilled : styles.pipEmpty]} />
            ))}
          </View>
        )}

        <Pressable onPress={onPress} style={styles.featuredCta}>
          <Text style={styles.featuredCtaLabel}>{copy.featuredDrop.cta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DoorCard({
  category,
  summary,
  onPress,
}: {
  category: Category;
  summary: { tierCount: number; fromPriceCents: number | null };
  onPress: () => void;
}) {
  const accent = accents[category];
  const art = category === "cards" ? ART_GRADIENT.vault_break : ART_GRADIENT.obsidian_vault;

  return (
    <Pressable onPress={onPress} style={[styles.door, { borderColor: `${accent.top}70` }]}>
      <LinearGradient colors={[`${accent.top}33`, `${accent.bottom}1a`]} style={StyleSheet.absoluteFill} />
      <View style={styles.doorArt} pointerEvents="none">
        {category === "cards" ? (
          <View style={{ transform: [{ rotate: "-10deg" }] }}>
            <PackFace art={art} width={54} height={75} radius={9} />
          </View>
        ) : (
          <WatchDial art={art} size={58} />
        )}
      </View>
      <Text style={[styles.doorEyebrow, { color: accent.top }]}>{copy.door.eyebrow}</Text>
      <Text style={styles.doorName}>{shelfCopy.categoryLabel[category]}</Text>
      <Text style={styles.doorSub}>
        {summary.tierCount > 0
          ? `${copy.door.tiersLabel(summary.tierCount)} · ${copy.door.fromPrice(summary.fromPriceCents ?? 0)}`
          : copy.door.comingSoon}
      </Text>
    </Pressable>
  );
}

function UpcomingDropCard({ drop }: { drop: DropView }) {
  const { sku } = drop;
  const accent = accents[sku.category];

  return (
    <View style={styles.upcoming}>
      <View style={styles.upcomingKickerRow}>
        <View style={[styles.upcomingDot, { backgroundColor: accent.top }]} />
        <Text style={styles.upcomingKicker}>{sku.category.toUpperCase()}</Text>
      </View>
      <Text style={styles.upcomingName} numberOfLines={1}>
        {sku.name}
      </Text>
      <Text style={styles.upcomingSub}>
        {sku.maxStock != null ? `${copy.upcomingDrops.units(sku.maxStock)} · ` : ""}$
        {(sku.priceCents / 100).toLocaleString()}
      </Text>
      <View style={styles.upcomingFooter}>
        {sku.goesLiveAt && <Countdown target={sku.goesLiveAt} color={accent.top} />}
        <View style={styles.notifyChip}>
          <Text style={[styles.notifyLabel, { color: accent.top }]}>{copy.upcomingDrops.notify}</Text>
        </View>
      </View>
    </View>
  );
}

function Section({
  title,
  sub,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  sub?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {sub && <Text style={styles.sectionSub}>{sub}</Text>}
        </View>
        {actionLabel &&
          (onAction ? (
            <Pressable onPress={onAction}>
              <Text style={styles.sectionAction}>{actionLabel}</Text>
            </Pressable>
          ) : (
            <Text style={styles.sectionAction}>{actionLabel}</Text>
          ))}
      </View>
      {children}
    </View>
  );
}

/**
 * SAMPLE DATA — visual placeholder only. There's no live-activity feed, no
 * portfolio endpoint wired into the app, and no marketplace listings yet;
 * these three constants exist purely to show the intended layout and get
 * swapped for real queries once Portfolio/Marketplace/an activity feed ship.
 */
const SAMPLE_RECENT_PULLS: {
  handle: string;
  badge: "CHASE" | "GRAIL" | null;
  priceLabel: string;
  timeLabel: string;
  art: [string, string];
}[] = [
  { handle: "@vaultrat", badge: "CHASE", priceLabel: "$4,120", timeLabel: "2m", art: ART_GRADIENT.black_label },
  { handle: "@toploader", badge: null, priceLabel: "$910", timeLabel: "9m", art: ART_GRADIENT.street_rip },
  { handle: "@heirloom", badge: "GRAIL", priceLabel: "$11,400", timeLabel: "14m", art: ART_GRADIENT.reserve },
];

const SAMPLE_COLLECTION = {
  totalLabel: "$35,143",
  deltaLabel: "+1.84%",
  sets: [
    { name: "Prism Core", current: 7, total: 9, note: "2 slots left · Prism badge at 9", art: accents.cards },
    { name: "Glacier Seal", current: 18, total: 24, note: null, art: { top: "#59D8FF", bottom: "#1668D8" } },
  ],
};

const SAMPLE_LISTINGS: {
  name: string;
  meta: string;
  priceLabel: string;
  deltaLabel: string;
  deltaColor: string;
  category: Category;
  art: [string, string];
}[] = [
  {
    name: "VEILWROUGHT",
    meta: "Holo · 6 listed · fills your slot 08",
    priceLabel: "$640",
    deltaLabel: "−12% vs comp",
    deltaColor: "#8BF285",
    category: "cards",
    art: ART_GRADIENT.vault_break,
  },
  {
    name: "Black Bay 58",
    meta: "Tudor · 2 offers on yours",
    priceLabel: "$3,400",
    deltaLabel: "your listing",
    deltaColor: "#F2C46B",
    category: "watches",
    art: ART_GRADIENT.archive,
  },
];

function RecentPullCard({ pull }: { pull: (typeof SAMPLE_RECENT_PULLS)[number] }) {
  return (
    <View style={styles.pullCard}>
      <View style={styles.pullArtWrap}>
        <PackFace art={pull.art} width={96} height={116} radius={12} />
        {pull.badge && (
          <View style={styles.pullBadge}>
            <Text style={[styles.pullBadgeText, pull.badge === "GRAIL" && { color: "#E4E4E4" }]}>{pull.badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.pullHandle}>{pull.handle}</Text>
      <Text style={styles.pullMeta}>
        {pull.priceLabel} · {pull.timeLabel}
      </Text>
    </View>
  );
}

function CollectionProgressCard() {
  return (
    <View style={styles.collectionCard}>
      <View style={styles.collectionHeaderRow}>
        <View>
          <Text style={styles.collectionEyebrow}>PORTFOLIO</Text>
          <Text style={styles.collectionValue}>{SAMPLE_COLLECTION.totalLabel}</Text>
        </View>
        <View style={styles.collectionDeltaPill}>
          <Text style={styles.collectionDeltaText}>{SAMPLE_COLLECTION.deltaLabel}</Text>
        </View>
      </View>
      <View style={styles.collectionDivider} />
      <View style={{ gap: spacing.md }}>
        {SAMPLE_COLLECTION.sets.map((set) => (
          <View key={set.name}>
            <View style={styles.setRow}>
              <Text style={styles.setName}>{set.name}</Text>
              <Text style={styles.setProgress}>
                {set.current} / {set.total}
              </Text>
            </View>
            <View style={styles.setTrack}>
              <LinearGradient
                colors={[set.art.top, set.art.bottom]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.setFill, { width: `${(set.current / set.total) * 100}%` }]}
              />
            </View>
            {set.note && <Text style={styles.setNote}>{set.note}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

function ListingRow({ listing }: { listing: (typeof SAMPLE_LISTINGS)[number] }) {
  return (
    <View style={styles.listingRow}>
      {listing.category === "watches" ? (
        <WatchDial art={listing.art} size={44} />
      ) : (
        <PackFace art={listing.art} width={42} height={58} radius={8} />
      )}
      <View style={styles.listingInfo}>
        <Text style={styles.listingName}>{listing.name}</Text>
        <Text style={styles.listingMeta}>{listing.meta}</Text>
      </View>
      <View style={styles.listingPriceWrap}>
        <Text style={styles.listingPrice}>{listing.priceLabel}</Text>
        <Text style={[styles.listingDelta, { color: listing.deltaColor }]}>{listing.deltaLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // A flat tint, not a gradient — the header never scrolls, so it can't fall prey to the same
  // screen-vs-content-coordinate bug the hero wash below had to be fixed for.
  headerLive: { backgroundColor: "rgba(255,92,122,0.1)" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandChip: { width: 26, height: 26, borderRadius: 8, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.14)" },
  brandIcon: { width: "100%", height: "100%" },
  brandText: typography.navBrand,
  headerRight: { flexDirection: "row", alignItems: "center", gap: 9 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: { width: 13, height: 13, borderRadius: 4, borderWidth: 2, borderColor: "rgba(255,255,255,0.7)" },
  iconDot: {
    position: "absolute",
    right: -1,
    top: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: ink.ground,
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

  scroll: { padding: 20, paddingTop: 20, paddingBottom: 40 },
  scrollInner: { position: "relative", gap: spacing.xl },
  ambientWash: { position: "absolute", top: -20, left: -20, right: -20, height: 900 },

  featuredEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  featuredEyebrow: { ...typography.eyebrow, color: "#FF8DA1" },
  featured: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,92,122,0.45)",
    padding: 18,
    overflow: "hidden",
  },
  featuredArt: { position: "absolute", right: 14, top: 26, flexDirection: "row" },
  featuredArtCard: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  featuredArtCardBack: { marginLeft: -30 },
  featuredKicker: { ...typography.eyebrow, color: "rgba(255,255,255,0.7)", maxWidth: 190 },
  featuredName: { ...typography.pageHeading, fontSize: 30, lineHeight: 32, marginTop: spacing.sm, maxWidth: 200 },
  featuredSub: { ...typography.packSub, marginTop: spacing.sm, maxWidth: 200 },
  featuredStockRow: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: spacing.lg },
  leftPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leftPillLabel: { ...typography.footNote, letterSpacing: 1.4 },
  leftPillValue: { ...typography.countMain, color: "#F2C46B" },
  pipRow: { flexDirection: "row", gap: 4, marginTop: spacing.md },
  pip: { flex: 1, height: 6, borderRadius: 4 },
  pipFilled: { backgroundColor: "#F2C46B" },
  pipEmpty: { backgroundColor: "rgba(255,255,255,0.14)" },
  featuredCta: {
    height: 54,
    borderRadius: 16,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "#C4183C",
    shadowColor: "#000",
    shadowOpacity: 0.36,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 0,
  },
  featuredCtaLabel: { ...typography.chunkyButtonLabel, letterSpacing: 0.8 },

  doors: { flexDirection: "row", gap: spacing.md },
  door: {
    flex: 1,
    minHeight: 118,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 15,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  doorArt: { position: "absolute", right: -10, bottom: -6, opacity: 0.85 },
  doorEyebrow: { ...typography.eyebrow, letterSpacing: 2 },
  doorName: { ...typography.packNameHero, fontSize: 22, marginTop: 6 },
  doorSub: { ...typography.packSub, marginTop: 5 },

  section: { gap: spacing.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sectionHeaderText: { flex: 1, minWidth: 0 },
  sectionTitle: { ...typography.title, color: ink.text },
  sectionSub: { ...typography.sectionSub, marginTop: 2 },
  sectionAction: { ...typography.linkMuted, color: "#C99BFF" },
  upcomingRow: { gap: spacing.md },
  upcoming: {
    width: 168,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 13,
  },
  upcomingKickerRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  upcomingDot: { width: 6, height: 6, borderRadius: 3 },
  upcomingKicker: { ...typography.eyebrow, fontSize: 9, letterSpacing: 1.6 },
  upcomingName: { ...typography.packName, marginTop: 8 },
  upcomingSub: { ...typography.packSub, marginTop: 3 },
  upcomingFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11 },
  notifyChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifyLabel: { ...typography.footNote, letterSpacing: 0.6 },

  revealedRow: { gap: spacing.sm },
  pullCard: { width: 96 },
  pullArtWrap: { position: "relative" },
  pullBadge: {
    position: "absolute",
    left: 5,
    top: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  pullBadgeText: { ...typography.tierPill, fontSize: 7, color: "#FFD75E" },
  pullHandle: { ...typography.footNote, color: ink.text, marginTop: 7 },
  pullMeta: { ...typography.footNote, marginTop: 1 },
  revealedMore: {
    width: 56,
    height: 116,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  revealedMoreText: { ...typography.chipLabel, color: ink.textMuted },

  collectionCard: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    padding: 18,
  },
  collectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  collectionEyebrow: { ...typography.eyebrow, letterSpacing: 1.6 },
  collectionValue: { ...typography.pageHeading, fontSize: 30, marginTop: 6 },
  collectionDeltaPill: {
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(99,232,92,0.2)",
    borderWidth: 1,
    borderColor: "rgba(99,232,92,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  collectionDeltaText: { ...typography.chipLabel, color: "#8BF285" },
  collectionDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 14 },
  setRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  setName: { ...typography.body, color: ink.text },
  setProgress: { ...typography.chipLabel, color: "#8BF285" },
  setTrack: { height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 6, overflow: "hidden" },
  setFill: { height: "100%", borderRadius: 4 },
  setNote: { ...typography.footNote, marginTop: 5 },

  listingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 11,
  },
  listingInfo: { flex: 1, minWidth: 0 },
  listingName: { ...typography.chipLabel, color: ink.text },
  listingMeta: { ...typography.footNote, marginTop: 2 },
  listingPriceWrap: { alignItems: "flex-end", flexShrink: 0 },
  listingPrice: { ...typography.chipLabel, color: ink.text },
  listingDelta: { ...typography.footNote, marginTop: 2 },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useDropsViewModel, type DropPhase, type DropView } from "../viewmodels/useDropsViewModel";
import { useHideTabBarOnScroll } from "../navigation/tabBarVisibility";
import { PackFace } from "../components/PackFace";
import { WatchDial } from "../components/WatchDial";
import { StockBar } from "../components/StockBar";
import { Countdown } from "../components/Countdown";
import { ART_GRADIENT, TIER_LABEL } from "../components/PackTile";
import { colors, ink, spacing, typography } from "../theme/tokens";
import { drops as copy } from "../content/copy";
import type { AppStackParamList } from "../navigation/AppNavigator";

type Nav = NativeStackNavigationProp<AppStackParamList>;

const PHASE_CHROME: Record<DropPhase, { eyebrow: string; eyebrowColor: string; dim: boolean }> = {
  soon: { eyebrow: copy.soon.eyebrow, eyebrowColor: "rgba(255,255,255,0.62)", dim: true },
  live: { eyebrow: copy.live.eyebrow, eyebrowColor: colors.danger, dim: false },
  closed: { eyebrow: copy.closed.eyebrow, eyebrowColor: "rgba(255,255,255,0.4)", dim: true },
};

/** Real screen for the Drops tab — every "drop" is just a `PackSku` with a
 * `goesLiveAt` (see useDropsViewModel), rendered as one of three states.
 * Tapping any card opens the rich Drop Detail screen (odds, countdown, the
 * claim flow) — the same destination Home's featured card links to, so
 * there's exactly one place a drop's purchase actually happens. */
export function DropsScreen() {
  const navigation = useNavigation<Nav>();
  const { drops, isLoading, error } = useDropsViewModel();
  const scrollHandler = useHideTabBarOnScroll();

  return (
    <View style={styles.fill}>
      {/* Bounded to the fixed header (never scrolls) rather than the whole screen — a
          full-screen wash here would stay pinned behind the FlatList's scrolled rows too. */}
      <LinearGradient colors={["rgba(255,92,122,0.2)", "transparent"]} style={styles.base} />
      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Animated.FlatList
        data={drops}
        keyExtractor={(d: DropView) => d.sku.id}
        contentContainerStyle={styles.list}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={({ item }: { item: DropView }) => (
          <DropCard drop={item} onPress={() => navigation.navigate("DropDetail", { packId: item.sku.id })} />
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>{copy.empty}</Text> : null}
      />
    </View>
  );
}

function DropCard({ drop, onPress }: { drop: DropView; onPress: () => void }) {
  const { sku, phase } = drop;
  const chrome = PHASE_CHROME[phase];
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.street_rip;
  const canBuy = phase === "live";

  return (
    <Pressable onPress={onPress} style={[styles.card, chrome.dim && styles.cardDim]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.eyebrow, { color: chrome.eyebrowColor }]}>{chrome.eyebrow}</Text>
        <Text style={styles.tierLabel}>{TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase()}</Text>
      </View>

      <View style={styles.artWrap}>
        {sku.category === "watches" ? (
          <WatchDial art={art} size={110} />
        ) : (
          <PackFace art={art} width={100} height={138} radius={14} crimp />
        )}
      </View>

      <Text style={styles.name}>{sku.name}</Text>
      <Text style={styles.price}>${(sku.priceCents / 100).toLocaleString()}</Text>

      {phase === "soon" && sku.goesLiveAt && (
        <View style={styles.countdownRow}>
          <Text style={styles.countdownLabel}>{copy.soon.label}</Text>
          <Countdown target={sku.goesLiveAt} />
        </View>
      )}

      {phase === "live" && (
        <StockBar
          remaining={sku.stockRemaining}
          max={sku.maxStock}
          label={sku.stockRemaining != null ? `${sku.stockRemaining} ${copy.live.label}` : undefined}
        />
      )}

      {phase === "closed" && <Text style={styles.closedNote}>{copy.closed.label}</Text>}

      {canBuy && (
        <Text style={styles.buyLink}>{sku.category === "watches" ? "CHOOSE THIS BOX" : "CLAIM ONE"}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  base: { position: "absolute", top: 0, left: 0, right: 0, height: 180 },
  header: { paddingTop: 56, paddingHorizontal: 20 },
  title: typography.pageHeading,
  list: { padding: 20, paddingTop: 16, gap: 14 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 32 },
  error: { ...typography.errorText, paddingHorizontal: 20, marginTop: 8 },

  card: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 20,
    alignItems: "center",
  },
  cardDim: { opacity: 0.7 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },
  eyebrow: typography.eyebrow,
  tierLabel: typography.tierPill,
  artWrap: { marginTop: spacing.lg, marginBottom: spacing.md },
  name: { ...typography.packNameHero, textAlign: "center" },
  price: { ...typography.display, marginTop: 6, color: ink.text },
  countdownRow: { alignItems: "center", marginTop: spacing.lg, gap: 4 },
  countdownLabel: typography.footNote,
  closedNote: { ...typography.footNote, marginTop: spacing.lg },
  buyLink: { ...typography.chipLabel, marginTop: spacing.lg, letterSpacing: 1 },
});

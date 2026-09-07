import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  useNavigation,
  useRoute,
  type RouteProp,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useDropDetailViewModel } from "../viewmodels/useDropDetailViewModel";
import { useSessionViewModel } from "../viewmodels/useSessionViewModel";
import { useRevealViewModel } from "../viewmodels/useRevealViewModel";
import { useAuthStore } from "../state/authStore";
import { PackFace } from "../components/PackFace";
import { Countdown } from "../components/Countdown";
import { BuySheet } from "../components/BuySheet";
import { ART_GRADIENT, TIER_LABEL } from "../components/PackTile";
import { colors, ink, spacing, typography } from "../theme/tokens";
import { drops as dropsCopy, dropDetail as copy } from "../content/copy";
import type { RootTabParamList } from "../navigation/RootTabs";
import type { AppStackParamList } from "../navigation/AppNavigator";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList, "DropDetail">,
  BottomTabNavigationProp<RootTabParamList>
>;

export function DropDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { packId } = useRoute<RouteProp<AppStackParamList, "DropDetail">>().params;
  const { drop } = useDropDetailViewModel(packId);
  const session = useSessionViewModel();
  const reveal = useRevealViewModel();
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isRippingRef = useRef(false);

  function handleConfirm(quantity: 1 | 10) {
    if (!drop) return;
    const sku = drop.sku;
    requireAuth(async () => {
      if (isRippingRef.current) return;
      isRippingRef.current = true;
      try {
        const result = await reveal.startReveal(sku, quantity);
        if (result.ok) {
          setSheetOpen(false);
          navigation.navigate("Reveal");
        } else {
          Alert.alert("Couldn't claim that drop", result.error);
        }
      } finally {
        isRippingRef.current = false;
      }
    });
  }

  if (!drop) {
    return <View style={styles.fill} />;
  }

  const { sku, phase } = drop;
  const art = ART_GRADIENT[sku.tier] ?? (sku.category === "watches" ? ART_GRADIENT.obsidian_vault : ART_GRADIENT.street_rip);
  const finalSlot = sku.slotProbabilities[sku.slotProbabilities.length - 1] ?? null;
  const oddsRows = finalSlot
    ? sku.rarityTiers
        .slice()
        .sort((a, b) => b.level - a.level)
        .map((tier) => ({ tier, percent: finalSlot.probabilities[tier.level] ?? 0 }))
    : [];
  const pips = sku.maxStock != null && sku.maxStock > 0 && sku.maxStock <= 20 ? sku.maxStock : null;
  const filledPips =
    pips != null && sku.stockRemaining != null ? Math.round((sku.stockRemaining / sku.maxStock!) * pips) : 0;

  const isWatch = sku.category === "watches";
  const washColor = isWatch ? "rgba(242,196,107,0.2)" : "rgba(177,75,255,0.24)";
  const headerTint = isWatch ? "rgba(242,196,107,0.1)" : "rgba(177,75,255,0.12)";

  return (
    <View style={styles.fill}>
      <View style={[styles.header, { backgroundColor: headerTint }]}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
        <View style={styles.headerEyebrowRow}>
          {phase === "live" && <View style={styles.liveDot} />}
          <Text style={styles.headerEyebrow}>{PHASE_EYEBROW[phase]}</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Wash lives here, in content coordinates, not as a screen-fixed sibling — otherwise
            it stays pinned to the viewport as you scroll and bleeds into whatever section
            (odds, footer) happens to scroll into that same screen region. */}
        <View style={styles.heroWrap}>
          <LinearGradient colors={[washColor, "transparent"]} style={StyleSheet.absoluteFill} />

          <View style={styles.hero}>
            <View style={[styles.heroCard, styles.heroCardSide, { transform: [{ rotate: "-8deg" }] }]}>
              <PackFace art={art} width={108} height={150} radius={12} />
            </View>
            <View style={[styles.heroCard, styles.heroCardCenter]}>
              <PackFace art={art} width={128} height={178} radius={14} />
            </View>
            <View style={[styles.heroCard, styles.heroCardSide, { transform: [{ rotate: "8deg" }] }]}>
              <PackFace art={art} width={108} height={150} radius={12} />
            </View>
          </View>

          <Text style={styles.kicker}>
            {sku.category.toUpperCase()} · {TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase()}
          </Text>
          <Text style={styles.title}>{sku.name}</Text>
          <Text style={styles.body}>{copy.body(sku)}</Text>
        </View>

        <View style={styles.statPanel}>
          {phase === "soon" && sku.goesLiveAt ? (
            <View style={styles.statRow}>
              <View>
                <Text style={styles.statLabel}>{copy.goesLiveIn}</Text>
                <Countdown target={sku.goesLiveAt} color={ink.text} />
              </View>
              <View style={styles.statRight}>
                <Text style={styles.statLabel}>{copy.perBox}</Text>
                <Text style={styles.statValue}>${(sku.priceCents / 100).toLocaleString()}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.statRow}>
              <View>
                <Text style={styles.statLabel}>{copy.remaining}</Text>
                <View style={styles.remainingRow}>
                  <Text style={styles.remainingValue}>{sku.stockRemaining ?? "—"}</Text>
                  <Text style={styles.remainingMax}> / {sku.maxStock ?? "—"}</Text>
                </View>
              </View>
              <View style={styles.statRight}>
                <Text style={styles.statLabel}>{copy.perBox}</Text>
                <Text style={styles.statValue}>${(sku.priceCents / 100).toLocaleString()}</Text>
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
        </View>

        {oddsRows.length > 0 && (
          <View style={styles.oddsSection}>
            <Text style={styles.oddsTitle}>{copy.whatIsInside}</Text>
            {oddsRows.map(({ tier, percent }) => (
              <View key={tier.level} style={styles.oddsRow}>
                <Text style={[styles.oddsPercent, { color: tier.colorHex }]}>{percent.toFixed(1)}%</Text>
                <View style={styles.oddsTrack}>
                  <View style={[styles.oddsFill, { width: `${Math.max(percent, 1.5)}%`, backgroundColor: tier.colorHex }]} />
                </View>
                <Text style={styles.oddsTierName}>{tier.name}</Text>
              </View>
            ))}
          </View>
        )}

        {phase === "closed" && <Text style={styles.closedNote}>{dropsCopy.closed.label}</Text>}
      </ScrollView>

      {phase === "live" && (
        <View style={styles.footer}>
          <Pressable onPress={() => setSheetOpen(true)} style={styles.claimButton}>
            <Text style={styles.claimLabel}>{copy.claim}</Text>
            <View style={styles.claimPricePill}>
              <Text style={styles.claimPrice}>${(sku.priceCents / 100).toLocaleString()}</Text>
            </View>
          </Pressable>
          <Text style={styles.fairnessNote}>{copy.fairness}</Text>
        </View>
      )}

      <BuySheet
        visible={sheetOpen}
        sku={sheetOpen ? sku : null}
        balanceCents={session.balanceCents}
        isPurchasing={reveal.isPurchasing}
        onClose={() => setSheetOpen(false)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const PHASE_EYEBROW: Record<"soon" | "live" | "closed", string> = {
  soon: "NOT YET LIVE",
  live: "LIVE NOW",
  closed: "SOLD OUT",
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
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
  headerEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  headerEyebrow: { ...typography.eyebrow, color: "#FF8DA1" },

  scroll: { padding: 20, paddingBottom: 40, gap: spacing.lg },
  heroWrap: { position: "relative", gap: spacing.lg },
  hero: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.md },
  heroCard: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  heroCardSide: { opacity: 0.7 },
  heroCardCenter: { marginHorizontal: -12, zIndex: 1 },

  kicker: { ...typography.eyebrow, marginTop: spacing.lg },
  title: { ...typography.pageHeading, fontSize: 34, lineHeight: 36, marginTop: spacing.sm },
  body: { ...typography.paragraph, marginTop: spacing.md },

  statPanel: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 18,
    marginTop: spacing.md,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  statRight: { alignItems: "flex-end" },
  statLabel: { ...typography.footNote, letterSpacing: 1.4 },
  statValue: { ...typography.pageHeading, fontSize: 26, marginTop: 5 },
  remainingRow: { flexDirection: "row", alignItems: "baseline", marginTop: 5 },
  remainingValue: { ...typography.pageHeading, fontSize: 32, color: "#F2C46B" },
  remainingMax: { ...typography.body, color: ink.textMuted },
  pipRow: { flexDirection: "row", gap: 4, marginTop: spacing.md },
  pip: { flex: 1, height: 6, borderRadius: 4 },
  pipFilled: { backgroundColor: "#F2C46B" },
  pipEmpty: { backgroundColor: "rgba(255,255,255,0.14)" },

  oddsSection: { marginTop: spacing.md, gap: spacing.md },
  oddsTitle: { ...typography.eyebrow },
  oddsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  oddsPercent: { ...typography.body, width: 46 },
  oddsTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  oddsFill: { height: "100%", borderRadius: 4 },
  oddsTierName: { ...typography.body, color: ink.text, width: 82, textAlign: "right" },

  closedNote: { ...typography.footNote, textAlign: "center", marginTop: spacing.lg },

  footer: { padding: 20, paddingTop: 0, gap: spacing.sm },
  claimButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F2C46B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
  },
  claimLabel: { ...typography.chunkyButtonLabel, color: "#2A1706", textShadowColor: "transparent" },
  claimPricePill: { height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.22)" },
  claimPrice: { ...typography.body, color: "#2A1706" },
  fairnessNote: { ...typography.footNote, textAlign: "center" },
});

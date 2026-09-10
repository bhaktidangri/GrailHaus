import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Canvas } from "@react-three/fiber/native";
import type { OwnedItem, PulledOwnedItem, RarityTier } from "@grailhaus/shared";
import type { CategoryRevealConfig, RevealPhase } from "./types";
import { GestureLayer } from "./GestureLayer";
import { TiltLights } from "./TiltLights";
import { useDeviceTilt } from "./useDeviceTilt";
import { playHapticTrack } from "./HapticsTrack";
import { usePackFlowStore } from "../../state/packFlowStore";
import { radii, spacing, typography } from "../../theme/tokens";
import { RarityBadge } from "../../components/RarityBadge";
import { Price } from "../../components/Price";
import { vaultFlow as copy } from "../../content/copy";

interface RevealEngineProps {
  config: CategoryRevealConfig;
  items: PulledOwnedItem[];
  rarityTiers: RarityTier[];
  packId: string;
  purchaseId: string | null;
  packPriceCents?: number;
  onViewDetails: (owned: OwnedItem) => void;
  onKeep: () => void;
  onListForSale: (owned: OwnedItem) => void;
}

/**
 * The reveal is its own dark, focused world regardless of the bright shell
 * around it (Shelf, nav) — it deliberately does not read shell theme
 * colors, only spacing/radii scale. Text/accent colors here are fixed, not
 * sourced from theme/tokens.ts.
 */
const reveal = {
  textPrimary: "#f5f0e6",
  textSecondary: "#a89fc4",
  accent: "#f4c94f",
  success: "#5ec49a",
  danger: "#e0705f",
  surface: "#1d1d28",
  border: "#3a3550",
  background: "#0b0b10",
};

function resolveTier(rarityTiers: RarityTier[], level: number): RarityTier {
  return (
    rarityTiers.find((t) => t.level === level) ?? {
      level: level as RarityTier["level"],
      name: "Unknown",
      colorHex: "#888888",
      valueMinCents: 0,
      valueMaxCents: 0,
    }
  );
}

/**
 * Written once, shared by every category. A category personality is
 * entirely `config` — geometry, materials, lighting, camera, timing,
 * haptics, gesture feel, pacing order. Adding a category means writing a
 * new CategoryRevealConfig, not touching this file. Rarity names/colors
 * come from `rarityTiers` (admin-configurable data), never hardcoded here.
 */
export function RevealEngine({
  config,
  items,
  rarityTiers,
  packId,
  purchaseId,
  packPriceCents,
  onViewDetails,
  onKeep,
  onListForSale,
}: RevealEngineProps) {
  // True only for a flow reconstructed from disk after a process death mid-reveal (see
  // lib/activeReveal.ts and state/packFlowStore.ts) — never a fresh purchase. Watches only ever
  // pull one item, so there's no per-card beat to skip past here, just the single tear/lift
  // gesture and its opening hold; landing directly on the summary is still the right call, since
  // the alternative (re-showing an unopened box for an item that's already sitting in the user's
  // portfolio) would look like re-gifting something they already unwrapped.
  const resumedToSummary = usePackFlowStore((s) => s.resumedToSummary);
  const tilt = useDeviceTilt();
  const orderedItems = useMemo(() => config.revealOrder(items), [items, config]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<RevealPhase>(resumedToSummary ? "summary" : "idle");
  const [beatLabel, setBeatLabel] = useState<string | null>(null);

  const maxTierLevel = useMemo(() => Math.max(...rarityTiers.map((t) => t.level), 1), [rarityTiers]);

  const current = orderedItems[index];
  const currentTier = current ? resolveTier(rarityTiers, current.rarityTierLevel) : null;
  const isRare = current?.rarityTierLevel === maxTierLevel;

  useEffect(() => {
    if (phase !== "opening" || !current) return;
    const cancel = playHapticTrack(config.hapticTrack(phase, isRare));
    const holdMs = isRare ? config.timing.rareHoldMs : config.timing.commonBeatMs;
    // A slower, narrated version of the same gesture/hold — not a new phase, just labels laid
    // over the existing duration (see CategoryRevealConfig.openingBeats).
    const beats = config.openingBeats?.(isRare) ?? [];
    setBeatLabel(beats[0]?.label ?? null);
    const beatTimers = beats.slice(1).map((beat) => setTimeout(() => setBeatLabel(beat.label), beat.atMs));
    const timer = setTimeout(() => setPhase("settled"), holdMs);
    return () => {
      cancel();
      beatTimers.forEach(clearTimeout);
      clearTimeout(timer);
    };
  }, [phase, current, isRare, config]);

  useEffect(() => {
    if (phase !== "settled") return;
    const timer = setTimeout(() => {
      if (index + 1 < orderedItems.length) {
        setIndex((i) => i + 1);
        setPhase("idle");
      } else {
        setPhase("summary");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, index, orderedItems.length]);

  if (phase === "summary" || !current || !currentTier) {
    return (
      <SummaryView
        items={orderedItems}
        rarityTiers={rarityTiers}
        packId={packId}
        purchaseId={purchaseId}
        packPriceCents={packPriceCents}
        onViewDetails={onViewDetails}
        onKeep={onKeep}
        onListForSale={onListForSale}
      />
    );
  }

  const isTear = config.gesture.mode === "tear";
  const hintLabel = isTear ? "SWIPE UP TO TEAR" : "LIFT THE LID";

  return (
    <View style={[styles.container, { backgroundColor: config.palette.background }]}>
      <View style={styles.hud}>
        {phase === "idle" ? (
          <>
            <Text style={styles.hudEyebrow}>
              {config.label.toUpperCase()} · {isTear ? "SEALED" : "LIFT THE LID"}
            </Text>
            <View style={styles.dotRow}>
              {orderedItems.map((item, i) => (
                <View key={item.id ?? i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          </>
        ) : phase === "opening" ? (
          // Rarity intentionally withheld here — the RarityBadge only appears once "settled",
          // so the narrated beats ("SILHOUETTE VISIBLE", "RARITY LOCKING IN", ...) actually
          // lead somewhere instead of the badge spoiling it from the first frame.
          <Text style={styles.hudEyebrow}>{beatLabel ?? `${config.label.toUpperCase()} OPENING…`}</Text>
        ) : (
          <>
            <Text style={styles.hudText}>
              {index + 1} / {orderedItems.length}
            </Text>
            <RarityBadge tier={currentTier} />
          </>
        )}
      </View>

      <GestureLayer gesture={config.gesture} onComplete={() => setPhase("opening")}>
        {(openProgress) => (
          <Canvas camera={{ position: config.camera.position, fov: config.camera.fov }}>
            <TiltLights lighting={config.lighting} tilt={tilt} />
            {config.buildMesh(current, { openProgress, tierColor: currentTier.colorHex })}
          </Canvas>
        )}
      </GestureLayer>

      {phase === "idle" && (
        // pointerEvents="none": this absolutely-positioned footer floats on top of the
        // GestureLayer's view (a separate sibling, not a descendant of its GestureDetector) —
        // without this, a touch starting on the hint text itself (the single most natural place
        // to start the swipe) gets captured by this plain View's native hit-test first and never
        // reaches the gesture recognizer at all, making the whole screen feel completely
        // unresponsive. Purely decorative, never needs to receive touches itself.
        <View style={styles.idleFooter} pointerEvents="none">
          <Text style={styles.hint}>{hintLabel}</Text>
          <View style={styles.dragHandle} />
        </View>
      )}
    </View>
  );
}

/**
 * Watches always pull exactly one item (PRD §21 — no bulk mode for watches), so "the revealed
 * watch" below is unambiguous even though this stays written for the general N-item case. The
 * three terminal actions act on that one real `owned_items` row — `ownedItemId` comes straight
 * off the purchase response (see server's purchase.service.ts), not a separate portfolio
 * lookup, so "List for Sale" can hand off directly into SellItemScreen.
 */
function SummaryView({
  items,
  rarityTiers,
  packId,
  purchaseId,
  packPriceCents,
  onViewDetails,
  onKeep,
  onListForSale,
}: {
  items: PulledOwnedItem[];
  rarityTiers: RarityTier[];
  packId: string;
  purchaseId: string | null;
  packPriceCents?: number;
  onViewDetails: (owned: OwnedItem) => void;
  onKeep: () => void;
  onListForSale: (owned: OwnedItem) => void;
}) {
  const totalValueCents = items.reduce((sum, item) => sum + item.baseValueCents, 0);
  const best = items.reduce((a, b) => (b.baseValueCents > a.baseValueCents ? b : a), items[0]);
  const bestTier = best ? resolveTier(rarityTiers, best.rarityTierLevel) : null;

  // Synthesized locally rather than read back from `/me/portfolio` — the purchase response
  // already carries everything the two terminal actions need, and a round trip here would put a
  // spinner between the reveal and "List for Sale".
  //
  // `costBasisCents` is this copy's share of what the pack cost, which is exactly how the server
  // derives it too (portfolio.repository.ts) — floored here because the server hands the
  // sub-cent remainder to specific rows in id order, which this side can't know. The
  // authoritative figure lands with the next portfolio read; the two differ by at most a cent,
  // and only for packs whose price doesn't divide evenly.
  const acquiredAt = new Date().toISOString();
  const bestOwned: OwnedItem | null = best
    ? {
        ownedItemId: best.ownedItemId,
        item: best,
        packId,
        purchaseId,
        acquiredAt,
        heldSinceAt: acquiredAt,
        costBasisCents: packPriceCents != null ? Math.floor(packPriceCents / items.length) : null,
        acquiredVia: "pack",
        activeListing: null,
      }
    : null;

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>{copy.summaryTitle}</Text>
      {best && bestTier && (
        <View style={styles.heroCard}>
          <RarityBadge tier={bestTier} />
          <Text style={styles.heroName}>{best.name}</Text>
          <Price cents={best.baseValueCents} color={reveal.accent} />
        </View>
      )}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total value</Text>
        <Price cents={totalValueCents} color={reveal.textPrimary} />
      </View>
      {packPriceCents != null && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Profit / Loss</Text>
          <Text
            style={[
              typography.price,
              { color: totalValueCents >= packPriceCents ? reveal.success : reveal.danger },
            ]}
          >
            {totalValueCents - packPriceCents >= 0 ? "+" : "-"}$
            {(Math.abs(totalValueCents - packPriceCents) / 100).toFixed(2)}
          </Text>
        </View>
      )}
      {bestOwned && (
        <View style={styles.terminalActions}>
          <Pressable style={styles.terminalPrimary} onPress={() => onViewDetails(bestOwned)}>
            <Text style={styles.terminalPrimaryLabel}>{copy.viewDetails}</Text>
          </Pressable>
          <View style={styles.terminalRow}>
            <Pressable style={styles.terminalSecondary} onPress={onKeep}>
              <Text style={styles.terminalSecondaryLabel}>{copy.keep}</Text>
            </Pressable>
            <Pressable style={styles.terminalSecondary} onPress={() => onListForSale(bestOwned)}>
              <Text style={styles.terminalSecondaryLabel}>{copy.listForSale}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  hudText: { color: reveal.textSecondary, ...typography.caption },
  hudEyebrow: { ...typography.eyebrow, color: "rgba(255,255,255,0.7)", letterSpacing: 2 },
  dotRow: { flexDirection: "row", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.24)" },
  dotActive: { backgroundColor: reveal.accent },
  idleFooter: {
    position: "absolute",
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: spacing.lg,
  },
  hint: {
    color: reveal.textSecondary,
    ...typography.body,
    letterSpacing: 1,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  summary: {
    flex: 1,
    backgroundColor: reveal.background,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.lg,
  },
  summaryTitle: { color: reveal.textPrimary, ...typography.display, textAlign: "center" },
  heroCard: {
    backgroundColor: reveal.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: reveal.border,
  },
  heroName: { color: reveal.textPrimary, ...typography.title },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  summaryLabel: { color: reveal.textSecondary, ...typography.body },
  terminalActions: { marginTop: spacing.lg, gap: spacing.sm },
  terminalPrimary: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: reveal.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  terminalPrimaryLabel: { ...typography.body, fontWeight: "700" as const, color: reveal.background },
  terminalRow: { flexDirection: "row", gap: spacing.sm },
  terminalSecondary: {
    flex: 1,
    height: 50,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: reveal.border,
    alignItems: "center",
    justifyContent: "center",
  },
  terminalSecondaryLabel: { ...typography.body, color: reveal.textPrimary },
});

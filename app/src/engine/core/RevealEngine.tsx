import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Canvas } from "@react-three/fiber/native";
import type { PulledItem, RarityTier } from "@grailhaus/shared";
import type { CategoryRevealConfig, RevealPhase } from "./types";
import { GestureLayer } from "./GestureLayer";
import { playHapticTrack } from "./HapticsTrack";
import { radii, spacing, typography } from "../../theme/tokens";
import { RarityBadge } from "../../components/RarityBadge";
import { Price } from "../../components/Price";

interface RevealEngineProps {
  config: CategoryRevealConfig;
  items: PulledItem[];
  rarityTiers: RarityTier[];
  packPriceCents?: number;
  onFinished?: () => void;
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
export function RevealEngine({ config, items, rarityTiers, packPriceCents, onFinished }: RevealEngineProps) {
  const orderedItems = useMemo(() => config.revealOrder(items), [items, config]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<RevealPhase>("idle");

  const maxTierLevel = useMemo(() => Math.max(...rarityTiers.map((t) => t.level), 1), [rarityTiers]);

  const current = orderedItems[index];
  const currentTier = current ? resolveTier(rarityTiers, current.rarityTierLevel) : null;
  const isRare = current?.rarityTierLevel === maxTierLevel;

  useEffect(() => {
    if (phase !== "opening" || !current) return;
    const cancel = playHapticTrack(config.hapticTrack(phase, isRare));
    const holdMs = isRare ? config.timing.rareHoldMs : config.timing.commonBeatMs;
    const timer = setTimeout(() => setPhase("settled"), holdMs);
    return () => {
      cancel();
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
        packPriceCents={packPriceCents}
        onDone={onFinished}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: config.palette.background }]}>
      <View style={styles.hud}>
        <Text style={styles.hudText}>
          {index + 1} / {orderedItems.length}
        </Text>
        <RarityBadge tier={currentTier} />
      </View>

      <GestureLayer gesture={config.gesture} onComplete={() => setPhase("opening")}>
        {(openProgress) => (
          <Canvas camera={{ position: config.camera.position, fov: config.camera.fov }}>
            {config.lighting.map((light, i) =>
              light.kind === "ambient" ? (
                <ambientLight key={i} intensity={light.intensity} color={light.color} />
              ) : (
                <directionalLight
                  key={i}
                  position={light.position ?? [0, 0, 0]}
                  intensity={light.intensity}
                  color={light.color}
                />
              )
            )}
            {config.buildMesh(current, { openProgress, tierColor: currentTier.colorHex })}
          </Canvas>
        )}
      </GestureLayer>

      {phase === "idle" && <Text style={styles.hint}>Swipe to open</Text>}
    </View>
  );
}

function SummaryView({
  items,
  rarityTiers,
  packPriceCents,
  onDone,
}: {
  items: PulledItem[];
  rarityTiers: RarityTier[];
  packPriceCents?: number;
  onDone?: () => void;
}) {
  const totalValueCents = items.reduce((sum, item) => sum + item.baseValueCents, 0);
  const best = items.reduce((a, b) => (b.baseValueCents > a.baseValueCents ? b : a), items[0]);
  const bestTier = best ? resolveTier(rarityTiers, best.rarityTierLevel) : null;

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Pull Summary</Text>
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
      {onDone && (
        <Text style={styles.doneLink} onPress={onDone}>
          Done
        </Text>
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
  hint: {
    position: "absolute",
    bottom: spacing.xxl,
    alignSelf: "center",
    color: reveal.textSecondary,
    ...typography.body,
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
  doneLink: {
    color: reveal.accent,
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});

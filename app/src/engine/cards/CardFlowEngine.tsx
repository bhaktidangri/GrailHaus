import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Canvas } from "@react-three/fiber/native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { ItemDetail, PackSku } from "@grailhaus/shared";
import { usePackFlowStore } from "../../state/packFlowStore";
import { useCollectionViewModel } from "../../viewmodels/useCollectionViewModel";
import { cardsConfig } from "../categories/cards.config";
import { GestureLayer } from "../core/GestureLayer";
import { CardMesh } from "../components/CardMesh";
import { playHapticTrack } from "../core/HapticsTrack";
import { PackFace } from "../../components/PackFace";
import { ProgressRing } from "../../components/ProgressRing";
import { StatBox } from "../../components/StatBox";
import { ART_GRADIENT, TIER_LABEL } from "../../components/PackTile";
import { accents, fonts, ink, spacing } from "../../theme/tokens";
import { cardFlow as copy } from "../../content/copy";

type Step = "processing" | "ready" | "introduction" | "card" | "final" | "summary";

const PROCESSING_DURATION_MS = 2000;

/**
 * The Cards journey's post-payment flow: Processing → Ready → Introduction →
 * per-card 2D swipe reveal → hold-to-reveal on the final (rarest) card →
 * Pack Complete summary. Replaces `RevealEngine`'s cards branch. Keeps the
 * 3D `CardMesh` + `GestureLayer` for exactly one beat — the pack tear in
 * Introduction — everything else here is flat 2D per the newer mockup.
 */
export function CardFlowEngine({
  sku,
  items,
  onFinished,
  onRipAgain,
  onGoHome,
  onViewCollection,
  isRipAgainWorking,
}: {
  sku: PackSku;
  items: ItemDetail[];
  onFinished: () => void;
  onRipAgain: () => void;
  onGoHome: () => void;
  onViewCollection: () => void;
  isRipAgainWorking: boolean;
}) {
  const setPhase = usePackFlowStore((s) => s.setPhase);
  const { owned } = useCollectionViewModel();
  const [step, setStep] = useState<Step>("processing");
  const [visibleStatusRows, setVisibleStatusRows] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);

  // Same ordering rule as cardsConfig.revealOrder (commons first, rarest last) — reimplemented
  // here rather than called directly so `orderedItems` keeps its full `ItemDetail[]` typing
  // instead of narrowing to the reveal engine's minimal `PulledItem` shape.
  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.rarityTierLevel - b.rarityTierLevel),
    [items]
  );

  // Real ownership math: how many of each pulled id this account held *before* this pack —
  // `owned` already includes the just-purchased copies (the purchase's query invalidation ran
  // before this screen mounted), so we subtract this pull's own copies back out.
  const priorCountById = useMemo(() => {
    const pulledCount = new Map<string, number>();
    for (const item of orderedItems) pulledCount.set(item.id, (pulledCount.get(item.id) ?? 0) + 1);
    const ownedCount = new Map<string, number>();
    for (const o of owned) ownedCount.set(o.item.id, (ownedCount.get(o.item.id) ?? 0) + 1);
    const prior = new Map<string, number>();
    for (const [id, count] of pulledCount) prior.set(id, Math.max(0, (ownedCount.get(id) ?? 0) - count));
    return prior;
  }, [orderedItems, owned]);

  useEffect(() => {
    if (step !== "processing") return;
    const timers = [0, 700, 1400].map((delay, i) =>
      setTimeout(() => setVisibleStatusRows(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [step]);

  function handleProcessingDone() {
    setStep("ready");
    setPhase("ready");
  }

  function handleBeginRip() {
    setStep("introduction");
    setPhase("revealing");
  }

  function handleOpenLater() {
    onFinished();
  }

  function handleTearComplete() {
    setStep("card");
    setCardIndex(0);
    playHapticTrack(cardsConfig.hapticTrack("opening", false));
  }

  function handleAdvanceCard() {
    if (cardIndex + 1 >= orderedItems.length) {
      setStep("final");
    } else {
      setCardIndex((i) => i + 1);
    }
  }

  function handleFinalRevealed() {
    setStep("summary");
    setPhase("summary");
  }

  if (step === "processing") {
    return (
      <ProcessingView
        visibleRows={visibleStatusRows}
        onComplete={handleProcessingDone}
      />
    );
  }

  if (step === "ready") {
    return <ReadyView sku={sku} onBeginRip={handleBeginRip} onOpenLater={handleOpenLater} />;
  }

  if (step === "introduction") {
    return <IntroductionView sku={sku} onTearComplete={handleTearComplete} />;
  }

  if (step === "card" || step === "final") {
    const item = step === "final" ? orderedItems[orderedItems.length - 1] : orderedItems[cardIndex];
    const priorCount = priorCountById.get(item.id) ?? 0;
    const occurrenceSoFar = orderedItems.slice(0, cardIndex + 1).filter((i) => i.id === item.id).length;
    const holdCount = priorCount + occurrenceSoFar;
    const runningTotalCents = orderedItems.slice(0, cardIndex + 1).reduce((sum, i) => sum + i.baseValueCents, 0);
    const tier = sku.rarityTiers.find((t) => t.level === item.rarityTierLevel) ?? null;

    return step === "final" ? (
      <FinalCardView
        item={item}
        tier={tier}
        holdCount={holdCount}
        total={orderedItems.length}
        onRevealed={handleFinalRevealed}
      />
    ) : (
      // Keyed by index so each card gets a fresh mount — CardView's own `translateX` shared
      // value ends a swipe at -500 (off-screen) and never resets on its own; without a key
      // change here, advancing to the next card reuses the same instance and that same
      // already-off-screen position, rendering a "blank" card that's actually just invisible.
      <CardView
        key={cardIndex}
        item={item}
        tier={tier}
        index={cardIndex}
        total={orderedItems.length}
        holdCount={holdCount}
        isNew={holdCount === 1}
        runningTotalCents={runningTotalCents}
        onAdvance={handleAdvanceCard}
      />
    );
  }

  // "summary"
  return (
    <SummaryView
      sku={sku}
      items={orderedItems}
      priorCountById={priorCountById}
      onRipAgain={onRipAgain}
      onGoHome={onGoHome}
      onViewCollection={onViewCollection}
      isRipAgainWorking={isRipAgainWorking}
    />
  );
}

function ProcessingView({ visibleRows, onComplete }: { visibleRows: number; onComplete: () => void }) {
  const rows = [
    { label: copy.processing.paymentSuccess, done: visibleRows >= 1 },
    { label: copy.processing.stockDecremented, done: visibleRows >= 2 },
    { label: copy.processing.sealingContents, done: visibleRows >= 3 },
  ];
  return (
    <View style={styles.fill}>
      <View style={styles.processingCenter}>
        <Text style={styles.eyebrow}>{copy.processing.title}</Text>
        <ProgressRing durationMs={PROCESSING_DURATION_MS} color={accents.cards.top} onComplete={onComplete} />
        <Text style={styles.processingHeading}>{copy.processing.heading}</Text>
        <Text style={styles.processingBody}>{copy.processing.body}</Text>
      </View>
      <View style={styles.processingSteps}>
        {rows.map((row) => (
          <View key={row.label} style={[styles.processingRow, !row.done && styles.processingRowPending]}>
            <View style={[styles.processingDot, row.done && styles.processingDotDone]} />
            <Text style={styles.processingRowText}>{row.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReadyView({
  sku,
  onBeginRip,
  onOpenLater,
}: {
  sku: PackSku;
  onBeginRip: () => void;
  onOpenLater: () => void;
}) {
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.street_rip;
  return (
    <View style={styles.fill}>
      <View style={styles.readyCenter}>
        <Text style={styles.eyebrow}>{copy.ready.title}</Text>
        <Text style={styles.readyHeading}>{copy.ready.heading}</Text>
        <PackFace art={art} width={206} height={286} radius={16} crimp label={sku.name} />
        <StatBox label={copy.ready.insideLabel} value={copy.ready.insideValue(sku.itemCount)} bordered={false} />
      </View>
      <View style={styles.footer}>
        <Pressable onPress={onBeginRip}>
          <LinearGradient colors={[accents.cards.top, accents.cards.bottom]} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>{copy.ready.beginRip}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={onOpenLater}>
          <Text style={styles.openLaterLink}>{copy.ready.openLater}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function IntroductionView({ sku, onTearComplete }: { sku: PackSku; onTearComplete: () => void }) {
  return (
    <View style={styles.fill}>
      <Text style={styles.introHeading}>{copy.introduction.heading(sku.itemCount)}</Text>
      <Text style={styles.introBody}>{copy.introduction.body}</Text>
      <View style={styles.tearCanvas}>
        <GestureLayer gesture={cardsConfig.gesture} onComplete={onTearComplete}>
          {(openProgress) => (
            <Canvas camera={{ position: cardsConfig.camera.position, fov: cardsConfig.camera.fov }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[3, 4, 5]} intensity={1.1} />
              <CardMesh tierColor={accents.cards.top} openProgress={openProgress} />
            </Canvas>
          )}
        </GestureLayer>
      </View>
      <View style={styles.introFooter}>
        <Text style={styles.hint}>{copy.introduction.hint}</Text>
        <View style={styles.dragHandle} />
      </View>
    </View>
  );
}

function CardView({
  item,
  tier,
  index,
  total,
  holdCount,
  isNew,
  runningTotalCents,
  onAdvance,
}: {
  item: ItemDetail;
  tier: { colorHex: string; name: string } | null;
  index: number;
  total: number;
  holdCount: number;
  isNew: boolean;
  runningTotalCents: number;
  onAdvance: () => void;
}) {
  const translateX = useSharedValue(0);
  const color = tier?.colorHex ?? ink.textMuted;

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      "worklet";
      if (e.translationX < -80 || e.velocityX < -600) {
        translateX.value = withTiming(-500, { duration: 220 }, () => runOnJS(onAdvance)());
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { rotate: `${translateX.value / 20}deg` }],
  }));

  return (
    <View style={styles.fill}>
      <View style={styles.cardHud}>
        <Text style={styles.eyebrow}>{copy.card.title(index + 1, total)}</Text>
        <View style={styles.dotRow}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < index && styles.dotDone,
                i === index && styles.dotCurrent,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.cardCenter}>
        <GestureDetector gesture={pan}>
          <Animated.View style={cardStyle}>
            <PackFace
              art={[color, "rgba(0,0,0,0.55)"]}
              width={220}
              height={298}
              radius={16}
              tier={tier?.name.toUpperCase()}
              label={item.name}
            />
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>{copy.card.statusLabel}</Text>
            <Text style={styles.statusValue}>
              {isNew ? copy.card.newLabel : copy.card.duplicateLabel(holdCount)}
            </Text>
          </View>
          <View style={styles.statusRight}>
            <Text style={styles.statusLabel}>{copy.card.runningTotalLabel}</Text>
            <Text style={styles.statusValue}>${(runningTotalCents / 100).toFixed(0)}</Text>
          </View>
        </View>
        <Text style={styles.hint}>{copy.card.hint}</Text>
      </View>
    </View>
  );
}

const HOLD_DURATION_MS = 1400;

function FinalCardView({
  item,
  tier,
  holdCount,
  total,
  onRevealed,
}: {
  item: ItemDetail;
  tier: { colorHex: string; name: string } | null;
  holdCount: number;
  total: number;
  onRevealed: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const progress = useSharedValue(0);
  const color = tier?.colorHex ?? accents.cards.top;

  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.3 + progress.value * 0.7 }));

  function startHold() {
    progress.value = withTiming(1, { duration: HOLD_DURATION_MS }, (finished) => {
      if (finished) runOnJS(setRevealed)(true);
    });
  }

  function cancelHold() {
    if (!revealed) progress.value = withTiming(0, { duration: 200 });
  }

  return (
    <View style={styles.fill}>
      <View style={styles.cardHud}>
        <Text style={styles.eyebrow}>{copy.final.title(total)}</Text>
        {!revealed && <Text style={styles.holdLabel}>{copy.final.hold}</Text>}
      </View>

      <View style={styles.cardCenter}>
        {!revealed ? (
          <Pressable onPressIn={startHold} onPressOut={cancelHold}>
            <Animated.View style={ringStyle}>
              <PackFace art={[color, "rgba(0,0,0,0.6)"]} width={236} height={326} radius={18} crimp />
            </Animated.View>
          </Pressable>
        ) : (
          <PackFace
            art={[color, "rgba(0,0,0,0.6)"]}
            width={236}
            height={326}
            radius={18}
            tier={tier?.name.toUpperCase()}
            label={item.name}
          />
        )}
      </View>

      <View style={styles.cardFooter}>
        {revealed ? (
          <>
            <View style={styles.newBinderNote}>
              <Text style={styles.newBinderText}>
                {holdCount === 1 ? copy.final.newToBinder : copy.card.duplicateLabel(holdCount)}
              </Text>
            </View>
            <Pressable onPress={onRevealed}>
              <Text style={styles.hint}>{copy.final.continueHint}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.hint}>{copy.final.holdHint}</Text>
        )}
      </View>
    </View>
  );
}

function SummaryView({
  sku,
  items,
  priorCountById,
  onRipAgain,
  onGoHome,
  onViewCollection,
  isRipAgainWorking,
}: {
  sku: PackSku;
  items: ItemDetail[];
  priorCountById: Map<string, number>;
  onRipAgain: () => void;
  onGoHome: () => void;
  onViewCollection: () => void;
  isRipAgainWorking: boolean;
}) {
  const totalValueCents = items.reduce((sum, i) => sum + i.baseValueCents, 0);
  const profitCents = totalValueCents - sku.priceCents;
  const newCount = items.filter((item) => (priorCountById.get(item.id) ?? 0) === 0).length;
  const duplicateCount = items.length - newCount;
  const tierLabel = TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase();

  return (
    <View style={styles.fill}>
      <View style={styles.summaryHeader}>
        <Text style={styles.eyebrow}>{copy.summary.title}</Text>
      </View>
      <View style={styles.summaryScroll}>
        <Text style={[styles.profit, { color: profitCents >= 0 ? "#8BF285" : "#F0554A" }]}>
          {profitCents >= 0 ? "+" : "-"}${(Math.abs(profitCents) / 100).toFixed(0)}
        </Text>
        <Text style={styles.summarySub}>
          {copy.summary.pulledOn(totalValueCents, sku.priceCents, items.length)}
        </Text>

        <View style={styles.resultsGrid}>
          {items.map((item, i) => {
            const tier = sku.rarityTiers.find((t) => t.level === item.rarityTierLevel);
            return (
              <View key={`${item.id}-${i}`} style={styles.resultTile}>
                <LinearGradient
                  colors={[`${tier?.colorHex ?? "#888"}CC`, "rgba(0,0,0,0.5)"]}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.resultValue}>${(item.baseValueCents / 100).toFixed(0)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.statRow}>
          <StatBox label={copy.summary.newLabel} value={String(newCount)} />
          <StatBox label={copy.summary.duplicateLabel} value={String(duplicateCount)} />
          <StatBox label={copy.summary.collectionValueLabel} value={`$${(totalValueCents / 100).toFixed(0)}`} />
        </View>

        {/* Always true — the purchase already inserted these as owned_items server-side in the
            same atomic transaction, there's no separate "add" step for the user to trigger. */}
        <Text style={styles.addedNote}>{copy.summary.addedToCollection}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onRipAgain} disabled={isRipAgainWorking}>
          <LinearGradient colors={[accents.cards.top, accents.cards.bottom]} style={styles.primaryButton}>
            {isRipAgainWorking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonLabel}>{copy.summary.ripAgain(tierLabel)}</Text>
            )}
          </LinearGradient>
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable onPress={onViewCollection} disabled={isRipAgainWorking} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>{copy.summary.viewCollection}</Text>
          </Pressable>
          <Pressable onPress={onGoHome} disabled={isRipAgainWorking} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>{copy.summary.backToHome}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0b0b10", paddingTop: 56, paddingHorizontal: 20 },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.62)" },

  processingCenter: { alignItems: "center", gap: spacing.md, marginTop: 60 },
  processingHeading: { fontFamily: fonts.black, fontSize: 22, color: ink.text, marginTop: spacing.md },
  processingBody: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
  },
  processingSteps: { marginTop: spacing.xxl, gap: spacing.md },
  processingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  processingRowPending: { opacity: 0.35 },
  processingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.2)" },
  processingDotDone: { backgroundColor: "#8BF285" },
  processingRowText: { fontFamily: fonts.semibold, fontSize: 13.5, color: ink.text },

  readyCenter: { alignItems: "center", gap: spacing.lg, marginTop: 24 },
  readyHeading: { fontFamily: fonts.black, fontSize: 26, color: ink.text, textAlign: "center" },

  footer: { position: "absolute", bottom: 40, left: 20, right: 20, gap: spacing.md, alignItems: "center" },
  primaryButton: {
    height: 62,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.26)",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 260,
    paddingHorizontal: 24,
  },
  primaryButtonLabel: { fontFamily: fonts.black, fontSize: 16, letterSpacing: 1.1, color: "#fff" },
  openLaterLink: { fontFamily: fonts.semibold, fontSize: 13, color: "rgba(255,255,255,0.5)" },

  introHeading: { fontFamily: fonts.black, fontSize: 30, color: ink.text, marginTop: 40, textAlign: "center" },
  introBody: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  tearCanvas: { flex: 1, marginVertical: 20 },
  introFooter: { alignItems: "center", gap: spacing.md, paddingBottom: 24 },
  hint: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 1, color: "rgba(255,255,255,0.5)" },
  dragHandle: { width: 44, height: 4, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },

  cardHud: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dotRow: { flexDirection: "row", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)" },
  dotDone: { backgroundColor: "rgba(255,255,255,0.5)" },
  dotCurrent: { width: 20, backgroundColor: accents.cards.top },
  cardCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardFooter: { paddingBottom: 32, gap: spacing.md, alignItems: "center" },
  statusRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  statusRight: { alignItems: "flex-end" },
  statusLabel: { fontFamily: fonts.medium, fontSize: 11, color: "rgba(255,255,255,0.5)" },
  statusValue: { fontFamily: fonts.bold, fontSize: 15, color: ink.text, marginTop: 3 },
  holdLabel: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1.4, color: accents.cards.top },
  newBinderNote: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    width: "100%",
  },
  newBinderText: { fontFamily: fonts.semibold, fontSize: 13.5, color: ink.text, textAlign: "center" },

  summaryHeader: { alignItems: "center" },
  summaryScroll: { flex: 1, alignItems: "center", marginTop: 20, gap: spacing.lg, width: "100%" },
  profit: { fontFamily: fonts.black, fontSize: 44 },
  summarySub: { fontFamily: fonts.medium, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  resultsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" },
  resultTile: {
    width: 56,
    height: 78,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 6,
  },
  resultValue: { fontFamily: fonts.bold, fontSize: 11, color: "#fff" },
  statRow: { flexDirection: "row", gap: 10, width: "100%" },
  addedNote: { fontFamily: fonts.semibold, fontSize: 12.5, color: "#8BF285" },
  secondaryRow: { flexDirection: "row", gap: spacing.sm, width: "100%", minWidth: 260 },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonLabel: { fontFamily: fonts.bold, fontSize: 12.5, letterSpacing: 0.5, color: "rgba(255,255,255,0.85)" },
});

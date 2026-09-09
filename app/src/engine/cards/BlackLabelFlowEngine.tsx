import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PackSku, PulledOwnedItem } from "@grailhaus/shared";
import { usePackFlowStore } from "../../state/packFlowStore";
import { useCollectionViewModel } from "../../viewmodels/useCollectionViewModel";
import { ProcessingView, ReadyView, SummaryView } from "./CardFlowEngine";
import { BlackLabelTearStage } from "./blackLabelReveal/BlackLabelTearStage";
import { BlackLabelFanReveal } from "./blackLabelReveal/BlackLabelFanReveal";

type Step = "processing" | "ready" | "tear" | "cards" | "summary";

/**
 * The Black Label tier's own flow — Processing → Ready → [premium 3D tear] → fanned card reveal
 * → Pack Complete summary. Structurally identical to VaultBreakFlowEngine.tsx (same reasoning
 * for the tear/reveal split — see that file's header) — this is that same flow bound to
 * BlackLabelTearStage/BlackLabelFanReveal (this tier's own bronze-on-onyx personality/art)
 * instead of Vault Break's. Every other card tier still keeps CardFlowEngine's own tear +
 * swipe-through-cards flow unchanged.
 */
export function BlackLabelFlowEngine({
  sku,
  items,
  onFinished,
  onRipAgain,
  onGoHome,
  onViewCollection,
  isRipAgainWorking,
}: {
  sku: PackSku;
  items: PulledOwnedItem[];
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

  // Same commons-first ordering as CardFlowEngine.orderedItems.
  const orderedItems = useMemo(() => [...items].sort((a, b) => a.rarityTierLevel - b.rarityTierLevel), [items]);

  // Same real-ownership math as CardFlowEngine: how many of each pulled id this account held
  // *before* this pack (`owned` already includes this pull's own copies).
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
    const timers = [0, 700, 1400].map((delay, i) => setTimeout(() => setVisibleStatusRows(i + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  function handleProcessingDone() {
    setStep("ready");
    setPhase("ready");
  }

  function handleBeginRip() {
    setStep("tear");
    setPhase("revealing");
  }

  function handleOpenLater() {
    onFinished();
  }

  function handleTearComplete() {
    setStep("cards");
  }

  function handleCardsDone() {
    setStep("summary");
    setPhase("summary");
  }

  if (step === "processing") {
    return <ProcessingView visibleRows={visibleStatusRows} onComplete={handleProcessingDone} />;
  }

  if (step === "ready") {
    return <ReadyView sku={sku} onBeginRip={handleBeginRip} onOpenLater={handleOpenLater} />;
  }

  if (step === "tear") {
    return (
      <View style={styles.fill}>
        <BlackLabelTearStage onTearComplete={handleTearComplete} />
      </View>
    );
  }

  if (step === "cards") {
    return <BlackLabelFanReveal items={orderedItems} sku={sku} onDone={handleCardsDone} />;
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

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#05030a" },
});

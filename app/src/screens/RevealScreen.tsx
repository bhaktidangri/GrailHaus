import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { OwnedItem } from "@grailhaus/shared";
import { usePackFlowViewModel } from "../viewmodels/usePackFlowViewModel";
import { RevealEngine } from "../engine/core/RevealEngine";
import { CardFlowEngine } from "../engine/cards/CardFlowEngine";
import { VaultBreakFlowEngine } from "../engine/cards/VaultBreakFlowEngine";
import { BatchSummaryScreen } from "../engine/cards/BatchSummaryScreen";
import { BlackLabelFlowEngine } from "../engine/cards/BlackLabelFlowEngine";
import { ScreenBackground } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme/tokens";
import { reveal as revealCopy } from "../content/copy";
import type { AppStackParamList } from "../navigation/AppNavigator";

type Nav = NativeStackNavigationProp<AppStackParamList, "Reveal">;

/**
 * Reveal is a pushed screen, not a tab — it only exists mid-purchase, and
 * `startFlow` (usePackFlowViewModel) already navigates here right after a
 * successful buy. Tapping "done" on the summary clears the flow state AND
 * pops back to wherever the purchase started (Explore/Shelf/Drops/PackDetail
 * /DropDetail), so a finished reveal never leaves a dead-end screen behind.
 *
 * Cards purchases run through the new multi-phase `CardFlowEngine`
 * (processing → ready → rip → summary). Watches purchases TEMPORARILY still
 * render the old single-gesture `RevealEngine` — its own multi-phase
 * `VaultFlowEngine` (per the "rebuild purchase+reveal flows" plan) is a
 * later pass.
 */
export function RevealScreen() {
  const navigation = useNavigation<Nav>();
  const flow = usePackFlowViewModel();
  // "Tabs" is the root stack's own first screen (see AppNavigator) — navigating to it from a
  // pushed screen like this one pops back to it rather than pushing a duplicate, but its nested
  // tab/screen isn't expressible in AppStackParamList's types, so this jump is deliberately
  // loosely typed (same pattern ItemForkScreen already uses for the same reason).
  const rootNavigate = navigation.navigate as (name: string, params?: object) => void;

  function handleFinished() {
    flow.finishFlow();
    if (navigation.canGoBack()) navigation.goBack();
  }

  function handleGoHome() {
    flow.finishFlow();
    rootNavigate("Tabs", { screen: "Home" });
  }

  function handleViewCollection() {
    flow.finishFlow();
    rootNavigate("Tabs", { screen: "Portfolio" });
  }

  /** A genuinely new POST /purchase for the same SKU — not a client-side re-roll of the pack(s)
   * that were already on screen. Keeps the summary showing on failure (sold out, insufficient
   * funds) rather than clearing the flow out from under the user. Reused for both "Rip Another"
   * (single) and the batch summary's "Rip 10 More" — `quantity` is the only thing that differs. */
  async function handleRipAgain(quantity: 1 | 10 = 1) {
    if (!flow.sku) return;
    const result = await flow.startFlow(flow.sku, quantity);
    if (!result.ok) Alert.alert("Couldn't rip again", result.error);
  }

  function handleViewWatchDetails(owned: OwnedItem) {
    flow.finishFlow();
    rootNavigate("Tabs", { screen: "Portfolio", params: { screen: "WatchDetail", params: { owned } } });
  }

  function handleListForSale(owned: OwnedItem) {
    flow.finishFlow();
    rootNavigate("Tabs", { screen: "Portfolio", params: { screen: "SellItem", params: { owned } } });
  }

  if (!flow.isActive || !flow.config || !flow.sku) {
    return (
      <ScreenBackground>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{revealCopy.emptyTitle}</Text>
          <Text style={styles.emptyNote}>{revealCopy.emptyNote}</Text>
        </View>
      </ScreenBackground>
    );
  }

  // The terminal screen for a bulk (10-pack) rip — every pack in `flow.packs` has either been
  // shown or was explicitly skipped past (see usePackFlowViewModel.skipToResults), and every
  // one of their contents is still exactly what the purchase produced. Also what a device that
  // died between the last pack finishing and this screen being dismissed resumes directly onto.
  if (flow.isBatchSummary) {
    return (
      <BatchSummaryScreen
        sku={flow.sku}
        packs={flow.packs}
        isRipAgainWorking={flow.isPurchasing}
        onRipAgain={() => handleRipAgain(10)}
        onGoHome={handleGoHome}
        onViewCollection={handleViewCollection}
      />
    );
  }

  if (!flow.items) {
    return (
      <ScreenBackground>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{revealCopy.emptyTitle}</Text>
          <Text style={styles.emptyNote}>{revealCopy.emptyNote}</Text>
        </View>
      </ScreenBackground>
    );
  }

  if (flow.sku.category === "cards") {
    // Vault Break is the one card tier with its own richer reveal (cards physically rise out of
    // the torn pack and fan out in the 3D scene, with tap/drag/pinch/flip inspection) — every
    // other tier keeps CardFlowEngine's tear + flat swipe-through-cards flow, and is the only
    // one bulk-eligible (see ConfirmPurchaseSheet/PackDetailScreen) — Vault Break's own richer
    // engine isn't built to batch, so it's always a single pack here.

    // Vault Break and Black Label are the two card tiers with their own richer reveal (cards
    // physically rise out of the torn pack and fan out, with a staged rarity moment and
    // tap/drag/pinch/flip inspection) — every other tier keeps CardFlowEngine's tear + flat
    // swipe-through-cards flow. See VaultBreakFlowEngine's own header for why this started
    // scoped to just Vault Break, and BlackLabelFlowEngine's for why Black Label got the same
    // treatment rather than a third, different flow.
    if (flow.sku.tier === "vault_break") {
      return (
        <VaultBreakFlowEngine
          key={flow.purchaseId ?? undefined}
          sku={flow.sku}
          items={flow.items}
          onFinished={handleFinished}
          onRipAgain={() => handleRipAgain(1)}
          onGoHome={handleGoHome}
          onViewCollection={handleViewCollection}
          isRipAgainWorking={flow.isPurchasing}
        />
      );
    }
    if (flow.sku.tier === "black_label") {
      return (
        <BlackLabelFlowEngine
          key={flow.purchaseId ?? undefined}
          sku={flow.sku}
          items={flow.items}
          onFinished={handleFinished}
          onRipAgain={() => handleRipAgain(1)}
          onGoHome={handleGoHome}
          onViewCollection={handleViewCollection}
          isRipAgainWorking={flow.isPurchasing}
        />
      );
    }
    // Keyed by purchase id + pack index (not purchase id alone) so advancing from one pack of a
    // batch to the next always mounts a fresh instance — a batch's ten packs share one
    // purchaseId (one atomic purchase produced all of them), so without the index every pack
    // after the first would reuse pack one's already-`"summary"`-phase component instance
    // instead of starting its own tear from scratch.

    return (
      <CardFlowEngine
        key={`${flow.purchaseId ?? "none"}-${flow.currentPackIndex}`}
        sku={flow.sku}
        items={flow.items}
        config={flow.config}
        batchContext={flow.isBatch ? { index: flow.currentPackIndex, total: flow.quantity } : undefined}
        onNextPack={flow.isBatch ? () => flow.advanceBatch() : undefined}
        onSkipToResults={flow.isBatch ? flow.skipToResults : undefined}
        onFinished={handleFinished}
        onRipAgain={() => handleRipAgain(1)}
        onGoHome={handleGoHome}
        onViewCollection={handleViewCollection}
        isRipAgainWorking={flow.isPurchasing}
      />
    );
  }

  return (
    <RevealEngine
      key={flow.purchaseId ?? undefined}
      config={flow.config}
      items={flow.items}
      rarityTiers={flow.sku.rarityTiers}
      packId={flow.sku.id}
      purchaseId={flow.purchaseId}
      packPriceCents={flow.sku.priceCents}
      onViewDetails={handleViewWatchDetails}
      onKeep={handleViewCollection}
      onListForSale={handleListForSale}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: { color: colors.textPrimary, ...typography.title },
  emptyNote: { color: colors.textSecondary, ...typography.body, textAlign: "center" },
});

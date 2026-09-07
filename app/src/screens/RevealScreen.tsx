import { StyleSheet, Text, View } from "react-native";
import { usePackFlowViewModel } from "../viewmodels/usePackFlowViewModel";
import { RevealEngine } from "../engine/core/RevealEngine";
import { CardFlowEngine } from "../engine/cards/CardFlowEngine";
import { ScreenBackground } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme/tokens";
import { reveal as revealCopy } from "../content/copy";

/**
 * Cards purchases run through the new multi-phase `CardFlowEngine`
 * (processing → ready → rip → summary). Watches purchases TEMPORARILY still
 * render the old single-gesture `RevealEngine` — its own multi-phase
 * `VaultFlowEngine` (per the "rebuild purchase+reveal flows" plan) is a
 * later pass.
 */
export function RevealScreen() {
  const flow = usePackFlowViewModel();

  if (!flow.isActive || !flow.config || !flow.items || !flow.sku) {
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
    return <CardFlowEngine sku={flow.sku} items={flow.items} onFinished={flow.finishFlow} />;
  }

  return (
    <RevealEngine
      config={flow.config}
      items={flow.items}
      rarityTiers={flow.sku.rarityTiers}
      packPriceCents={flow.sku.priceCents}
      onFinished={flow.finishFlow}
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

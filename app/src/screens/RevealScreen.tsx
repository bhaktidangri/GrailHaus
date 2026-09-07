import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePackFlowViewModel } from "../viewmodels/usePackFlowViewModel";
import { RevealEngine } from "../engine/core/RevealEngine";
import { CardFlowEngine } from "../engine/cards/CardFlowEngine";
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

  function handleFinished() {
    flow.finishFlow();
    if (navigation.canGoBack()) navigation.goBack();
  }

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
    return <CardFlowEngine sku={flow.sku} items={flow.items} onFinished={handleFinished} />;
  }

  return (
    <RevealEngine
      config={flow.config}
      items={flow.items}
      rarityTiers={flow.sku.rarityTiers}
      packPriceCents={flow.sku.priceCents}
      onFinished={handleFinished}
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

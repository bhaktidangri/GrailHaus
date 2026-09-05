import { StyleSheet, Text, View } from "react-native";
import { useRevealViewModel } from "../viewmodels/useRevealViewModel";
import { RevealEngine } from "../engine/core/RevealEngine";
import { ScreenBackground } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme/tokens";

export function RevealScreen() {
  const reveal = useRevealViewModel();

  if (!reveal.isActive || !reveal.config || !reveal.items || !reveal.sku) {
    return (
      <ScreenBackground>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No pack open</Text>
          <Text style={styles.emptyNote}>Rip a pack from the Shelf to see it here.</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <RevealEngine
      config={reveal.config}
      items={reveal.items}
      rarityTiers={reveal.sku.rarityTiers}
      packPriceCents={reveal.sku.priceCents}
      onFinished={reveal.finishReveal}
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

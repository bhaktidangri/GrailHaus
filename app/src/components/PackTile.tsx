import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { PackSku } from "@grailhaus/shared";
import { colors, radii, shadow, spacing, typography } from "../theme/tokens";
import { Price } from "./Price";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIER_GRADIENTS: Record<string, [string, string]> = {
  street_rip: ["#5b9dff", "#2f6fed"],
  vault_break: ["#c88cff", "#8a4fe0"],
  black_label: ["#ffd35c", "#e0a012"],
  reserve: ["#5b9dff", "#2f6fed"],
  archive: ["#c88cff", "#8a4fe0"],
  obsidian_vault: ["#4a4a52", "#1a1a1f"],
};

export function PackTile({ sku, onPress }: { sku: PackSku; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const gradient = TIER_GRADIENTS[sku.tier] ?? TIER_GRADIENTS.street_rip;
  const countLabel =
    sku.category === "cards" ? `${sku.itemCount} CARDS` : sku.itemCount === 1 ? "1 WATCH" : `${sku.itemCount} WATCHES`;

  return (
    <AnimatedPressable
      style={[styles.tile, shadow.tile, animatedStyle]}
      onPressIn={() => (scale.value = withSpring(0.96, { damping: 15 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
      onPress={onPress}
    >
      <LinearGradient colors={gradient} style={styles.art} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.sheen} />
        <View style={styles.packShape} />
      </LinearGradient>
      <View style={styles.tierChip}>
        <Text style={styles.tierText}>{countLabel}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {sku.name}
      </Text>
      <Price cents={sku.priceCents} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderBottomWidth: 5,
    padding: spacing.md,
    gap: spacing.xs,
  },
  art: {
    height: 100,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: -20,
    left: -30,
    width: 90,
    height: 160,
    backgroundColor: "#ffffff33",
    transform: [{ rotate: "25deg" }],
  },
  packShape: {
    width: 44,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: "#ffffffcc",
  },
  tierChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
  },
  tierText: { color: colors.blueDeep, ...typography.caption },
  name: { color: colors.textPrimary, ...typography.body },
});

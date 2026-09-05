import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, radii, spacing, typography } from "../theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VARIANTS = {
  gold: { top: colors.gold, bottom: colors.goldDeep, ledge: "#b17a0a", text: colors.textPrimary },
  blue: { top: colors.blue, bottom: colors.blueDeep, ledge: "#163b96", text: "#ffffff" },
};

export function GlossyButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "gold",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: keyof typeof VARIANTS;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const palette = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      style={[styles.wrap, { borderColor: palette.ledge }, animatedStyle, isDisabled && styles.disabled]}
      onPressIn={() => !isDisabled && (scale.value = withSpring(0.96, { damping: 15 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
      onPress={onPress}
      disabled={isDisabled}
    >
      <LinearGradient colors={[palette.top, palette.bottom]} style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={palette.text} />
        ) : (
          <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    borderBottomWidth: 4,
    overflow: "hidden",
  },
  gradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.title, fontSize: 16 },
  disabled: { opacity: 0.5 },
});

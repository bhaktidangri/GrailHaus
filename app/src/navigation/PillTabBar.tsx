import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { accents, ink, typography } from "../theme/tokens";
import { useTabBarHidden } from "./tabBarVisibility";

/** The mockup's floating pill nav: active tab gets a gradient chip and a
 * visible label; inactive tabs are just an icon-shaped outline. Slides down
 * and fades out while a screen is scrolled down, and back on scroll-up —
 * see tabBarVisibility.ts for the shared value driving this. */
export function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hidden = useTabBarHidden();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * 120 }],
    opacity: 1 - hidden.value,
  }));

  return (
    <Animated.View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) }, animatedStyle]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
          const isFocused = state.index === index;

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tabWrap}>
              {isFocused ? (
                <LinearGradient colors={[accents.cards.top, accents.cards.bottom]} style={styles.tabActive}>
                  <View style={styles.iconActive} />
                  <Text style={styles.labelActive}>{label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabInactive}>
                  <View style={styles.iconInactive} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  bar: {
    height: 62,
    borderRadius: 999,
    backgroundColor: ink.card,
    borderWidth: 1.5,
    borderColor: ink.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
  },
  tabWrap: { flex: 1 },
  tabActive: {
    height: 48,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
  },
  tabInactive: { height: 48, alignItems: "center", justifyContent: "center" },
  iconActive: { width: 15, height: 15, borderRadius: 5, borderWidth: 2.2, borderColor: ink.text },
  iconInactive: { width: 15, height: 15, borderRadius: 5, borderWidth: 2.2, borderColor: "rgba(255,255,255,0.45)" },
  labelActive: typography.tabLabel,
});

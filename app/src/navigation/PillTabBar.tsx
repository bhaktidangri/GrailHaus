import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { accents, ink, typography } from "../theme/tokens";
import { TAB_BAR_HEIGHT, useTabBarHidden } from "./tabBarVisibility";

/** The mockup's floating pill nav: active tab gets a gradient chip and a
 * visible label; inactive tabs are just an icon-shaped outline. Slides down
 * and fades out while a screen is scrolled down, and back on scroll-up —
 * see tabBarVisibility.ts for the shared value driving this.
 *
 * `position: "absolute"` here is load-bearing: react-navigation's
 * bottom-tabs otherwise lays this component out as a normal flex sibling
 * above the screen content, reserving its own row painted in the
 * navigator's flat background color — a rectangle that doesn't match
 * whatever the active screen actually looks like, sitting behind the
 * "floating" pill and defeating the point of it. Taking this out of flow
 * lets the screen's own content extend all the way to the bottom of the
 * viewport, so there's nothing back there but that content — the pill
 * genuinely floats over it. (Screens are responsible for their own bottom
 * clearance via `useTabBarClearance()` so their last row isn't permanently
 * covered by the pill at rest.) */
export function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hidden = useTabBarHidden();
  const bottomPad = Math.max(insets.bottom, 16);
  // Clears the pill's own footprint plus a little extra so it's fully off-screen (not just
  // invisible) once hidden, and can't intercept touches meant for the content behind it.
  const hideDistance = TAB_BAR_HEIGHT + bottomPad + 24;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * hideDistance }],
    opacity: 1 - hidden.value,
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomPad }, animatedStyle]}
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
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 999,
    backgroundColor: ink.card,
    borderWidth: 1.5,
    borderColor: ink.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
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

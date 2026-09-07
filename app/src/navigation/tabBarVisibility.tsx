import { createContext, useContext, type ReactNode } from "react";
import { useSharedValue, useAnimatedScrollHandler, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The pill's own height — shared with PillTabBar.tsx so the two can never drift apart. */
export const TAB_BAR_HEIGHT = 62;

const TabBarHiddenContext = createContext<SharedValue<number> | null>(null);

/** Wraps the tab navigator so any scrollable screen inside it can hide/show
 * the floating pill tab bar in response to scroll direction — one shared
 * value (0 = shown, 1 = hidden), read by PillTabBar and written by every
 * screen's scroll handler below. */
export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const hidden = useSharedValue(0);
  return <TabBarHiddenContext.Provider value={hidden}>{children}</TabBarHiddenContext.Provider>;
}

export function useTabBarHidden(): SharedValue<number> {
  const ctx = useContext(TabBarHiddenContext);
  if (!ctx) throw new Error("useTabBarHidden must be used within TabBarVisibilityProvider");
  return ctx;
}

/** Below this much scroll delta in one update, don't react — otherwise the
 * tiny deltas FlatList/ScrollView emit while momentum-settling flicker the
 * bar in and out. */
const SCROLL_DELTA_THRESHOLD = 6;

/**
 * The pill nav floats over screen content (`position: "absolute"` in
 * PillTabBar) rather than reserving its own row, so any screen with content
 * that can reach the bottom of the viewport needs this much extra bottom
 * padding/margin to keep that content from sitting underneath the pill. */
export function useTabBarClearance(extraGap = 24) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 16) + extraGap;
}

/**
 * Attach to any scrollable screen's `onScroll` (via `Animated.ScrollView` /
 * `Animated.FlatList` from `react-native-reanimated`, with
 * `scrollEventThrottle={16}`) to drive the shared tab bar in and out of view:
 * scrolling down past the threshold hides it, scrolling up — or being at the
 * very top — brings it back.
 */
export function useHideTabBarOnScroll() {
  const hidden = useTabBarHidden();
  const lastY = useSharedValue(0);

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      const y = event.contentOffset.y;
      const delta = y - lastY.value;
      if (y <= 0) {
        hidden.value = withTiming(0, { duration: 200 });
      } else if (delta > SCROLL_DELTA_THRESHOLD) {
        hidden.value = withTiming(1, { duration: 200 });
      } else if (delta < -SCROLL_DELTA_THRESHOLD) {
        hidden.value = withTiming(0, { duration: 200 });
      }
      lastY.value = y;
    },
  });
}

import type { ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import type { CategoryRevealConfig } from "./types";

interface GestureLayerProps {
  gesture: CategoryRevealConfig["gesture"];
  onComplete: () => void;
  children: (openProgress: SharedValue<number>) => ReactNode;
}

/**
 * The one gesture implementation every category shares: 1:1 tracking (the
 * object follows the finger directly, never animates to a preset),
 * reversible mid-drag (progress is always derived from current translation,
 * never accumulated), velocity-aware completion (a flick finishes even
 * short of full travel), and interruptible (a new gesture simply starts
 * driving `openProgress` again, overriding any in-flight settle animation).
 * `config.gesture.mode` only changes which axis it reads — the physics are
 * identical across categories.
 */
export function GestureLayer({ gesture, onComplete, children }: GestureLayerProps) {
  const openProgress = useSharedValue(0);
  const axis = gesture.mode === "tear" ? "x" : "y";

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      "worklet";
      const raw = axis === "x" ? event.translationX : -event.translationY;
      openProgress.value = Math.max(0, Math.min(1, raw / gesture.travelDistance));
    })
    .onEnd((event) => {
      "worklet";
      const velocity = axis === "x" ? event.velocityX : -event.velocityY;
      const completed = velocity > gesture.velocityThreshold || openProgress.value >= 1;
      if (completed) {
        openProgress.value = withTiming(1, { duration: 180 });
        runOnJS(onComplete)();
      } else {
        openProgress.value = withSpring(0);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }}>{children(openProgress)}</View>
    </GestureDetector>
  );
}

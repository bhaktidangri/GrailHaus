import * as Haptics from "expo-haptics";
import type { HapticStep } from "./types";

const play: Record<HapticStep["kind"], () => Promise<void> | void> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

/** Schedules a sequenced haptic track (not a single buzz-on-success). Returns a canceller. */
export function playHapticTrack(steps: HapticStep[]): () => void {
  const timers = steps.map((step) => setTimeout(() => play[step.kind](), step.atMs));
  return () => timers.forEach(clearTimeout);
}

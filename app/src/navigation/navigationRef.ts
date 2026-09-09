import { createNavigationContainerRef } from "@react-navigation/native";
import type { AppStackParamList } from "./AppNavigator";

/**
 * A ref onto the root NavigationContainer (attached in App.tsx), so app-shell code that isn't
 * itself a screen — most notably the boot/foreground reveal-resume check in App.tsx — can push
 * the Reveal screen without needing a navigation prop. Type-only import of AppStackParamList
 * keeps this from creating a runtime cycle with AppNavigator.tsx.
 */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

/**
 * Safe to call before the container has mounted (e.g. a resume check that finishes while the
 * splash screen is still up) — silently does nothing rather than throwing; App.tsx's
 * `onReady` callback covers that race by re-checking for a resumed flow once the container
 * actually comes up. Also safe to call more than once for the same resume (the boot effect and
 * `onReady` can both fire close together) — a no-op once Reveal is already the front screen,
 * rather than pushing a duplicate.
 */
export function navigateToReveal(): void {
  if (!navigationRef.isReady()) return;
  if (navigationRef.getCurrentRoute()?.name === "Reveal") return;
  navigationRef.navigate("Reveal");
}

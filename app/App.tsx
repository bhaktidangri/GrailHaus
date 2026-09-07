import { useCallback, useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { TitleScreen } from "./src/screens/TitleScreen";
import { OnboardingScreen } from "./src/screens/onboarding/OnboardingScreen";
import { queryClient } from "./src/state/queryClient";
import { useOnboardingStore } from "./src/state/onboardingStore";
import { useAuthStore } from "./src/state/authStore";
import { AuthProvider } from "./src/providers/AuthProvider";
import { colors } from "./src/theme/tokens";
import { getOnboardingComplete, setOnboardingComplete } from "./src/lib/onboarding";

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.textPrimary,
    border: colors.outlineSoft,
    primary: colors.violetTop,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });
  const needsOnboardingFlag = useOnboardingStore((s) => s.needsOnboarding);
  const setNeedsOnboarding = useOnboardingStore((s) => s.setNeedsOnboarding);
  // The title screen (mockup turn 10) is a game-style launch beat shown every cold start, not
  // a one-time flag — it's session-only state, unlike onboarding's persisted "seen it" flag.
  const [started, setStarted] = useState(false);
  // AuthProvider (mounted below, unconditionally) hydrates both of these from the token
  // persisted in SecureStore — see providers/AuthProvider.tsx. `isReady` here waits for that
  // hydration too, so the onboarding-vs-home decision never runs against a still-unknown session.
  const token = useAuthStore((s) => s.token);
  const authReady = useAuthStore((s) => s.isReady);

  useEffect(() => {
    // Always show onboarding in dev builds — otherwise the persisted "seen it"
    // flag makes it disappear after the first run, which fights iterating on it.
    getOnboardingComplete().then((done) => setNeedsOnboarding(__DEV__ ? true : !done));
  }, [setNeedsOnboarding]);

  const isReady = fontsLoaded && needsOnboardingFlag !== null && authReady;

  const onLayout = useCallback(async () => {
    if (isReady) await SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  // A restored session token means this is a returning, already-known user — send them
  // straight to Home regardless of this device's own "seen the carousel" flag (and regardless
  // of the dev override above). Onboarding is only ever for someone who isn't signed in yet.
  const showOnboarding = !token && needsOnboardingFlag;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          {/* Mounted unconditionally (not just around AppNavigator) so its token hydration —
              what `isReady`/`showOnboarding` above depend on — always runs, even while the
              splash/onboarding gate above is still deciding what to show first. */}
          <AuthProvider>
            {!isReady ? null : !started ? (
              <TitleScreen onStart={() => setStarted(true)} />
            ) : showOnboarding ? (
              <OnboardingScreen
                onDone={() => {
                  setOnboardingComplete();
                  setNeedsOnboarding(false);
                }}
              />
            ) : (
              <NavigationContainer theme={navTheme}>
                <AppNavigator />
              </NavigationContainer>
            )}
          </AuthProvider>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

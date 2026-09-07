import { useCallback, useEffect } from "react";
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
import { OnboardingScreen } from "./src/screens/onboarding/OnboardingScreen";
import { queryClient } from "./src/state/queryClient";
import { useOnboardingStore } from "./src/state/onboardingStore";
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
  const needsOnboarding = useOnboardingStore((s) => s.needsOnboarding);
  const setNeedsOnboarding = useOnboardingStore((s) => s.setNeedsOnboarding);

  useEffect(() => {
    // Always show onboarding in dev builds — otherwise the persisted "seen it"
    // flag makes it disappear after the first run, which fights iterating on it.
    getOnboardingComplete().then((done) => setNeedsOnboarding(__DEV__ ? true : !done));
  }, [setNeedsOnboarding]);

  const isReady = fontsLoaded && needsOnboarding !== null;

  const onLayout = useCallback(async () => {
    if (isReady) await SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          {needsOnboarding ? (
            <OnboardingScreen
              onDone={() => {
                setOnboardingComplete();
                setNeedsOnboarding(false);
              }}
            />
          ) : (
            <AuthProvider>
              <NavigationContainer theme={navTheme}>
                <AppNavigator />
              </NavigationContainer>
            </AuthProvider>
          )}
          <StatusBar style="light" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

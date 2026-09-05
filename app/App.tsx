import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootTabs } from "./src/navigation/RootTabs";
import { queryClient } from "./src/state/queryClient";
import { AuthProvider } from "./src/providers/AuthProvider";
import { colors } from "./src/theme/tokens";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.skyTop,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.outlineSoft,
    primary: colors.blue,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer theme={navTheme}>
              <RootTabs />
            </NavigationContainer>
          </AuthProvider>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

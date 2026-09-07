import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { withTiming } from "react-native-reanimated";
import { HomeStack } from "./HomeStack";
import { DropsScreen } from "../screens/DropsScreen";
import { RevealScreen } from "../screens/RevealScreen";
import { CollectionStack } from "./CollectionStack";
import { MarketplaceStack } from "./MarketplaceStack";
import { DiscoverStack } from "./DiscoverStack";
import { PillTabBar } from "./PillTabBar";
import { TabBarVisibilityProvider, useTabBarHidden } from "./tabBarVisibility";
import { colors, typography } from "../theme/tokens";

export type RootTabParamList = {
  Home: undefined;
  Discover: undefined;
  Drops: undefined;
  Reveal: undefined;
  Portfolio: undefined;
  Marketplace: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabs() {
  return (
    <TabBarVisibilityProvider>
      <RootTabsInner />
    </TabBarVisibilityProvider>
  );
}

function RootTabsInner() {
  const hidden = useTabBarHidden();

  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      // Switching tabs always brings the bar back — landing on a fresh
      // screen with the nav chrome hidden from a scroll position on the
      // previous tab would be disorienting.
      screenListeners={{
        tabPress: () => {
          hidden.value = withTiming(0, { duration: 200 });
        },
      }}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTitleStyle: { ...typography.title, color: colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ headerShown: false }} />
      <Tab.Screen name="Discover" component={DiscoverStack} options={{ headerShown: false }} />
      <Tab.Screen name="Drops" component={DropsScreen} options={{ headerShown: false }} />
      <Tab.Screen
        name="Reveal"
        component={RevealScreen}
        options={{ title: "Reveal" }}
      />
      <Tab.Screen name="Portfolio" component={CollectionStack} options={{ headerShown: false }} />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

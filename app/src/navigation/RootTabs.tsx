import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ShelfScreen } from "../screens/ShelfScreen";
import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { RevealScreen } from "../screens/RevealScreen";
import { colors, typography } from "../theme/tokens";

export type RootTabParamList = {
  Shelf: undefined;
  Drops: undefined;
  Reveal: undefined;
  Portfolio: undefined;
  Marketplace: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { ...typography.title, color: colors.textPrimary },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineSoft,
          borderTopWidth: 2,
          height: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { ...typography.caption, textTransform: "none", fontSize: 11 },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Shelf" component={ShelfScreen} />
      <Tab.Screen name="Drops">
        {() => <PlaceholderScreen title="Drops" note="Timed drops go here (Deliverable 2)." />}
      </Tab.Screen>
      <Tab.Screen
        name="Reveal"
        component={RevealScreen}
        options={{ title: "Reveal" }}
      />
      <Tab.Screen name="Portfolio">
        {() => (
          <PlaceholderScreen title="Portfolio" note="Live-ticking portfolio goes here (Deliverable 3)." />
        )}
      </Tab.Screen>
      <Tab.Screen name="Marketplace">
        {() => (
          <PlaceholderScreen title="Marketplace" note="Peer-to-peer trading goes here (Deliverable 4)." />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

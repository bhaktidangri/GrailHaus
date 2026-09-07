import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootTabs } from "./RootTabs";
import { DropDetailScreen } from "../screens/DropDetailScreen";

/**
 * Root stack above the tab bar — exists so Drop Detail is reachable from both
 * Home (nested in HomeStack) and the Drops tab (flat) without duplicating the
 * screen in two places. React Navigation bubbles an unrecognised route name
 * up through parent navigators, so `navigate("DropDetail", ...)` from either
 * tab resolves here regardless of how deep it's called from.
 */
export type AppStackParamList = {
  Tabs: undefined;
  DropDetail: { packId: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={RootTabs} />
      <Stack.Screen name="DropDetail" component={DropDetailScreen} />
    </Stack.Navigator>
  );
}

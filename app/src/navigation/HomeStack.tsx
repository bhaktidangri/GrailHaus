import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Category } from "@grailhaus/shared";
import { HomeScreen } from "../screens/HomeScreen";
import { ShelfScreen } from "../screens/ShelfScreen";
import { PackDetailScreen } from "../screens/PackDetailScreen";

/**
 * Home replaces the old flat "Shelf" tab with a two-level drill-down, per the
 * mockup's Home → Card World / Watch World structure: the dashboard picks a
 * category, then hands off to a world screen that also carries its own
 * Cards/Watches switch, so a visitor can flip categories from either Home's
 * doors or the switch on the shelf itself. A tier row on the Cards side
 * drills one level further into `PackDetail` (odds, expected value,
 * collection preview) before a purchase — the Cards journey mockup no
 * longer buys straight off the tier list.
 */
export type HomeStackParamList = {
  Home: undefined;
  World: { category: Category };
  PackDetail: { skuId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="World" component={ShelfScreen} />
      <Stack.Screen name="PackDetail" component={PackDetailScreen} />
    </Stack.Navigator>
  );
}

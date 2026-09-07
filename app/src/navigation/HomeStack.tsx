import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Category } from "@grailhaus/shared";
import { HomeScreen } from "../screens/HomeScreen";
import { ShelfScreen } from "../screens/ShelfScreen";

/**
 * Home replaces the old flat "Shelf" tab with a two-level drill-down, per the
 * mockup's Home → Card World / Watch World structure: the dashboard picks a
 * category, then hands off to a category-committed world screen (no switch
 * inside it — the mockup never lets you flip categories once you're in a
 * world, only from Home's doors).
 */
export type HomeStackParamList = {
  Home: undefined;
  World: { category: Category };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="World" component={ShelfScreen} />
    </Stack.Navigator>
  );
}

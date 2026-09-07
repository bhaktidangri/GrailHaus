import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Category } from "@grailhaus/shared";
import { DiscoverScreen } from "../screens/discover/DiscoverScreen";
import { DiscoverCategoryScreen } from "../screens/discover/DiscoverCategoryScreen";
import { VersionsScreen } from "../screens/discover/VersionsScreen";
import { ItemForkScreen } from "../screens/discover/ItemForkScreen";
import type { DiscoverGroup, DiscoverItem } from "../viewmodels/useDiscoverViewModel";

export type DiscoverStackParamList = {
  Discover: undefined;
  DiscoverCategory: { category: Category };
  Versions: { category: Category; group: DiscoverGroup };
  ItemFork: { category: Category; item: DiscoverItem };
};

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="DiscoverCategory" component={DiscoverCategoryScreen} />
      <Stack.Screen name="Versions" component={VersionsScreen} />
      <Stack.Screen name="ItemFork" component={ItemForkScreen} />
    </Stack.Navigator>
  );
}

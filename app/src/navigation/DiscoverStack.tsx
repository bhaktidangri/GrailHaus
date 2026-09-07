import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Category } from "@grailhaus/shared";
import { DiscoverScreen } from "../screens/discover/DiscoverScreen";
import { DiscoverCategoryScreen } from "../screens/discover/DiscoverCategoryScreen";
import { VersionsScreen } from "../screens/discover/VersionsScreen";
import type { DiscoverGroup } from "../viewmodels/useDiscoverViewModel";

/** ItemFork now lives on the root stack (see AppNavigator) since Explore
 * also links into it, not just Discover's own drill-down. */
export type DiscoverStackParamList = {
  Discover: undefined;
  DiscoverCategory: { category: Category };
  Versions: { category: Category; group: DiscoverGroup };
};

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="DiscoverCategory" component={DiscoverCategoryScreen} />
      <Stack.Screen name="Versions" component={VersionsScreen} />
    </Stack.Navigator>
  );
}

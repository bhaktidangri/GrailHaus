import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Listing } from "@grailhaus/shared";
import { MarketplaceScreen } from "../screens/marketplace/MarketplaceScreen";
import { ListingDetailScreen } from "../screens/marketplace/ListingDetailScreen";
import { BuyListingScreen } from "../screens/marketplace/BuyListingScreen";

export type MarketplaceStackParamList = {
  Marketplace: undefined;
  ListingDetail: { listing: Listing };
  BuyListing: { listing: Listing };
};

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

export function MarketplaceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="BuyListing" component={BuyListingScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
}

import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { OwnedItem } from "@grailhaus/shared";
import { useCollectionViewModel } from "../../viewmodels/useCollectionViewModel";
import { useTabBarClearance } from "../../navigation/tabBarVisibility";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { ink, typography } from "../../theme/tokens";
import { vault as copy } from "../../content/copy";
import type { CollectionStackParamList } from "../../navigation/CollectionStack";

type Nav = NativeStackNavigationProp<CollectionStackParamList, "Vault">;

/** Watches: near-black, one column, one watch per row on a lit plinth (mockup 13c) — the
 * opposite register to the binder's grid. No completion meter: there's nothing to complete,
 * only pieces held. */
export function VaultScreen() {
  const navigation = useNavigation<Nav>();
  const vm = useCollectionViewModel();
  const tabBarClearance = useTabBarClearance();

  return (
    <View style={styles.fill}>
      {/* Bounded to the fixed header+summary (never scrolls) rather than the whole screen —
          a full-screen wash here would stay pinned behind the list's scrolled rows too. */}
      <LinearGradient colors={["rgba(242,196,107,0.22)", "transparent"]} style={styles.base} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
        <Text style={styles.headerLabel}>{copy.header}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.summary}>
        <Text style={styles.piecesHeld}>{copy.piecesHeld(vm.watches.length)}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{copy.appraised(vm.watchesValueCents)}</Text>
          <View style={styles.divider} />
          <Text style={styles.summaryText}>{copy.brands(vm.brands.length)}</Text>
        </View>
        <View style={styles.hairline} />
      </View>

      <FlatList
        data={vm.watches}
        keyExtractor={(o: OwnedItem) => o.ownedItemId}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
        ListEmptyComponent={<Text style={styles.empty}>{copy.empty}</Text>}
        renderItem={({ item: owned }: { item: OwnedItem }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate("WatchDetail", { owned })}>
            <WatchDial art={itemArtGradient(owned.item)} size={70} />
            <View style={styles.rowInfo}>
              <Text style={styles.brand}>{(owned.item.brand ?? "INDEPENDENT").toUpperCase()}</Text>
              <Text style={styles.name}>{owned.item.watchName ?? owned.item.name}</Text>
              <Text style={styles.ref}>{owned.item.modelName ?? rarityName(owned.item.rarityTierLevel)}</Text>
            </View>
            <View style={styles.rowValue}>
              <Text style={styles.priceText}>${(owned.item.currentValueCents / 100).toLocaleString()}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function rarityName(level: 1 | 2 | 3): string {
  return level === 3 ? "Apex" : level === 2 ? "Icon" : "Heritage";
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#020101" },
  base: { position: "absolute", top: 0, left: 0, right: 0, height: 260 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(242,196,107,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  backChevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2.2,
    borderBottomWidth: 2.2,
    borderColor: "#F2C46B",
    transform: [{ rotate: "45deg" }, { translateX: 1 }],
  },
  headerLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 10, letterSpacing: 3.4, color: "rgba(242,196,107,0.7)" },
  summary: { paddingHorizontal: 26, paddingTop: 26 },
  piecesHeld: { fontFamily: "Outfit_400Regular", fontSize: 30, letterSpacing: -0.3, color: ink.textOnWatches },
  summaryRow: { flexDirection: "row", alignItems: "baseline", gap: 14, marginTop: 12 },
  summaryText: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: "rgba(246,243,236,0.7)" },
  divider: { width: 1, height: 12, backgroundColor: "rgba(242,196,107,0.3)" },
  hairline: { height: 1, backgroundColor: "rgba(242,196,107,0.3)", marginTop: 22 },
  list: { paddingHorizontal: 26 },
  empty: { ...typography.footNote, textAlign: "center", marginTop: 60 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  rowInfo: { flex: 1, minWidth: 0 },
  brand: { fontFamily: "Outfit_600SemiBold", fontSize: 10, letterSpacing: 2.4, color: "rgba(242,196,107,0.75)" },
  name: { fontFamily: "Outfit_400Regular", fontSize: 21, color: ink.textOnWatches, marginTop: 5 },
  ref: { fontFamily: "Outfit_500Medium", fontSize: 11.5, color: "rgba(246,243,236,0.62)", marginTop: 4 },
  rowValue: { alignItems: "flex-end" },
  priceText: { fontFamily: "Outfit_600SemiBold", fontSize: 17, color: "#fff" },
});

import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { useDiscoverViewModel, type DiscoverGroup } from "../../viewmodels/useDiscoverViewModel";
import { useTabBarClearance } from "../../navigation/tabBarVisibility";
import { colors, ink, typography } from "../../theme/tokens";
import { discoverCategory as copy } from "../../content/copy";
import type { DiscoverStackParamList } from "../../navigation/DiscoverStack";

type Nav = NativeStackNavigationProp<DiscoverStackParamList, "DiscoverCategory">;
type Route = RouteProp<DiscoverStackParamList, "DiscoverCategory">;

export function DiscoverCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const { category } = useRoute<Route>().params;
  const vm = useDiscoverViewModel(category);
  const [query, setQuery] = useState("");
  const isWatch = category === "watches";
  const tabBarClearance = useTabBarClearance();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vm.groups;
    return vm.groups.filter(
      (g) => g.label.toLowerCase().includes(q) || g.versions.some((v) => v.detail.name.toLowerCase().includes(q))
    );
  }, [vm.groups, query]);

  function handlePress(group: DiscoverGroup) {
    if (group.versions.length === 1) {
      navigation.navigate("ItemFork", { category, item: group.versions[0] });
    } else {
      navigation.navigate("Versions", { category, group });
    }
  }

  return (
    <View style={styles.fill}>
      {/* Bounded to the fixed header+results label (never scrolls) rather than the whole
          screen — a full-screen wash here would stay pinned behind the list's scrolled rows too. */}
      <LinearGradient
        colors={[isWatch ? "rgba(242,196,107,0.2)" : "rgba(177,75,255,0.24)", "transparent"]}
        style={styles.base}
      />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
        <View style={[styles.searchBox, isWatch && styles.searchBoxWatch]}>
          <View style={styles.searchDot} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={isWatch ? "Search brands, models" : "Search Pokémon, cards, sets"}
            placeholderTextColor="rgba(255,255,255,0.45)"
          />
        </View>
      </View>

      <Text style={styles.resultsLabel}>{copy.resultsFor(results.length, query)}</Text>

      {vm.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(g: DiscoverGroup) => g.key}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
          ListEmptyComponent={<Text style={styles.empty}>{copy.empty}</Text>}
          renderItem={({ item: group }: { item: DiscoverGroup }) => {
            const primary = group.versions[0];
            return (
              <Pressable style={styles.row} onPress={() => handlePress(group)}>
                {isWatch ? (
                  <WatchDial art={itemArtGradient(primary.detail)} size={54} />
                ) : (
                  <CardFace gradient={itemArtGradient(primary.detail)} width={44} height={61} />
                )}
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{group.label}</Text>
                  <Text style={styles.rowSub}>
                    {group.versions.length > 1 ? copy.printings(group.versions.length) : group.subtitle}
                    {group.subtitle && group.versions.length > 1 ? ` · ${group.subtitle}` : ""}
                  </Text>
                  {group.ownedTotal > 0 && (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedText}>{copy.ownedBadge(group.ownedTotal)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.rowValue}>
                  <Text style={styles.priceText}>{copy.priceRange(group.minValueCents, group.maxValueCents)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  base: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  header: { paddingTop: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  backChevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2.2,
    borderBottomWidth: 2.2,
    borderColor: "#fff",
    transform: [{ rotate: "45deg" }, { translateX: 1 }],
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1.5,
    borderColor: "rgba(177,75,255,0.45)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 10,
  },
  searchBoxWatch: { borderColor: "rgba(242,196,107,0.4)" },
  searchDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 13.5, padding: 0 },
  resultsLabel: { ...typography.metaLine, paddingHorizontal: 20, paddingTop: 16 },
  loading: { marginTop: 60 },
  list: { padding: 20, paddingTop: 13, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { ...typography.packName, fontSize: 15 },
  rowSub: { ...typography.footNote, marginTop: 3 },
  ownedBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(99,232,92,0.2)",
    borderWidth: 1,
    borderColor: "rgba(99,232,92,0.42)",
  },
  ownedText: { ...typography.footNote, fontSize: 9, fontWeight: "800" as const, color: "#8BF285" },
  rowValue: { alignItems: "flex-end" },
  priceText: { ...typography.title, fontSize: 15 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 60 },
});

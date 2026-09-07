import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RarityTierLevel } from "@grailhaus/shared";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { useDiscoverViewModel, type DiscoverGroup, type DiscoverItem } from "../../viewmodels/useDiscoverViewModel";
import { useRarityTiers } from "../../viewmodels/useRarityTiers";
import { useTabBarClearance } from "../../navigation/tabBarVisibility";
import { colors, ink, typography } from "../../theme/tokens";
import { discoverCategory as copy } from "../../content/copy";
import type { DiscoverStackParamList } from "../../navigation/DiscoverStack";
import type { AppStackParamList } from "../../navigation/AppNavigator";

// ItemFork lives on the root stack now (see AppNavigator), not DiscoverStack.
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList>,
  NativeStackNavigationProp<DiscoverStackParamList, "DiscoverCategory">
>;
type Route = RouteProp<DiscoverStackParamList, "DiscoverCategory">;

type Facet = "identity" | "collections" | "rarities";

interface RowGroup {
  key: string;
  label: string;
  sub: string;
  minValueCents: number;
  maxValueCents: number;
  art: DiscoverItem;
  items: DiscoverItem[];
}

export function DiscoverCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const { category } = useRoute<Route>().params;
  const vm = useDiscoverViewModel(category);
  const [query, setQuery] = useState("");
  const [facet, setFacet] = useState<Facet>("identity");
  const isWatch = category === "watches";
  const tabBarClearance = useTabBarClearance();
  // Admin-configurable (rarity_tiers table), not a hardcoded name map — see useRarityTiers.ts.
  const rarityTiers = useRarityTiers(category);

  const identityResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vm.groups;
    return vm.groups.filter(
      (g) => g.label.toLowerCase().includes(q) || g.versions.some((v) => v.detail.name.toLowerCase().includes(q))
    );
  }, [vm.groups, query]);

  // Real, off the same catalog roster `vm.items` already carries — a collection is the
  // catalog's own `collection` field (e.g. "GrailHaus: Heritage Icons"), not invented grouping.
  const collectionGroups = useMemo(() => {
    const map = new Map<string, DiscoverItem[]>();
    for (const item of vm.items) {
      const key = item.detail.collection ?? "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()]
      .map(([key, items]) => ({
        key,
        label: key,
        sub: copy.itemCount(items.length),
        minValueCents: Math.min(...items.map((i) => i.detail.currentValueCents)),
        maxValueCents: Math.max(...items.map((i) => i.detail.currentValueCents)),
        art: items[0],
        items,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vm.items]);

  // Real tier buckets off `rarityTierLevel` — never a made-up tier, and a level with zero
  // items in this catalog simply doesn't get a row.
  const rarityGroups = useMemo(() => {
    const levels: RarityTierLevel[] = [1, 2, 3];
    return levels
      .map((level) => {
        const items = vm.items.filter((i) => i.detail.rarityTierLevel === level);
        if (items.length === 0) return null;
        return {
          key: String(level),
          label: rarityTiers[level]?.name ?? "",
          sub: copy.itemCount(items.length),
          minValueCents: Math.min(...items.map((i) => i.detail.currentValueCents)),
          maxValueCents: Math.max(...items.map((i) => i.detail.currentValueCents)),
          art: items[0],
          items,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g != null);
  }, [vm.items, rarityTiers]);

  function handleIdentityPress(group: DiscoverGroup) {
    if (group.versions.length === 1) {
      navigation.navigate("ItemFork", { category, item: group.versions[0] });
    } else {
      navigation.navigate("Versions", { category, group });
    }
  }

  function handleGroupPress(group: { label: string; items: DiscoverItem[] }) {
    navigation.navigate("CollectionDetail", { title: group.label, items: group.items });
  }

  return (
    <View style={styles.fill}>
      {/* Bounded to the fixed header+facet+results row (never scrolls) rather than the whole
          screen — a full-screen wash here would stay pinned behind the list's scrolled rows too. */}
      <LinearGradient
        colors={[isWatch ? "rgba(242,196,107,0.2)" : "rgba(177,75,255,0.24)", "transparent"]}
        style={styles.base}
      />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
        {facet === "identity" ? (
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
        ) : (
          <Text style={styles.headerTitle}>{isWatch ? "Watch Discovery" : "Card Discovery"}</Text>
        )}
      </View>

      <View style={styles.facetRow}>
        <FacetChip
          label={copy.facetIdentity[category]}
          active={facet === "identity"}
          isWatch={isWatch}
          onPress={() => setFacet("identity")}
        />
        <FacetChip
          label={copy.facetCollections}
          active={facet === "collections"}
          isWatch={isWatch}
          onPress={() => setFacet("collections")}
        />
        <FacetChip
          label={copy.facetRarities}
          active={facet === "rarities"}
          isWatch={isWatch}
          onPress={() => setFacet("rarities")}
        />
      </View>

      {facet === "identity" && <Text style={styles.resultsLabel}>{copy.resultsFor(identityResults.length, query)}</Text>}

      {vm.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : facet === "identity" ? (
        <FlatList
          data={identityResults}
          keyExtractor={(g: DiscoverGroup) => g.key}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
          ListEmptyComponent={<Text style={styles.empty}>{copy.empty}</Text>}
          renderItem={({ item: group }: { item: DiscoverGroup }) => {
            const primary = group.versions[0];
            return (
              <Pressable style={styles.row} onPress={() => handleIdentityPress(group)}>
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
      ) : (
        <FlatList
          data={facet === "collections" ? collectionGroups : rarityGroups}
          keyExtractor={(g: RowGroup) => g.key}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
          ListEmptyComponent={<Text style={styles.empty}>{copy.empty}</Text>}
          renderItem={({ item: group }: { item: RowGroup }) => (
            <Pressable style={styles.row} onPress={() => handleGroupPress(group)}>
              {isWatch ? (
                <WatchDial art={itemArtGradient(group.art.detail)} size={54} />
              ) : (
                <CardFace gradient={itemArtGradient(group.art.detail)} width={44} height={61} />
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{group.label}</Text>
                <Text style={styles.rowSub}>{group.sub}</Text>
              </View>
              <View style={styles.rowValue}>
                <Text style={styles.priceText}>{copy.priceRange(group.minValueCents, group.maxValueCents)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function FacetChip({
  label,
  active,
  isWatch,
  onPress,
}: {
  label: string;
  active: boolean;
  isWatch: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.chip,
        active && (isWatch ? styles.chipActiveWatch : styles.chipActiveCards),
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
  headerTitle: { ...typography.title, fontSize: 16 },
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
  facetRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
  },
  chipActiveCards: { backgroundColor: "rgba(177,75,255,0.24)", borderColor: "rgba(177,75,255,0.6)" },
  chipActiveWatch: { backgroundColor: "rgba(242,196,107,0.22)", borderColor: "rgba(242,196,107,0.55)" },
  chipText: { ...typography.metaLine, fontSize: 11.5, color: "rgba(255,255,255,0.6)" },
  chipTextActive: { color: "#fff" },
  resultsLabel: { ...typography.metaLine, paddingHorizontal: 20, paddingTop: 14 },
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

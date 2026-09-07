import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import { useCollectionsViewModel, type CatalogCollectionGroup } from "../../viewmodels/useCollectionsViewModel";
import { useTabBarClearance } from "../../navigation/tabBarVisibility";
import { colors, ink, typography } from "../../theme/tokens";
import { collections as copy, discoverCategory as categoryCopy } from "../../content/copy";
import type { DiscoverStackParamList } from "../../navigation/DiscoverStack";

type Nav = NativeStackNavigationProp<DiscoverStackParamList, "Collections">;

const CATEGORY_LABEL: Record<"cards" | "watches", string> = { cards: "Cards", watches: "Watches" };

/**
 * The Discover hub's third door — every named collection across both worlds, not filtered to
 * one category. Built from `useCollectionsViewModel`, which is itself just the same two
 * `useDiscoverViewModel("cards")`/`("watches")` calls Explore already makes, regrouped by the
 * catalog's real `collection` field instead of by Pokémon/brand identity.
 */
export function CollectionsScreen() {
  const navigation = useNavigation<Nav>();
  const vm = useCollectionsViewModel();
  const tabBarClearance = useTabBarClearance();

  return (
    <View style={styles.fill}>
      <LinearGradient colors={["rgba(255,255,255,0.06)", "transparent"]} style={styles.base} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
        <Text style={styles.headerLabel}>{copy.title.toUpperCase()}</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.body}>{copy.body}</Text>

      {vm.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : (
        <FlatList
          data={vm.groups}
          keyExtractor={(g: CatalogCollectionGroup) => g.key}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
          ListEmptyComponent={<Text style={styles.empty}>{copy.empty}</Text>}
          renderItem={({ item: group }: { item: CatalogCollectionGroup }) => {
            const primary = group.items[0];
            const isWatch = primary.detail.category === "watches";
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate("CollectionDetail", { title: group.label, items: group.items })}
              >
                {isWatch ? (
                  <WatchDial art={itemArtGradient(primary.detail)} size={52} />
                ) : (
                  <CardFace gradient={itemArtGradient(primary.detail)} width={44} height={61} />
                )}
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {group.label}
                  </Text>
                  <Text style={styles.rowSub}>
                    {categoryCopy.itemCount(group.items.length)} · {copy.categoriesLabel(group.categories.map((c) => CATEGORY_LABEL[c]))}
                  </Text>
                </View>
                <View style={styles.rowValue}>
                  <Text style={styles.priceText}>
                    {categoryCopy.priceRange(group.minValueCents, group.maxValueCents)}
                  </Text>
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
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  backChevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2.2,
    borderBottomWidth: 2.2,
    borderColor: "#fff",
    transform: [{ rotate: "45deg" }, { translateX: 1 }],
  },
  headerLabel: { ...typography.eyebrow, letterSpacing: 2.4 },
  body: { ...typography.sectionSub, paddingHorizontal: 20, paddingTop: 14 },
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
  rowValue: { alignItems: "flex-end" },
  priceText: { ...typography.title, fontSize: 14 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 60 },
});

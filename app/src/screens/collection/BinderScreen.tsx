import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { OwnedItem } from "@grailhaus/shared";
import { useCollectionViewModel } from "../../viewmodels/useCollectionViewModel";
import { CardFace } from "../../components/CardFace";
import { itemArtGradient } from "../../content/cardArt";
import { colors, typography } from "../../theme/tokens";
import { binder as copy } from "../../content/copy";
import type { CollectionStackParamList } from "../../navigation/CollectionStack";

type Nav = NativeStackNavigationProp<CollectionStackParamList, "Binder">;
type Route = RouteProp<CollectionStackParamList, "Binder">;

/** Cards get a grid — nine to a page in the mockup, a scrolling 3-column grid here — filtered
 * by collection with real counts. No "still missing" section: knowing what's *not* owned needs
 * a full per-collection catalog listing the API doesn't expose today (only /items/:id, one at a
 * time) — see the note on useCollectionViewModel. Showing a fabricated "7 / 9" would be worse
 * than not showing it. */
export function BinderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const vm = useCollectionViewModel();
  const [filter, setFilter] = useState<string | null>(route.params?.collectionFilter ?? null);

  const visible = useMemo(
    () => (filter ? vm.cards.filter((o) => (o.item.collection ?? "Uncategorized") === filter) : vm.cards),
    [vm.cards, filter]
  );

  return (
    <View style={styles.fill}>
      <View style={styles.base} />
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
        <Text style={styles.headerTitle}>{copy.header}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.chipRow}>
        <Pressable style={[styles.chip, filter == null && styles.chipActive]} onPress={() => setFilter(null)}>
          <Text style={[styles.chipText, filter == null && styles.chipTextActive]}>{copy.all(vm.cards.length)}</Text>
        </Pressable>
        {vm.collections.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.chip, filter === c.key && styles.chipActive]}
            onPress={() => setFilter(c.key)}
          >
            <Text style={[styles.chipText, filter === c.key && styles.chipTextActive]}>
              {c.label} {c.items.length}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(o: OwnedItem) => o.ownedItemId}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={<Text style={styles.empty}>{copy.empty}</Text>}
        renderItem={({ item: owned }: { item: OwnedItem }) => (
          <Pressable style={styles.cell} onPress={() => navigation.navigate("CardDetail", { owned })}>
            <CardFace gradient={itemArtGradient(owned.item)} width={cellWidth} height={cellWidth * 1.36} />
            <Text style={styles.cellName} numberOfLines={1}>
              {(owned.item.cardTitle ?? owned.item.name).toUpperCase()}
            </Text>
            <Text style={styles.cellValue}>${(owned.item.currentValueCents / 100).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const cellWidth = 108;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  base: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 38,
    height: 38,
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
  headerTitle: { ...typography.title, fontSize: 15 },
  chipRow: { flexDirection: "row", gap: 7, paddingHorizontal: 20, paddingTop: 16, flexWrap: "wrap" },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    marginBottom: 7,
  },
  chipActive: { backgroundColor: colors.violetTop, borderColor: colors.violetTop },
  chipText: { ...typography.metaLine, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  chipTextActive: { color: "#fff" },
  grid: { padding: 20, paddingTop: 8, gap: 14 },
  gridRow: { gap: 9 },
  cell: { width: cellWidth },
  cellName: { ...typography.footNote, fontWeight: "800" as const, color: "#fff", marginTop: 6, fontSize: 9 },
  cellValue: { ...typography.footNote, color: colors.goldTop, marginTop: 1, fontSize: 9 },
  empty: { ...typography.sectionSub, textAlign: "center", marginTop: 60, width: "100%" },
});

import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CardFace } from "../../components/CardFace";
import { WatchDial } from "../../components/WatchDial";
import { itemArtGradient } from "../../content/cardArt";
import type { DiscoverItem } from "../../viewmodels/useDiscoverViewModel";
import { colors, typography } from "../../theme/tokens";
import { versions as copy } from "../../content/copy";
import type { DiscoverStackParamList } from "../../navigation/DiscoverStack";

type Nav = NativeStackNavigationProp<DiscoverStackParamList, "Versions">;
type Route = RouteProp<DiscoverStackParamList, "Versions">;

const RARITY_NAME: Record<1 | 2 | 3, string> = { 1: "Core / Heritage", 2: "Prime / Icon", 3: "Grail / Apex" };

/** "Same Pokémon, nine printings, three tiers of scarcity" (mockup 18a) — every version of one
 * name/brand, ordered rarest-last so the chase piece anchors the bottom of the list. */
export function VersionsScreen() {
  const navigation = useNavigation<Nav>();
  const { category, group } = useRoute<Route>().params;
  const isWatch = category === "watches";

  return (
    <View style={styles.fill}>
      <View style={[styles.base, isWatch && styles.baseWatch]} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backChevron} />
        </Pressable>
        <Text style={styles.headerLabel}>{copy.header.toUpperCase()}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.titleRow}>
        {isWatch ? (
          <WatchDial art={itemArtGradient(group.versions[0].detail)} size={58} />
        ) : (
          <CardFace gradient={itemArtGradient(group.versions[0].detail)} width={48} height={67} />
        )}
        <View style={styles.titleInfo}>
          <Text style={styles.name}>{group.label}</Text>
          <Text style={styles.sub}>
            {[group.subtitle, copy.versionCount(group.versions.length), group.ownedTotal > 0 ? `you hold ${group.ownedTotal}` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </View>

      <FlatList
        data={group.versions}
        keyExtractor={(v: DiscoverItem) => v.detail.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: v }: { item: DiscoverItem }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate("ItemFork", { category, item: v })}>
            {isWatch ? (
              <WatchDial art={itemArtGradient(v.detail)} size={56} />
            ) : (
              <CardFace gradient={itemArtGradient(v.detail)} width={56} height={78} />
            )}
            <View style={styles.rowInfo}>
              <View style={styles.rowBadges}>
                <Text style={styles.tierLabel}>{RARITY_NAME[v.detail.rarityTierLevel]}</Text>
                {v.ownedCount > 0 && (
                  <View style={styles.ownedBadge}>
                    <Text style={styles.ownedText}>{copy.ownedBadge(v.ownedCount)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemName}>{(v.detail.cardTitle ?? v.detail.watchName ?? v.detail.name).toUpperCase()}</Text>
              <Text style={styles.itemMeta}>
                {v.listedCount > 0 ? copy.listedBadge(v.listedCount) : copy.noneListed}
              </Text>
            </View>
            <View style={styles.rowValue}>
              <Text style={styles.priceText}>${(v.detail.currentValueCents / 100).toLocaleString()}</Text>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.footerHint}>{copy.tapHint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  base: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  baseWatch: { backgroundColor: "#0A0705" },
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
  titleRow: { flexDirection: "row", gap: 14, alignItems: "center", paddingHorizontal: 20, paddingTop: 18 },
  titleInfo: { flex: 1, minWidth: 0 },
  name: { ...typography.pageHeading, fontSize: 26 },
  sub: { ...typography.sectionSub, marginTop: 5 },
  list: { padding: 20, paddingTop: 14, gap: 11 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 13,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowBadges: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierLabel: { ...typography.eyebrow, fontSize: 9 },
  ownedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "rgba(99,232,92,0.18)",
    borderWidth: 1,
    borderColor: "rgba(99,232,92,0.4)",
  },
  ownedText: { fontSize: 8, fontWeight: "800" as const, letterSpacing: 1, color: "#8BF285" },
  itemName: { ...typography.packName, fontSize: 15, marginTop: 5 },
  itemMeta: { ...typography.footNote, marginTop: 3 },
  rowValue: { alignItems: "flex-end" },
  priceText: { ...typography.title, fontSize: 15 },
  footer: { padding: 20, alignItems: "center" },
  footerHint: { ...typography.footNote },
});

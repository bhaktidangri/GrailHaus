import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { CardFace } from "../../components/CardFace";
import { itemArtGradient } from "../../content/cardArt";
import { useCollectionViewModel } from "../../viewmodels/useCollectionViewModel";
import { colors, ink, typography } from "../../theme/tokens";
import { itemDetail as copy } from "../../content/copy";
import type { CollectionStackParamList } from "../../navigation/CollectionStack";

type Nav = NativeStackNavigationProp<CollectionStackParamList, "CardDetail">;
type Route = RouteProp<CollectionStackParamList, "CardDetail">;

/** Traits come off the catalog as a bullet-separated string ("Rookie Icon • Bright Pull •
 * Spark"), not comma-separated — split on either so a stray comma in future catalog data
 * doesn't silently merge two traits into one chip. */
function splitTraits(traits: string | null): string[] {
  if (!traits) return [];
  return traits
    .split(/[•,]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function CardDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { owned } = useRoute<Route>().params;
  const vm = useCollectionViewModel();
  const item = owned.item;

  const copiesOwned = useMemo(
    () => vm.cards.filter((o) => o.item.id === item.id).length,
    [vm.cards, item.id]
  );

  const acquiredDate = new Date(owned.acquiredAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const traits = splitTraits(item.traits);
  const collectionName = item.collection ?? "Uncategorized";

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Wash lives in content coordinates, not as a screen-fixed sibling — a fixed wash
            would stay pinned to the viewport as the header/hero scroll away, bleeding into
            whatever section (traits, value, acquired) scrolls into that same screen region. */}
        <View style={styles.heroWrap}>
          <LinearGradient colors={["rgba(177,75,255,0.24)", "transparent"]} style={StyleSheet.absoluteFill} />

          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => navigation.goBack()} hitSlop={12}>
              <View style={styles.backChevron} />
            </Pressable>
            <Text style={styles.headerLabel}>
              {copy.owned}
              {copiesOwned > 1 ? ` · ${copiesOwned}×` : ""}
            </Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.heroRow}>
            <CardFace gradient={itemArtGradient(item)} width={132} height={184} borderColor="rgba(255,215,94,0.78)" />
            <View style={styles.heroInfo}>
              <Text style={styles.name}>{(item.cardTitle ?? item.name).toUpperCase()}</Text>
              {item.pokemonName ? <Text style={styles.subName}>{item.pokemonName}</Text> : null}

              <View style={styles.specRows}>
                <SpecRow label={copy.rarity} value={rarityName(item.rarityTierLevel)} valueColor={colors.goldTop} />
                <SpecRow label={copy.collectionLabel} value={collectionName} />
                <SpecRow label={copy.ownedCopies(copiesOwned)} value="" hideValue />
              </View>
            </View>
          </View>
        </View>

        {traits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{copy.traits}</Text>
            <View style={styles.traitRow}>
              {traits.map((t) => (
                <View key={t} style={styles.traitChip}>
                  <Text style={styles.traitText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.valueCard}>
            <Text style={styles.sectionLabel}>{copy.estimatedValue}</Text>
            <Text style={styles.valueBig}>${(item.currentValueCents / 100).toLocaleString()}</Text>
            <Text style={styles.valueRangeText}>{copy.valueRange(item.minValueCents, item.maxValueCents)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.acquiredText}>{copy.acquired(acquiredDate)}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.actionRow}>
          <Pressable style={styles.keepButton} onPress={() => navigation.goBack()}>
            <Text style={styles.keepLabel}>{copy.keep}</Text>
          </Pressable>
          <Pressable style={styles.sellWrap} onPress={() => navigation.navigate("SellItem", { owned })}>
            <LinearGradient colors={["#FFD75E", "#E08A16"]} style={styles.sellButton}>
              <Text style={styles.sellLabel}>{copy.sell}</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <Pressable
          style={styles.viewCollectionButton}
          onPress={() => navigation.navigate("Binder", { collectionFilter: collectionName })}
        >
          <Text style={styles.viewCollectionLabel}>{copy.viewCollection(collectionName)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function rarityName(level: 1 | 2 | 3): string {
  return level === 3 ? "Grail" : level === 2 ? "Prime" : "Core";
}

function SpecRow({
  label,
  value,
  valueColor,
  hideValue,
}: {
  label: string;
  value: string;
  valueColor?: string;
  hideValue?: boolean;
}) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      {!hideValue && <Text style={[styles.specValue, valueColor && { color: valueColor }]}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.groundDeep },
  scroll: { paddingBottom: 200 },
  heroWrap: { position: "relative" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
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
  headerLabel: { ...typography.eyebrow, letterSpacing: 2.4 },
  heroRow: { flexDirection: "row", gap: 16, paddingHorizontal: 20, paddingTop: 18, alignItems: "flex-start" },
  heroInfo: { flex: 1, minWidth: 0 },
  name: { ...typography.pageHeading, fontSize: 24 },
  subName: { ...typography.sectionSub, marginTop: 4 },
  specRows: { marginTop: 14, gap: 7 },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  specLabel: { ...typography.metaLine, fontSize: 10.5, color: "rgba(255,255,255,0.62)" },
  specValue: { ...typography.metaLine, fontSize: 11.5, color: "#fff" },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: typography.eyebrow,
  traitRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 9 },
  traitChip: {
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(201,155,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(201,155,255,0.45)",
    justifyContent: "center",
  },
  traitText: { ...typography.metaLine, fontSize: 11, color: "#E0C4FF" },
  valueCard: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "rgba(255,215,94,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,94,0.36)",
  },
  valueBig: { ...typography.heroWordmark, fontSize: 30, marginTop: 4 },
  valueRangeText: { ...typography.footNote, marginTop: 6 },
  acquiredText: typography.footNote,
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    gap: 10,
    backgroundColor: colors.bg,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  keepButton: {
    flex: 1,
    height: 56,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  keepLabel: { ...typography.chunkyButtonLabel, fontSize: 14 },
  sellWrap: { flex: 1 },
  sellButton: {
    flex: 1,
    height: 56,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  sellLabel: { ...typography.chunkyButtonLabel, fontSize: 14, color: "#2A1706" },
  viewCollectionButton: {
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(177,75,255,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(177,75,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewCollectionLabel: { ...typography.chipLabel, fontSize: 13, color: "#E0C4FF" },
});

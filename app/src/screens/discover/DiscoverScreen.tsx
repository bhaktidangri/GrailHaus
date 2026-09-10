import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSessionViewModel } from "../../viewmodels/useSessionViewModel";
import { useDiscoverHubViewModel } from "../../viewmodels/useDiscoverHubViewModel";
import { useCollectionsViewModel } from "../../viewmodels/useCollectionsViewModel";
import { colors, typography } from "../../theme/tokens";
import { discover as copy } from "../../content/copy";
import type { DiscoverStackParamList } from "../../navigation/DiscoverStack";

type Nav = NativeStackNavigationProp<DiscoverStackParamList, "Discover">;

/** Darkens a `#rrggbb` hex color toward black by `amount` (0-1) — same helper as
 * CategorySwitch.tsx, used here to synthesize each door's two-stop gradient from a category's
 * single admin-configured accent color. */
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Discover is the surface where every category sits side by side (mockup 17a's cards/watches
 * pairing, generalized) — one shared neutral dark field, every world as equals. Real counts
 * throughout: item and tier counts come straight off `/packs`, "listed now" off `/listings`.
 * One door per category in the categories table (useDiscoverHubViewModel), not a hardcoded
 * cards/watches pair — a category added via the admin dashboard gets its own door here with no
 * app change.
 */
export function DiscoverScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const session = useSessionViewModel();
  const hub = useDiscoverHubViewModel();
  const collections = useCollectionsViewModel();

  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "#08040F", "#020101"]}
        locations={[0, 0.36, 1]}
        style={styles.base}
      />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brandRow}>
          <Image source={require("../../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{copy.title}</Text>
        </View>
        {session.balanceCents != null && (
          <View style={styles.balancePill}>
            <LinearGradient colors={["#FFE27A", "#E0A016"]} style={styles.coin} />
            <Text style={styles.balanceText}>{(session.balanceCents / 100).toLocaleString()}</Text>
          </View>
        )}
      </View>

      <Text style={styles.headline}>{copy.headline}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      {/* Lands on Cards' own real search (TextInput, filters by name/set) with the keyboard
          already up, rather than pretending to search from here — this bar has no query of its
          own to run across both categories at once. */}
      <Pressable
        style={styles.searchBar}
        onPress={() => navigation.navigate("DiscoverCategory", { category: "cards", autoFocusSearch: true })}
      >
        <Ionicons name="search" size={15} color="rgba(255,255,255,0.55)" />
        <Text style={styles.searchPlaceholder}>{copy.searchPlaceholder}</Text>
      </Pressable>

      <View style={styles.doors}>
        {hub.byCategory.map((c) => {
          const top = c.paletteAccent;
          const bottom = darken(c.paletteAccent, 0.55);
          return (
            <Pressable
              key={c.categoryId}
              style={styles.door}
              onPress={() => navigation.navigate("DiscoverCategory", { category: c.categoryId })}
            >
              <LinearGradient colors={[`${top}3D`, `${bottom}1A`]} style={StyleSheet.absoluteFill} />
              <View style={[styles.doorBorder, { borderColor: `${top}80` }]} />
              <Text style={[styles.doorEyebrow, { color: top }]}>{c.label.toUpperCase()}</Text>
              <Text style={styles.doorTitle}>{c.label} Discovery</Text>
              <Text style={styles.doorSummary}>{copy.doorSummary(c.itemCount, c.tierCount, c.listedNow)}</Text>
            </Pressable>
          );
        })}

        <Pressable style={styles.door} onPress={() => navigation.navigate("Collections")}>
          <LinearGradient colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.doorBorder, { borderColor: "rgba(255,255,255,0.28)" }]} />
          <Text style={styles.doorEyebrow}>{copy.collectionsDoor.eyebrow}</Text>
          <Text style={styles.doorTitle}>{copy.collectionsDoor.title}</Text>
          <Text style={styles.doorSummary}>
            {copy.collectionsDoorSummary(collections.groups.length, collections.totalItemCount)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  base: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: { width: 28, height: 28, borderRadius: 9 },
  title: { ...typography.navBrand, fontSize: 15 },
  balancePill: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  coin: { width: 12, height: 12, borderRadius: 6 },
  balanceText: { ...typography.countMain, fontSize: 13 },
  headline: { ...typography.pageHeading, fontSize: 30, marginTop: 22, paddingHorizontal: 22 },
  body: { ...typography.paragraph, marginTop: 10, paddingHorizontal: 22 },
  searchBar: {
    marginTop: 18,
    marginHorizontal: 22,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 11,
  },
  searchPlaceholder: { ...typography.body, fontSize: 13.5, color: "rgba(255,255,255,0.45)" },
  doors: { marginTop: 20, paddingHorizontal: 22, gap: 12 },
  door: { borderRadius: 20, padding: 17, overflow: "hidden" },
  doorBorder: { ...StyleSheet.absoluteFill, borderRadius: 20, borderWidth: 1.5 },
  doorEyebrow: { ...typography.eyebrow, fontSize: 9.5, letterSpacing: 3.2, color: "#E0C4FF" },
  doorTitle: { ...typography.pageHeading, fontSize: 25, marginTop: 7 },
  doorSummary: { ...typography.sectionSub, marginTop: 5 },
});

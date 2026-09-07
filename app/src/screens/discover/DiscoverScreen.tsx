import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSessionViewModel } from "../../viewmodels/useSessionViewModel";
import { useDiscoverHubViewModel } from "../../viewmodels/useDiscoverHubViewModel";
import { colors, typography } from "../../theme/tokens";
import { discover as copy } from "../../content/copy";
import type { DiscoverStackParamList } from "../../navigation/DiscoverStack";

type Nav = NativeStackNavigationProp<DiscoverStackParamList, "Discover">;

/**
 * Discover is the only surface where cards and watches sit side by side (mockup 17a) — one
 * shared neutral dark field, the two worlds as equals. Real counts throughout: item and tier
 * counts come straight off `/packs`, "listed now" off `/listings`.
 */
export function DiscoverScreen() {
  const navigation = useNavigation<Nav>();
  const session = useSessionViewModel();
  const hub = useDiscoverHubViewModel();

  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "#08040F", "#020101"]}
        locations={[0, 0.36, 1]}
        style={styles.base}
      />
      <View style={styles.header}>
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

      <Pressable style={styles.searchBar} onPress={() => navigation.navigate("DiscoverCategory", { category: "cards" })}>
        <View style={styles.searchDot} />
        <Text style={styles.searchPlaceholder}>{copy.searchPlaceholder}</Text>
      </Pressable>

      <View style={styles.doors}>
        <Pressable style={styles.door} onPress={() => navigation.navigate("DiscoverCategory", { category: "cards" })}>
          <LinearGradient colors={["rgba(177,75,255,0.24)", "rgba(91,31,214,0.1)"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.doorBorder, { borderColor: "rgba(177,75,255,0.5)" }]} />
          <Text style={styles.doorEyebrow}>{copy.cardsDoor.eyebrow}</Text>
          <Text style={styles.doorTitle}>{copy.cardsDoor.title}</Text>
          <Text style={styles.doorSummary}>
            {copy.doorSummary(hub.cards.itemCount, hub.cards.tierCount, hub.cards.listedNow)}
          </Text>
        </Pressable>

        <Pressable style={styles.door} onPress={() => navigation.navigate("DiscoverCategory", { category: "watches" })}>
          <LinearGradient colors={["rgba(242,196,107,0.2)", "rgba(122,90,34,0.08)"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.doorBorder, { borderColor: "rgba(242,196,107,0.46)" }]} />
          <Text style={[styles.doorEyebrow, { color: "#F2C46B" }]}>{copy.watchesDoor.eyebrow}</Text>
          <Text style={styles.doorTitle}>{copy.watchesDoor.title}</Text>
          <Text style={styles.doorSummary}>
            {copy.doorSummary(hub.watches.itemCount, hub.watches.tierCount, hub.watches.listedNow)}
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
  searchDot: { width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  searchPlaceholder: { ...typography.body, fontSize: 13.5, color: "rgba(255,255,255,0.45)" },
  doors: { marginTop: 20, paddingHorizontal: 22, gap: 12 },
  door: { borderRadius: 20, padding: 17, overflow: "hidden" },
  doorBorder: { ...StyleSheet.absoluteFill, borderRadius: 20, borderWidth: 1.5 },
  doorEyebrow: { ...typography.eyebrow, fontSize: 9.5, letterSpacing: 3.2, color: "#E0C4FF" },
  doorTitle: { ...typography.pageHeading, fontSize: 25, marginTop: 7 },
  doorSummary: { ...typography.sectionSub, marginTop: 5 },
});

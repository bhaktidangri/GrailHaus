import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { PackSku } from "@grailhaus/shared";
import { useSessionViewModel } from "../viewmodels/useSessionViewModel";
import { useShelfViewModel } from "../viewmodels/useShelfViewModel";
import { useRevealViewModel } from "../viewmodels/useRevealViewModel";
import { useAuthStore } from "../state/authStore";
import { PackTile } from "../components/PackTile";
import { Price } from "../components/Price";
import { ScreenBackground } from "../components/ScreenBackground";
import { colors, radii, spacing, typography } from "../theme/tokens";
import type { RootTabParamList } from "../navigation/RootTabs";

/** View only: no fetch calls, no business logic — everything comes from the viewmodels below. */
export function ShelfScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const session = useSessionViewModel();
  const shelf = useShelfViewModel();
  const reveal = useRevealViewModel();
  const requireAuth = useAuthStore((s) => s.requireAuth);

  function handleRip(sku: PackSku) {
    // Browsing the shelf never requires a session — only the moment of intent does.
    requireAuth(() => {
      reveal.startReveal(sku);
      navigation.navigate("Reveal");
    });
  }

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <Text style={styles.title}>Shelf</Text>
        {session.isSignedIn ? (
          session.balanceCents != null && (
            <View style={styles.balancePill}>
              <Price cents={session.balanceCents} color={colors.textPrimary} />
            </View>
          )
        ) : (
          <Pressable style={styles.signInChip} onPress={() => requireAuth(() => {})}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>
        )}
      </View>

      {shelf.error && <Text style={styles.error}>Server unreachable: {shelf.error}</Text>}

      <FlatList
        style={styles.flatList}
        data={shelf.packs}
        keyExtractor={(sku) => sku.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PackTile sku={item} onPress={() => handleRip(item)} />}
        ListEmptyComponent={
          !shelf.isLoading ? <Text style={styles.empty}>No packs yet.</Text> : null
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  title: { color: colors.textPrimary, ...typography.display },
  balancePill: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 2,
    borderColor: colors.goldDeep,
  },
  signInChip: {
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.blueDeep,
  },
  signInText: { color: "#ffffff", ...typography.body, fontSize: 13 },
  flatList: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  error: { color: colors.danger, ...typography.caption, paddingHorizontal: spacing.lg },
});

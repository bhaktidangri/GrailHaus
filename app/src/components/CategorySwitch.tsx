import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Category } from "@grailhaus/shared";
import { typography } from "../theme/tokens";
import { useCategoriesViewModel } from "../viewmodels/useCategoriesViewModel";

/** Darkens a `#rrggbb` hex color toward black by `amount` (0-1) — used to synthesize a two-stop
 * gradient from a category's single admin-configured accent color, since the backend-driven
 * `categories` table stores one accent, not a pre-baked gradient pair. */
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * The Shelf's category segmented switch — tapping a side jumps the whole screen's register
 * (accent, tier vocabulary, art) to that category. Segments come from the backend-driven
 * `categories` table (useCategoriesViewModel), not a hardcoded two-entry array — a category
 * added via the admin dashboard shows up here with no app change, which is the concrete "does
 * adding handbags actually reach the app" proof point for this screen specifically.
 */
export function CategorySwitch({ value, onChange }: { value: Category; onChange: (category: Category) => void }) {
  const { categories, isLoading } = useCategoriesViewModel();

  if (isLoading && categories.length === 0) {
    return (
      <View style={[styles.track, styles.loadingTrack]}>
        <ActivityIndicator color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  return (
    <View style={styles.track}>
      {categories.map((category) => {
        const isActive = category.id === value;
        const top = category.paletteAccent;
        const bottom = darken(category.paletteAccent, 0.45);
        return (
          <Pressable key={category.id} style={styles.segment} onPress={() => onChange(category.id)}>
            {isActive ? (
              <LinearGradient colors={[top, bottom]} style={styles.activePill}>
                <Text style={styles.activeLabel}>{category.label.toUpperCase()}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.inactiveLabel}>{category.label.toUpperCase()}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    height: 64,
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 5,
  },
  loadingTrack: { alignItems: "center", justifyContent: "center" },
  segment: { flex: 1, alignItems: "center", justifyContent: "center" },
  activePill: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.34,
    shadowRadius: 0,
    elevation: 4,
  },
  activeLabel: { ...typography.switchLabel, color: "#FFFFFF" },
  inactiveLabel: { ...typography.switchLabel, color: "rgba(255,255,255,0.5)" },
});

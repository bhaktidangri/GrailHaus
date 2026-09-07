import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Category } from "@grailhaus/shared";
import { accents, typography } from "../theme/tokens";
import { shelf as shelfCopy } from "../content/copy";

const ORDER: Category[] = ["cards", "watches"];

/**
 * The Shelf's Cards/Watches segmented switch — tapping the inactive side
 * jumps the whole screen's register (accent, tier vocabulary, art) to that
 * category. Matches the mockup's shelf header exactly: an active gradient
 * pill that takes the selected category's own accent (violet for cards,
 * gold for watches), a plain label for the inactive side.
 */
export function CategorySwitch({ value, onChange }: { value: Category; onChange: (category: Category) => void }) {
  return (
    <View style={styles.track}>
      {ORDER.map((category) => {
        const isActive = category === value;
        const accent = accents[category];
        return (
          <Pressable key={category} style={styles.segment} onPress={() => onChange(category)}>
            {isActive ? (
              <LinearGradient colors={[accent.top, accent.bottom]} style={styles.activePill}>
                <Text style={styles.activeLabel}>{shelfCopy.switchLabel[category]}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.inactiveLabel}>{shelfCopy.switchLabel[category]}</Text>
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

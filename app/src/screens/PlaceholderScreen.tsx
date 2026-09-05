import { StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "../components/ScreenBackground";
import { colors, spacing, typography } from "../theme/tokens";

export function PlaceholderScreen({ title, note }: { title: string; note: string }) {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  title: { color: colors.textPrimary, ...typography.title, textAlign: "center" },
  note: { color: colors.textSecondary, ...typography.body, textAlign: "center" },
});

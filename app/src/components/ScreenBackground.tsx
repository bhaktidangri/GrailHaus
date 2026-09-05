import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/tokens";

/** The bright sky-gradient backdrop behind every shell screen (Shelf, Auth, placeholders). */
export function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={[colors.skyTop, colors.skyBottom]} style={styles.fill}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

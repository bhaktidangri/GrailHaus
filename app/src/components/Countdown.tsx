import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ink } from "../theme/tokens";

/**
 * Ticking "time remaining until `target`" text. Ticks locally on a 1s timer —
 * the countdown itself needs no server round-trip, only the drop's state
 * transition (soon → live → closed) does, which the caller re-derives from
 * fresh `PackSku` data on its own polling interval.
 *
 * Uses Outfit with tabular-nums rather than the mockup's JetBrains Mono —
 * that's a font the app doesn't load today, and pulling in a second typeface
 * for one countdown label isn't worth the extra dependency this pass.
 */
export function Countdown({ target, color = ink.text }: { target: string; color?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, new Date(target).getTime() - now);
  return <Text style={[styles.text, { color }]}>{formatRemaining(remainingMs)}</Text>;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 22,
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },
});

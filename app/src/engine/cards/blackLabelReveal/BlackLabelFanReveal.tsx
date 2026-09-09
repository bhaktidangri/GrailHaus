// Black Label's card-reveal step — the same flat 2D fanned-and-timed-flip screen as
// ../vaultReveal/VaultCardFanReveal.tsx (see that file's header for why it's flat 2D and why
// each card flips on a timed cue rather than a swipe gesture), bound to this tier's own
// personality/adapter/art instead of Vault Break's. Seven cards fan here instead of six — the
// layout math (computeFanSlots) already scales off `total`, so that's data, not a code change.
//
// The per-card art is baked by art/blackLabelCardArt.ts's drawCardFaceImage — this component
// only positions and flips those images, it draws none of that content itself.
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Canvas, Image as SkiaImage, type SkImage } from "@shopify/react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { PackSku, PulledOwnedItem } from "@grailhaus/shared";
import { fonts, spacing } from "../../../theme/tokens";
import { itemDetail as detailCopy } from "../../../content/copy";
import { blackLabelPersonality } from "./config/blackLabel.config";
import { VaultVignette } from "../vaultReveal/ui/VaultVignette";
import { adaptPulledItemsToBlackLabelDeck } from "./engine/adaptBlackLabelDeck";
import { CARD_ASPECT, drawCardFaceImage, drawCardVersoImage } from "./art/blackLabelCardArt";
import type { VaultCardData } from "../vaultReveal/config/types";

/** Traits come off the catalog as a bullet-separated string, same convention CardDetailScreen
 * splits on — reused here rather than re-derived so a "Rookie Icon • Bright Pull" traits string
 * reads identically in both places. */
function splitTraits(traits: string | null): string[] {
  if (!traits) return [];
  return traits.split(/[•,]/).map((t) => t.trim()).filter(Boolean);
}

const mono = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Timing for the automatic staged reveal — each card's turn, then a longer beat before the last
// (rarest, per orderedItems' commons-first sort) card so it reads as the moment being built to,
// then a settle pause before the Continue control appears.
const STAGGER_MS = 780;
const HERO_EXTRA_DELAY_MS = 500;
const SETTLE_AFTER_LAST_MS = 650;

interface FanSlot {
  rotate: number;
  x: number;
  y: number;
  scale: number;
}

function computeFanSlots(total: number, cardW: number, screenW: number): FanSlot[] {
  const center = (total - 1) / 2;
  const angleStep = total > 4 ? 8 : 10;
  const arcDrop = 9;
  const maxSpread = screenW - 56 - cardW;
  const xStep = total > 1 ? Math.min(cardW * 0.4, Math.max(18, maxSpread / (total - 1))) : 0;
  return Array.from({ length: total }, (_, i) => {
    const offset = i - center;
    const isHero = i === total - 1;
    return {
      rotate: offset * angleStep,
      x: offset * xStep,
      y: Math.abs(offset) * arcDrop - (isHero ? 20 : 0),
      scale: isHero ? 1.08 : 1,
    };
  });
}

function FanCard({
  face,
  verso,
  photoUrl,
  slot,
  cardW,
  cardH,
  revealed,
  isHero,
  selected,
  dimmed,
  zIndex,
  onPress,
}: {
  face: SkImage;
  verso: SkImage;
  photoUrl: string | null;
  slot: FanSlot;
  cardW: number;
  cardH: number;
  revealed: boolean;
  isHero: boolean;
  selected: boolean;
  dimmed: boolean;
  zIndex: number;
  onPress: () => void;
}) {
  const settle = useSharedValue(0); // 0 = resting in the face-down deck stack, 1 = fanned into place
  const flip = useSharedValue(0); // 0 = verso showing, 1 = face showing
  const pop = useSharedValue(0); // 0 = sitting in the fan, 1 = pulled out front-and-center
  const dim = useSharedValue(0);

  useEffect(() => {
    if (!revealed) return;
    const ease = Easing.out(Easing.cubic);
    settle.value = withTiming(1, { duration: 520, easing: ease });
    flip.value = withDelay(120, withTiming(1, { duration: 420, easing: Easing.inOut(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  useEffect(() => {
    pop.value = withTiming(selected ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [selected, pop]);

  useEffect(() => {
    dim.value = withTiming(dimmed ? 1 : 0, { duration: 220 });
  }, [dimmed, dim]);

  const containerStyle = useAnimatedStyle(() => {
    const baseX = settle.value * slot.x;
    const baseY = (1 - settle.value) * 90 + settle.value * slot.y;
    const baseRotate = settle.value * slot.rotate;
    const baseScale = 0.86 + settle.value * (slot.scale - 0.86);
    // Pulled-out target: centered, level, lifted above the rest of the fan, noticeably larger.
    const popY = -cardH * 0.3;
    const popScale = slot.scale * 1.32;
    return {
      opacity: 1 - dim.value * 0.72,
      transform: [
        { translateX: baseX * (1 - pop.value) },
        { translateY: baseY + pop.value * (popY - baseY) },
        { rotate: `${baseRotate * (1 - pop.value)}deg` },
        { scale: baseScale + pop.value * (popScale - baseScale) },
      ],
    };
  });

  const versoStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${flip.value * 180}deg` }],
    opacity: flip.value > 0.5 ? 0 : 1,
  }));
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${(flip.value - 1) * 180}deg` }],
    opacity: flip.value > 0.5 ? 1 : 0,
  }));

  return (
    <Animated.View
      style={[
        styles.cardSlot,
        { width: cardW, height: cardH, zIndex, marginLeft: -cardW / 2, marginTop: -cardH / 2 },
        containerStyle,
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} disabled={!revealed} hitSlop={4}>
        <Animated.View style={[styles.face, versoStyle]}>
          <Canvas style={StyleSheet.absoluteFill}>
            <SkiaImage image={verso} x={0} y={0} width={cardW} height={cardH} fit="cover" />
          </Canvas>
        </Animated.View>
        <Animated.View style={[styles.face, faceStyle]}>
          {photoUrl ? (
            // Just the real card, nothing else — no ribbon, no value block, no serial. That info
            // hasn't disappeared, it moved to the tap-to-inspect panel (DescriptionPanel) every
            // revealed card already opens on press; here it would just be clutter over the actual
            // card. CARD_ASPECT was already chosen to match a real trading card's aspect ratio, so
            // "cover" fills the frame edge-to-edge with no visible crop.
            <Image
              source={photoUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
          ) : (
            // No catalog texture for this item (rare) — fall back to the procedural placeholder
            // art rather than showing nothing.
            <Canvas style={StyleSheet.absoluteFill}>
              <SkiaImage image={face} x={0} y={0} width={cardW} height={cardH} fit="cover" />
            </Canvas>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function DescriptionPanel({
  item,
  card,
  tierColorHex,
  visible,
  onClose,
}: {
  item: PulledOwnedItem | null;
  card: VaultCardData | null;
  tierColorHex: string;
  visible: boolean;
  onClose: () => void;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.72 }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 40 }],
  }));

  if (!item || !card) return null;
  const traits = splitTraits(item.traits);
  const up = card.delta >= 0;

  return (
    <>
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View pointerEvents={visible ? "auto" : "none"} style={[styles.sheet, sheetStyle]}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <Text style={styles.sheetName}>{(item.cardTitle ?? item.name).toUpperCase()}</Text>
            {item.pokemonName ? <Text style={styles.sheetSubName}>{item.pokemonName}</Text> : null}
          </View>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Text style={styles.closeGlyph}>×</Text>
          </Pressable>
        </View>

        <View style={styles.sheetRow}>
          <View style={styles.sheetSpec}>
            <Text style={styles.sheetLabel}>{detailCopy.rarity}</Text>
            <Text style={[styles.sheetValue, { color: tierColorHex }]}>{card.rarityLabel}</Text>
          </View>
          <View style={styles.sheetSpec}>
            <Text style={styles.sheetLabel}>{detailCopy.collectionLabel}</Text>
            <Text style={styles.sheetValue}>{card.edition}</Text>
          </View>
          <View style={styles.sheetSpec}>
            <Text style={styles.sheetLabel}>SERIAL</Text>
            <Text style={styles.sheetValue}>{card.serial}</Text>
          </View>
        </View>

        {traits.length > 0 && (
          <View style={styles.traitRow}>
            {traits.map((t) => (
              <View key={t} style={styles.traitChip}>
                <Text style={styles.traitText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.valueRow}>
          <View>
            <Text style={styles.sheetLabel}>{detailCopy.estimatedValue}</Text>
            <Text style={styles.sheetValueBig}>{card.value}</Text>
          </View>
          <Text style={[styles.deltaText, { color: up ? "#7ed6a4" : "#d67e8c" }]}>
            {up ? "▲" : "▼"} {Math.abs(card.delta).toFixed(1)}% · 7D
          </Text>
        </View>
      </Animated.View>
    </>
  );
}

export function BlackLabelFanReveal({
  items,
  sku,
  onDone,
}: {
  items: PulledOwnedItem[];
  sku: PackSku;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const deck: VaultCardData[] = useMemo(() => adaptPulledItemsToBlackLabelDeck(items, sku), [items, sku]);
  const total = deck.length;

  const verso = useMemo(() => drawCardVersoImage(), []);
  // Only ever actually shown for an item with no real catalog photo (rare) — every card with one
  // shows that instead, full-bleed, no chrome (see FanCard below).
  const faces = useMemo(() => deck.map((card) => drawCardFaceImage(card)), [deck]);

  const cardW = Math.min(168, width * 0.4);
  const cardH = cardW / CARD_ASPECT;
  const slots = useMemo(() => computeFanSlots(total, cardW, width), [total, cardW, width]);

  const [revealedCount, setRevealedCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function handleCardPress(i: number) {
    Haptics.selectionAsync();
    setSelectedIndex((cur) => (cur === i ? null : i));
  }

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    let elapsed = 400;
    for (let i = 0; i < total; i++) {
      const isHero = i === total - 1;
      elapsed += i === 0 ? 0 : STAGGER_MS + (isHero ? HERO_EXTRA_DELAY_MS : 0);
      const at = elapsed;
      timers.current.push(
        setTimeout(() => {
          setRevealedCount((c) => Math.max(c, i + 1));
          const style = isHero
            ? Haptics.ImpactFeedbackStyle.Heavy
            : deck[i].rarity === "PRIME"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
          Haptics.impactAsync(style);
          if (isHero) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, at)
      );
    }
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const allRevealed = revealedCount >= total;
  const [showContinue, setShowContinue] = useState(false);
  useEffect(() => {
    if (!allRevealed) return;
    const t = setTimeout(() => setShowContinue(true), SETTLE_AFTER_LAST_MS);
    return () => clearTimeout(t);
  }, [allRevealed]);

  function skipToEnd() {
    timers.current.forEach(clearTimeout);
    setRevealedCount(total);
  }

  const defaultTierColor = "#c9a24a";
  const tierColorHex =
    selectedIndex !== null
      ? sku.rarityTiers.find((t) => t.level === items[selectedIndex].rarityTierLevel)?.colorHex ?? defaultTierColor
      : defaultTierColor;

  const continueOpacity = useSharedValue(0);
  useEffect(() => {
    continueOpacity.value = withTiming(showContinue ? 1 : 0, { duration: 320 });
  }, [showContinue, continueOpacity]);
  const continueStyle = useAnimatedStyle(() => ({
    opacity: continueOpacity.value,
    transform: [{ translateY: (1 - continueOpacity.value) * 10 }],
  }));

  const totalValueCents = items
    .slice(0, revealedCount)
    .reduce((sum, item) => sum + item.currentValueCents, 0);

  return (
    <View style={styles.root}>
      <VaultVignette width={width} height={height} glowColor="rgba(180,140,60,0.20)" />

      <View style={styles.header}>
        <Text style={styles.kicker}>{blackLabelPersonality.copy.kicker}</Text>
        <Text style={styles.title}>Your Pull</Text>
        <Text style={styles.counter}>{Math.min(revealedCount, total)} / {total} REVEALED</Text>
      </View>

      <View style={styles.fanArea}>
        {deck.map((_, i) => (
          <FanCard
            key={i}
            face={faces[i]}
            verso={verso}
            photoUrl={items[i].textureUrl}
            slot={slots[i]}
            cardW={cardW}
            cardH={cardH}
            revealed={i < revealedCount}
            isHero={i === total - 1}
            selected={selectedIndex === i}
            dimmed={selectedIndex !== null && selectedIndex !== i}
            zIndex={selectedIndex === i ? total + 2 : i === total - 1 ? total + 1 : i}
            onPress={() => handleCardPress(i)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {!showContinue ? (
          <Pressable onPress={skipToEnd} disabled={allRevealed} hitSlop={10}>
            <Text style={styles.hint}>{allRevealed ? "" : "Tap here to reveal faster"}</Text>
          </Pressable>
        ) : (
          <Animated.View style={[styles.continueWrap, continueStyle]}>
            <Text style={styles.totalLabel}>
              TOTAL VALUE <Text style={styles.totalValue}>${(totalValueCents / 100).toFixed(0)}</Text>
            </Text>
            <Pressable style={styles.continueButton} onPress={onDone}>
              <Text style={styles.continueLabel}>Continue</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      <DescriptionPanel
        item={selectedIndex !== null ? items[selectedIndex] : null}
        card={selectedIndex !== null ? deck[selectedIndex] : null}
        tierColorHex={tierColorHex}
        visible={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05030a" },
  header: { alignItems: "center", paddingTop: 64, gap: 6 },
  kicker: {
    fontFamily: mono, fontSize: 10, letterSpacing: 3.4, color: "#8a6a2e", textTransform: "uppercase",
  },
  title: { fontFamily: fonts.black, fontSize: 26, color: "#f4ece0" },
  counter: {
    fontFamily: mono, fontSize: 10, letterSpacing: 2, color: "rgba(244,236,224,0.5)", marginTop: 2,
  },
  fanArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardSlot: { position: "absolute", left: "50%", top: "50%" },
  face: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201,162,74,0.35)",
    backfaceVisibility: "hidden",
  },
  footer: { alignItems: "center", paddingBottom: 40, minHeight: 96, justifyContent: "flex-end", gap: spacing.md },
  hint: {
    fontFamily: mono, fontSize: 10, letterSpacing: 2.6, textTransform: "uppercase",
    color: "rgba(244,236,224,0.4)",
  },
  continueWrap: { alignItems: "center", gap: spacing.md },
  totalLabel: {
    fontFamily: mono, fontSize: 10.5, letterSpacing: 2, color: "rgba(244,236,224,0.5)",
  },
  totalValue: { fontFamily: fonts.bold, fontSize: 13, color: "#f4ece0" },
  continueButton: {
    height: 56,
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(201,162,74,0.5)",
    backgroundColor: "rgba(201,162,74,0.1)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  continueLabel: { fontFamily: fonts.black, fontSize: 15, letterSpacing: 1, color: "#f4ece0" },

  backdrop: { backgroundColor: "#000000" },
  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#120a24",
    borderWidth: 1,
    borderColor: "rgba(201,162,74,0.28)",
    gap: 16,
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  sheetHeaderText: { flex: 1, paddingRight: 12, gap: 3 },
  sheetName: { fontFamily: fonts.black, fontSize: 18, color: "#f4ece0" },
  sheetSubName: { fontFamily: fonts.medium, fontSize: 12.5, color: "rgba(244,236,224,0.55)" },
  closeButton: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  closeGlyph: { fontSize: 18, lineHeight: 18, color: "rgba(244,236,224,0.8)" },
  sheetRow: { flexDirection: "row", justifyContent: "space-between" },
  sheetSpec: { gap: 3 },
  sheetLabel: {
    fontFamily: mono, fontSize: 8.5, letterSpacing: 1.6, textTransform: "uppercase",
    color: "rgba(244,236,224,0.44)",
  },
  sheetValue: { fontFamily: fonts.bold, fontSize: 12.5, color: "#f4ece0" },
  traitRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  traitChip: {
    borderWidth: 1, borderColor: "rgba(201,162,74,0.3)", backgroundColor: "rgba(201,162,74,0.08)",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  traitText: { fontFamily: fonts.semibold, fontSize: 10.5, color: "#c9a24a" },
  valueRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    borderTopWidth: 1, borderTopColor: "rgba(201,162,74,0.16)", paddingTop: 14,
  },
  sheetValueBig: { fontFamily: fonts.black, fontSize: 24, color: "#f4ece0", marginTop: 2 },
  deltaText: { fontFamily: fonts.bold, fontSize: 12.5 },
});

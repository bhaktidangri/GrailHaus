// The shared post-tear card-reveal screen for all three card tiers (Tier 1's plain pack, Vault
// Break, Black Label). Each tier's own FanReveal file (vaultReveal/VaultCardFanReveal.tsx,
// blackLabelReveal/BlackLabelFanReveal.tsx, reveal/CardPackFanReveal.tsx) is now a thin wrapper
// that adapts its own pulled items into VaultCardData + pre-bakes its own face/verso art, then
// hands both to this component along with a small palette — the same "shared engine,
// per-tier personality" split BlackLabelScene.tsx already uses for the 3D tear stage.
//
// The reveal itself is useHoldToOpenDeck's press-and-hold, one-card-at-a-time mechanic (see that
// file's header) instead of each tier's old automatic, timer-staggered flip. The fan layout, the
// per-card Skia face/verso rendering, and the tap-to-inspect sheet are carried over unchanged
// from the previous VaultCardFanReveal/BlackLabelFanReveal — only the sequencing (how a card gets
// from sealed to revealed) changed; the pack tear that precedes this screen is untouched.
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Canvas, Circle, Image as SkiaImage, RadialGradient, vec, type SkImage } from "@shopify/react-native-skia";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { ItemDetail, PackSku } from "@grailhaus/shared";
import { fonts, spacing } from "../../../../theme/tokens";
import { itemDetail as detailCopy } from "../../../../content/copy";
import { VaultVignette } from "../../vaultReveal/ui/VaultVignette";
import type { CardRarity, VaultCardData } from "../../vaultReveal/config/types";
import { useHoldToOpenDeck } from "./useHoldToOpenDeck";
import { typeVisualOf, type MoteFx } from "../art/typeVisual";

function splitTraits(traits: string | null): string[] {
  if (!traits) return [];
  return traits.split(/[•,]/).map((t) => t.trim()).filter(Boolean);
}

const mono = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const SETTLE_AFTER_LAST_MS = 550;

// The reveal flip's own choreography — every card, every tier, plays the identical flip *within
// a single pack*. Per explicit user feedback, the human action and its timing must be identical
// regardless of rarity; only the flourish around it (OpenFlourish's rings/motes, PUNCH_SCALE's
// amplitude below) is allowed to scale with rarity. halfTurns must be odd (starts showing verso
// at flip=0, each half-turn alternates the visible side — see versoStyle/faceStyle below — so an
// odd count is required to land on the face, not back on the verso).
const FLIP_CONFIG = { halfTurns: 5, legMs: 100, settleMs: 320 };
// Bulk-batch pacing only (see `compressed` prop below, threaded from CardFlowEngine's own
// `batchContext`) — a *different axis* from the per-card rarity rule above: every card within a
// given pack still gets the identical flip as its packmates, but pack 2 onward of a 10-pack batch
// plays a shorter version of that same flip than pack 1 did, so ten packs don't take as long as
// ten separate full rituals. Never applied to a single, standalone pack purchase.
const FLIP_CONFIG_COMPRESSED = { halfTurns: 3, legMs: 60, settleMs: 170 };

// The flip's landing "punch" — a small scale pop timed to the final settle leg, present for every
// tier but stronger the rarer the card, so a GRAIL pull still earns a bigger moment without the
// gesture or the flip's duration changing at all.
const PUNCH_SCALE: Record<CardRarity, number> = { CORE: 0.03, PRIME: 0.07, GRAIL: 0.14 };

interface FanSlot {
  rotate: number;
  x: number;
  y: number;
  scale: number;
}

// Only ever one card on screen at a time now (see HoldToOpenFanReveal's own `visibleIndex`) —
// always dead center, no fan spread to compute.
const CENTER_SLOT: FanSlot = { rotate: 0, x: 0, y: 0, scale: 1 };

export interface HoldToOpenPalette {
  kicker: string;
  /** Card border / chip tint, e.g. "#e8cf9a". */
  accentHex: string;
  /** Same color as `accentHex`, as an "r,g,b" triple for building rgba() strings. */
  accentRGB: string;
  /** VaultVignette's top glow — Vault Break's violet, Black Label's ember, etc. */
  vignetteGlow: string;
}

function FanCard({
  face,
  verso,
  photoUrl,
  slot,
  cardW,
  cardH,
  revealed,
  isFront,
  dimmed,
  zIndex,
  dealIndex,
  palette,
  rarity,
  compressed,
  onPress,
  interactive,
}: {
  face: SkImage;
  verso: SkImage;
  photoUrl: string | null;
  slot: FanSlot;
  cardW: number;
  cardH: number;
  revealed: boolean;
  isFront: boolean;
  dimmed: boolean;
  zIndex: number;
  dealIndex: number;
  palette: HoldToOpenPalette;
  /** Drives the landing "punch" amplitude (PUNCH_SCALE) — the flip itself (FLIP_CONFIG) is
   * identical for every rarity within one pack; tap-to-open is the one, uniform human action. */
  rarity: CardRarity;
  /** Bulk-batch pacing only — true for pack 2+ of a 10-pack batch, always false for a standalone
   * pack. Never true for a GRAIL card even mid-batch (see call site): the chase pull still earns
   * its full-length flip regardless of where compression has gotten to. */
  compressed?: boolean;
  onPress?: () => void;
  interactive: boolean;
}) {
  const settle = useSharedValue(0);
  const flip = useSharedValue(0);
  const pop = useSharedValue(0);
  const dim = useSharedValue(0);
  const punch = useSharedValue(0);

  // Every card — sealed or not — fans out into its resting slot immediately on mount, staggered
  // slightly by position, so the whole sealed hand is visible at once (unlike the old
  // timer-staggered reveal, this flow needs the full stack on screen from the start: it's what
  // tells the user there are `total` cards left to open). Only the flip (verso -> face) waits on
  // `revealed`.
  useEffect(() => {
    settle.value = withDelay(dealIndex * 60, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A single 0->1 flip read as flat/anticlimactic for the one moment on this whole screen that's
  // actually supposed to feel like something — this spins through halfTurns-1 quick preliminary
  // flips (linear, even pace, like real spin momentum) and lands on the final, slower-
  // decelerating flip that actually settles on the revealed face. Same choreography, same timing,
  // for every rarity — only the landing "punch" scale amplitude (PUNCH_SCALE) varies, so a common
  // still earns a real flip but a grail pull's landing hits harder. `compressed` shortens that
  // shared timing for bulk-batch pacing only (see the prop's own doc comment) — still identical
  // across every card of a given pack, so the "same action, same length" rule holds either way.
  useEffect(() => {
    if (!revealed) return;
    const { halfTurns, legMs, settleMs } = compressed ? FLIP_CONFIG_COMPRESSED : FLIP_CONFIG;
    const legs = [];
    for (let turn = 1; turn < halfTurns; turn++) {
      legs.push(withTiming(turn, { duration: legMs, easing: Easing.linear }));
    }
    legs.push(withTiming(halfTurns, { duration: settleMs, easing: Easing.out(Easing.cubic) }));
    flip.value = withDelay(100, withSequence(...legs));
    punch.value = withDelay(
      100 + legMs * (halfTurns - 1),
      withSequence(
        withTiming(1, { duration: settleMs * 0.45, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: settleMs * 0.55, easing: Easing.inOut(Easing.cubic) })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  useEffect(() => {
    pop.value = withTiming(isFront ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [isFront, pop]);

  useEffect(() => {
    dim.value = withTiming(dimmed ? 1 : 0, { duration: 220 });
  }, [dimmed, dim]);

  const containerStyle = useAnimatedStyle(() => {
    const baseX = settle.value * slot.x;
    const baseY = (1 - settle.value) * 90 + settle.value * slot.y;
    const baseRotate = settle.value * slot.rotate;
    const baseScale = 0.86 + settle.value * (slot.scale - 0.86);

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

  // `flip.value` climbs through several whole half-turns (0..halfTurns, per-rarity —
  // FLIP_CONFIG), not just 0..1 — `% 2` maps that back onto one repeating 0..2 cycle so the exact
  // same crossfade logic a single flip would use (each side visible for one half of the cycle,
  // hidden the other half) just keeps repeating for every extra flip, landing on the face once
  // `flip.value` reaches its (odd) target (local === 1 exactly, i.e. the face's own rotateY
  // resolves to 0deg).
  const versoStyle = useAnimatedStyle(() => {
    const local = flip.value % 2;
    return {
      transform: [{ perspective: 900 }, { rotateY: `${local * 180}deg` }],
      opacity: local > 0.5 && local < 1.5 ? 0 : 1,
    };
  });
  const punchScale = PUNCH_SCALE[rarity];
  const faceStyle = useAnimatedStyle(() => {
    const local = flip.value % 2;
    return {
      transform: [
        { perspective: 900 },
        { rotateY: `${(local - 1) * 180}deg` },
        { scale: 1 + punch.value * punchScale },
      ],
      opacity: local > 0.5 && local < 1.5 ? 1 : 0,
    };
  });

  return (
    <Animated.View
      style={[
        styles.cardSlot,
        { width: cardW, height: cardH, zIndex, marginLeft: -cardW / 2, marginTop: -cardH / 2 },
        containerStyle,
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={interactive ? onPress : undefined}
        disabled={!interactive}
        hitSlop={6}
      >
        <Animated.View
          style={[styles.face, versoStyle, { borderColor: `rgba(${palette.accentRGB},0.35)` }]}
        >
          <Canvas style={StyleSheet.absoluteFill}>
            <SkiaImage image={verso} x={0} y={0} width={cardW} height={cardH} fit="cover" />
          </Canvas>
        </Animated.View>
        <Animated.View
          style={[styles.face, faceStyle, { borderColor: `rgba(${palette.accentRGB},0.35)` }]}
        >
          {photoUrl ? (
            <Image
              source={photoUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
          ) : (
            <Canvas style={StyleSheet.absoluteFill}>
              <SkiaImage image={face} x={0} y={0} width={cardW} height={cardH} fit="cover" />
            </Canvas>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// `fx` is the source design's own coarse motion bucket per Pokémon type (rise/fall/burst/drift —
// see reveal/art/typeVisual.ts) — undefined (Vault Break/Tier 1, which never set a card `type`)
// is the literal "rise" formula below, unchanged from before this existed, so those two tiers'
// motes render pixel-identical to before this pass.
function Mote({
  index,
  count,
  hex,
  onSurfaceY,
  fx,
}: {
  index: number;
  count: number;
  hex: string;
  onSurfaceY: number;
  fx?: MoteFx;
}) {
  const p = useSharedValue(0);
  const duration = fx === "drift" ? 1400 : fx === "burst" ? 700 : 1000;
  const size = fx === "drift" ? 6 : fx === "burst" ? 3 : 4;
  useEffect(() => {
    p.value = withDelay(index * 45, withTiming(1, { duration: duration + (index % 3) * 200, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, p]);
  const angle = (index / count) * Math.PI * 2;
  const radius = fx === "drift" ? 110 : 90;
  // rise (default/undefined): drifts upward as it expands, matching the original formula exactly.
  // fall: mirrors it downward. burst/drift keep the same full radial spread as rise/fall (the
  // source's own burst/drift are already full-360, differing only in pacing/size above) with no
  // vertical bias of their own.
  const verticalBias = fx === "fall" ? 40 : fx === "burst" || fx === "drift" ? 0 : -60;
  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * (p.value < 0.14 ? p.value / 0.14 : 1),
    transform: [
      { translateX: Math.cos(angle) * radius * p.value },
      { translateY: onSurfaceY + Math.sin(angle) * radius * p.value + verticalBias * p.value },
      { scale: 0.5 + p.value * 0.6 },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.mote,
        style,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: size / 2, backgroundColor: hex },
      ]}
    />
  );
}

function OpenFlourish({
  rings,
  motes,
  hex,
  fx,
  cardY,
}: {
  rings: number;
  motes: number;
  hex: string;
  fx?: MoteFx;
  cardY: number;
}) {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  useEffect(() => {
    if (rings >= 1) ring1.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) });
    if (rings >= 2) ring2.value = withDelay(140, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings]);
  const ring1Style = useAnimatedStyle(() => ({
    opacity: (1 - ring1.value) * 0.85,
    transform: [{ translateY: cardY }, { scale: 0.4 + ring1.value * 2.1 }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: (1 - ring2.value) * 0.55,
    transform: [{ translateY: cardY }, { scale: 0.4 + ring2.value * 2.6 }],
  }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {rings >= 1 && <Animated.View style={[styles.ring, ring1Style, { borderColor: hex }]} />}
      {rings >= 2 && <Animated.View style={[styles.ring, ring2Style, { borderColor: hex, opacity: 0.6 }]} />}
      {Array.from({ length: motes }).map((_, i) => (
        <Mote key={i} index={i} count={motes} hex={hex} onSurfaceY={cardY} fx={fx} />
      ))}
    </View>
  );
}

// A live, charge-driven glow behind the card that's currently held or open — the one new
// live-animated Skia layer this pass adds (every other Skia canvas in this file/its siblings
// draws a static, once-baked image; VaultVignette below already proves a live declarative
// <RadialGradient> works in this codebase, just not driven by a continuously-updating
// SharedValue until now). Mounted/unmounted once per active card (see HoldToOpenFanReveal's own
// `activeIndex`), never once per card in the fan — cheap by construction.
function TypeGlow({ rgb, strengthSV, cardY }: { rgb: string; strengthSV: SharedValue<number>; cardY: number }) {
  const SIZE = 300;
  const center = SIZE / 2;
  // A ring-shaped gradient — clear at the very center (where the card itself sits, so this stays
  // correct regardless of paint order relative to FanCard) and colored at its outer edge, instead
  // of a solid center-bright glow that would just tint straight over the card's own face.
  const radius = useDerivedValue(() => 60 + strengthSV.value * 110);
  const colors = useDerivedValue(() => [
    `rgba(${rgb},0)`,
    `rgba(${rgb},${(0.45 * strengthSV.value).toFixed(3)})`,
    `rgba(${rgb},0)`,
  ]);
  return (
    <View pointerEvents="none" style={[styles.typeGlowWrap, { transform: [{ translateY: cardY }] }]}>
      <Canvas style={{ width: SIZE, height: SIZE }}>
        <Circle cx={center} cy={center} r={radius}>
          <RadialGradient c={vec(center, center)} r={radius} colors={colors} positions={[0, 0.55, 1]} />
        </Circle>
      </Canvas>
    </View>
  );
}

// The source design's "{TIER} · {TYPE}" fade-in, shown once a non-CORE card locks open (`rings`
// reused as the same "not CORE" signal the source's own `tier !== 'CORE'` gate uses). Mounted
// fresh each time a card opens (the parent's conditional render naturally unmounts/remounts this
// between cards, same as OpenFlourish already relies on), so the fade always restarts.
function TypeWordOverlay({ text, hex }: { text: string; hex: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -8 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.typeWordWrap, style]}>
      <Text style={[styles.typeWord, { color: hex }]}>{text}</Text>
    </Animated.View>
  );
}

// A one-shot celebratory sparkle burst for the moment every card in the pull has been opened —
// mounts fresh exactly once (see its call site's `showContinue &&` gate), so it always plays from
// the start rather than replaying on re-render.
function FinaleSpark({ index, count, hex }: { index: number; count: number; hex: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      index * 16,
      withTiming(1, { duration: 900 + (index % 5) * 140, easing: Easing.out(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  const angle = (index / count) * Math.PI * 2 + (index % 3) * 0.18;
  const radius = 100 + (index % 4) * 46;
  const size = 3 + (index % 3);
  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * (p.value < 0.12 ? p.value / 0.12 : 1),
    transform: [
      { translateX: Math.cos(angle) * radius * p.value },
      { translateY: Math.sin(angle) * radius * p.value - p.value * 46 },
      { scale: 0.4 + p.value * 0.9 },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.finaleSpark,
        style,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: size / 2, backgroundColor: hex },
      ]}
    />
  );
}

function FinaleSparkle({ hex, count = 28 }: { hex: string; count?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <FinaleSpark key={i} index={i} count={count} hex={hex} />
      ))}
    </View>
  );
}

// The "last page" summary of everything just pulled, once every card has been opened and set
// aside (hold.done) — a stacked deck, not a spread-out hand: the current card sits fully visible
// up front, the rest peek out behind it as offset edges, same read as a real stack of cards held
// at a tilt. Tapping the front card sends it to the back of the stack and brings the next one
// forward — "one after another" browsing through the whole pull, not everything shown at once.
function StackCard({
  depth,
  depthCap,
  face,
  photoUrl,
  cardW,
  cardH,
  rarity,
  accentRGB,
  isFront,
  onPress,
}: {
  /** 0 = front/current card; increases going back into the stack. Changes over time as the user
   * taps through — this component's own identity (React `key`, at the call site) stays pinned to
   * the card, not the slot, so a depth change here animates smoothly instead of remounting. */
  depth: number;
  depthCap: number;
  face: SkImage;
  photoUrl: string | null;
  cardW: number;
  cardH: number;
  rarity: CardRarity;
  accentRGB: string;
  isFront: boolean;
  onPress?: () => void;
}) {
  const depthSV = useSharedValue(depth);
  useEffect(() => {
    depthSV.value = withTiming(depth, { duration: 340, easing: Easing.out(Easing.cubic) });
  }, [depth, depthSV]);

  // A small fixed lean (-4deg) plus a growing per-depth rotate, both folded into one `rotate`
  // value — this element has a real, explicit width/height (unlike a wrapping wrapper View would),
  // so a plain 2D rotate here is enough to read as a "tilted stack" without needing a 3D
  // perspective transform, which misbehaves badly when applied to a zero-sized box.
  const style = useAnimatedStyle(() => {
    const d = depthSV.value;
    return {
      opacity: 1 - d * 0.1,
      transform: [
        { translateX: d * 11 },
        { translateY: d * -11 },
        { scale: 1 - d * 0.045 },
        { rotate: `${-4 + d * 1.4}deg` },
      ],
    };
  });

  const borderAlpha = rarity === "GRAIL" ? 0.85 : rarity === "PRIME" ? 0.55 : 0.3;

  return (
    <Animated.View
      style={[
        styles.stackSlot,
        { width: cardW, height: cardH, marginLeft: -cardW / 2, marginTop: -cardH / 2, zIndex: depthCap - depth },
        style,
      ]}
    >
      <Pressable
        style={[styles.stackFace, { borderColor: `rgba(${accentRGB},${borderAlpha})` }]}
        onPress={isFront ? onPress : undefined}
        disabled={!isFront}
        hitSlop={6}
      >
        {photoUrl ? (
          <Image source={photoUrl} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <Canvas style={StyleSheet.absoluteFill}>
            <SkiaImage image={face} x={0} y={0} width={cardW} height={cardH} fit="cover" />
          </Canvas>
        )}
      </Pressable>
    </Animated.View>
  );
}

const STACK_DEPTH_CAP = 5;

function RevealedBunch({
  deck,
  faces,
  items,
  cardW,
  cardH,
  palette,
  onInspect,
}: {
  deck: VaultCardData[];
  faces: SkImage[];
  items: ItemDetail[];
  cardW: number;
  cardH: number;
  palette: HoldToOpenPalette;
  onInspect: (i: number) => void;
}) {
  const total = deck.length;
  const [topIndex, setTopIndex] = useState(0);
  const depthCap = Math.min(total, STACK_DEPTH_CAP);

  const advance = () => {
    Haptics.selectionAsync();
    setTopIndex((i) => (i + 1) % total);
  };

  // A slightly shrunk card here (not the full reveal size) so the stacked edges behind it have
  // room to peek out without spilling past the fan area.
  const stackW = cardW * 0.86;
  const stackH = cardH * 0.86;
  // The stack cards below are position:'absolute' with left/top:'50%', which only resolves
  // correctly against an ancestor with a real, defined size — this box is that ancestor, sized
  // explicitly (not auto/flex-computed) with enough margin for the deepest card's own translate
  // offset (depthCap * 11px, see StackCard's style) plus its rotation, so nothing clips or
  // resolves against an undefined 0-size parent (the bug in the previous version of this).
  const stackBoxW = stackW + STACK_DEPTH_CAP * 32;
  const stackBoxH = stackH + STACK_DEPTH_CAP * 32;

  return (
    // A normal (non-absolute) flow child of `fanArea` — same centering fanArea already gives
    // FanCard/OpenFlourish, just applied to this whole group (stack box + caption) at once.
    <View style={styles.bunchGroup}>
      <View style={{ width: stackBoxW, height: stackBoxH }}>
        {Array.from({ length: depthCap }).map((_, d) => {
          const i = (topIndex + d) % total;
          return (
            <StackCard
              key={i}
              depth={d}
              depthCap={depthCap}
              face={faces[i]}
              photoUrl={items[i].textureUrl}
              cardW={stackW}
              cardH={stackH}
              rarity={deck[i].rarity}
              accentRGB={palette.accentRGB}
              isFront={d === 0}
              onPress={advance}
            />
          );
        })}
      </View>
      <View style={styles.stackCaption}>
        {total > 1 ? <Text style={styles.hint}>{`${topIndex + 1} / ${total} · TAP CARD FOR NEXT`}</Text> : null}
        <Pressable onPress={() => onInspect(topIndex)} hitSlop={10}>
          <Text style={styles.skipHint}>Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

const DEAL_STAGGER_MS = 55;
const DEAL_FLIGHT_MS = 460;
// Capped — a big pack still reads as "the whole hand being dealt away" with 12 flying cards; more
// than that is just more particles for no extra clarity, and the exit needs to stay fast.
const DEAL_MAX_CARDS = 12;

/** One card of the exit "deal it away" flight — see DealingOverlay. Positioned with plain pixel
 * math (not the '%'-based centering trick FanCard/StackCard use), since this renders directly
 * under `root` rather than inside a sized flex container, and percentage positioning against an
 * ambiguous ancestor is exactly what broke the stack summary twice already. */
function DealCard({
  index,
  verso,
  cardW,
  cardH,
  centerX,
  centerY,
  travel,
}: {
  index: number;
  verso: SkImage;
  cardW: number;
  cardH: number;
  centerX: number;
  centerY: number;
  travel: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * DEAL_STAGGER_MS, withTiming(1, { duration: DEAL_FLIGHT_MS, easing: Easing.in(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Deterministic per-card drift/rotation so the dealt cards fan out slightly instead of flying
  // away in an identical line — reads as a hand of cards being dealt, not one card duplicated.
  const driftX = ((index % 5) - 2) * 30;
  const rot = ((index % 7) - 3) * 7;
  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, p.value - 0.55) / 0.45,
    transform: [
      { translateX: centerX + driftX * p.value },
      { translateY: centerY - travel * 0.8 * p.value },
      { rotate: `${rot * p.value}deg` },
      { scale: 1 - p.value * 0.12 },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.dealSlot, { width: cardW, height: cardH, marginLeft: -cardW / 2, marginTop: -cardH / 2, zIndex: DEAL_MAX_CARDS - index }, style]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <SkiaImage image={verso} x={0} y={0} width={cardW} height={cardH} fit="cover" />
      </Canvas>
    </Animated.View>
  );
}

// The transition off this screen once every card's been pulled and the user swipes up (or taps
// Continue) — "like dealing cards to a player": the whole hand flies up and away one card after
// another instead of the screen just cutting to the next one. Purely decorative timing; onDone()
// (see HoldToOpenFanReveal's own beginLeave) fires on its own setTimeout sized to this animation,
// not from anything in here completing.
function DealingOverlay({ total, verso, cardW, cardH, width, height }: {
  total: number;
  verso: SkImage;
  cardW: number;
  cardH: number;
  width: number;
  height: number;
}) {
  const count = Math.min(total, DEAL_MAX_CARDS);
  const centerX = width / 2;
  const centerY = height * 0.46;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <DealCard key={i} index={i} verso={verso} cardW={cardW} cardH={cardH} centerX={centerX} centerY={centerY} travel={height} />
      ))}
    </View>
  );
}

function DescriptionPanel({
  item,
  card,
  tierColorHex,
  visible,
  onClose,
}: {
  item: ItemDetail | null;
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

export function HoldToOpenFanReveal({
  items,
  sku,
  deck,
  faces,
  verso,
  cardAspect,
  palette,
  compressed,
  autoAdvance,
  onDone,
}: {
  items: ItemDetail[];
  sku: PackSku;
  /** Same length/order as `items` — see each tier's own adapter (adaptRealDeck.ts,
   * adaptBlackLabelDeck.ts, reveal/engine/adaptCardPackDeck.ts). */
  deck: VaultCardData[];
  /** Pre-baked per-card fallback art (only shown for an item with no real catalog photo) and the
   * one shared card back, already snapshotted by the caller's own art module. */
  faces: SkImage[];
  verso: SkImage;
  cardAspect: number;
  palette: HoldToOpenPalette;
  /** Bulk-batch pacing only — undefined/false for every existing caller (a standalone pack
   * purchase never sets this), true for pack 2+ of a 10-pack batch (see CardPackFanReveal's own
   * doc comment for where this comes from). Shortens the flip's shared timing (FanCard's
   * FLIP_CONFIG_COMPRESSED); a GRAIL card is still exempted at the call site below, so the batch's
   * chase pull always gets its full-length moment regardless of pacing. */
  compressed?: boolean;
  /** Bulk-batch only — undefined/false for every existing (single-pack) caller. When true, CORE
   * and PRIME cards open and dock themselves on a timer instead of waiting for a tap — the thing
   * that actually makes 50 cards across 10 packs practical to sit through. GRAIL is the one
   * exception: it's never auto-advanced, so the chase pull always still needs a real tap to open
   * and another to move on, preserving agency at the one moment that matters. A tap always still
   * works during auto-advance too — it just pre-empts whichever timer is pending. */
  autoAdvance?: boolean;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const total = deck.length;
  const rarities = useMemo(() => deck.map((c) => c.rarity), [deck]);
  const hold = useHoldToOpenDeck(rarities, autoAdvance);

  const cardW = Math.min(220, width * 0.56);
  const cardH = cardW / cardAspect;

  // Only one card is ever on screen: whichever is open (mid-inspection, waiting to be set
  // aside), or failing that the next sealed one. -1 once every card has been pulled.
  const visibleIndex = hold.openIndex ?? hold.status.indexOf("sealed");
  const visibleRarity = visibleIndex >= 0 ? deck[visibleIndex]?.rarity : undefined;
  const visibleIsOpen = hold.openIndex === visibleIndex && visibleIndex >= 0;
  const visibleIsSealed = visibleIndex >= 0 && hold.status[visibleIndex] === "sealed";

  // Bulk-batch auto-cascade (see `autoAdvance`'s own doc comment) — CORE/PRIME open and dock
  // themselves on a timer, so a 50-card batch doesn't need 50 taps. GRAIL never auto-advances
  // here: the chase pull always waits on a real tap, both to open and to move on. PRIME still
  // gets a beat longer than CORE at both ends — a little anticipation before it flips, a little
  // longer look once it's open — so it reads as "something better just happened," not identical
  // to a common. A manual tap at any point pre-empts whichever timer is pending (see grab/dock's
  // own guards in useHoldToOpenDeck), so this never fights the user, only fills the silence.
  useEffect(() => {
    if (!autoAdvance || visibleIndex < 0 || visibleRarity === "GRAIL") return;
    const isPrime = visibleRarity === "PRIME";
    if (visibleIsSealed) {
      const t = setTimeout(() => hold.grab(visibleIndex), isPrime ? 300 : 100);
      return () => clearTimeout(t);
    }
    if (visibleIsOpen) {
      const t = setTimeout(() => hold.dock(), isPrime ? 950 : 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvance, visibleIndex, visibleRarity, visibleIsSealed, visibleIsOpen]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // "Details" (below) opens the inspect sheet for the currently-open card without consuming the
  // tap that would otherwise dock it — the card's own big face art already shows name/value/
  // rarity at this size, so this is for the extra stuff only the sheet has (traits, serial, 7D
  // delta), not required reading before moving on.
  function handleInspectOpen() {
    if (visibleIndex < 0) return;
    Haptics.selectionAsync();
    setSelectedIndex((cur) => (cur === visibleIndex ? null : visibleIndex));
  }

  const [showContinue, setShowContinue] = useState(false);
  useEffect(() => {
    if (!hold.done) {
      setShowContinue(false);
      return;
    }
    const t = setTimeout(() => setShowContinue(true), SETTLE_AFTER_LAST_MS);
    return () => clearTimeout(t);
  }, [hold.done]);

  const continueOpacity = useSharedValue(0);
  useEffect(() => {
    continueOpacity.value = withTiming(showContinue ? 1 : 0, { duration: 320 });
  }, [showContinue, continueOpacity]);

  // The exit off this screen, once the pull is fully done — "like dealing cards to a player":
  // the whole hand flies up and away (DealingOverlay) while everything else here fades, then
  // onDone() actually navigates away. Triggered by either swiping up (dragY/swipeGesture below)
  // or tapping Continue — both end the same way, so the destination doesn't depend on which
  // gesture got you there.
  const [leaving, setLeaving] = useState(false);
  const rootFade = useSharedValue(1);
  const dragY = useSharedValue(0);
  const dealCount = Math.min(total, DEAL_MAX_CARDS);
  const dealTotalMs = DEAL_STAGGER_MS * dealCount + DEAL_FLIGHT_MS;
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  function beginLeave() {
    if (leaving) return;
    setLeaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    rootFade.value = withTiming(0, { duration: dealTotalMs * 0.7 });
    leaveTimer.current = setTimeout(onDone, dealTotalMs + 80);
  }

  // 1:1 finger tracking while dragging up, reversible if released short of the threshold, and
  // velocity-aware so a fast flick completes even short of full travel — same gesture-physics
  // bar the pack tear itself already follows (see GestureLayer.tsx).
  const swipeGesture = Gesture.Pan()
    .activeOffsetY([-14, 14])
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      "worklet";
      if (event.translationY < 0) dragY.value = event.translationY;
    })
    .onEnd((event) => {
      "worklet";
      const swipedUp = event.translationY < -60 || event.velocityY < -500;
      if (swipedUp) {
        dragY.value = withTiming(0, { duration: 1 });
        runOnJS(beginLeave)();
      } else {
        dragY.value = withSpring(0);
      }
    });

  const continueStyle = useAnimatedStyle(() => ({
    opacity: continueOpacity.value,
    transform: [{ translateY: (1 - continueOpacity.value) * 10 + dragY.value }],
  }));
  const contentFadeStyle = useAnimatedStyle(() => ({ opacity: rootFade.value }));

  // Ambient vignette breathes brighter while a rarer card is open — same idea as
  // VaultTearStage/BlackLabelTearStage's own fire-driven vignette ramp, just tied to this
  // screen's own open state instead of a 3D scene snapshot.
  const dimSV = useSharedValue(0);
  useEffect(() => {
    dimSV.value = withTiming(hold.activeTuning?.dim ?? 0, { duration: 260 });
  }, [hold.activeTuning, dimSV]);
  const dimOverlayStyle = useAnimatedStyle(() => ({ opacity: dimSV.value * 0.5 }));

  const tierColorHex =
    selectedIndex !== null
      ? sku.rarityTiers.find((t) => t.level === items[selectedIndex].rarityTierLevel)?.colorHex ?? palette.accentHex
      : palette.accentHex;

  const totalValueCents = items
    .filter((_, i) => hold.status[i] === "pulled")
    .reduce((sum, item) => sum + item.currentValueCents, 0);

  // Same action, same copy, for every rarity — tap opens, tap again sets aside. In autoAdvance
  // (bulk-batch), that's still true — a tap still works and still does exactly this — it's just
  // no longer required for CORE/PRIME, which the hint should say plainly rather than keep
  // prompting for a tap the user doesn't need to make.
  const hint = hold.done
    ? ""
    : autoAdvance && visibleRarity !== "GRAIL"
      ? "Watching your pulls — tap to hurry"
      : hold.openIndex != null
        ? (autoAdvance ? "Your chase pull — tap to set it aside" : "Tap the card to set it aside")
        : (autoAdvance ? "Your chase pull — tap to open" : "Tap to open");

  const openCardIndex = hold.openIndex;
  const openCardTuning = openCardIndex != null ? hold.activeTuning : null;
  // Only Black Label's adapter sets a real `type` — Vault Break/Tier 1 decks leave it undefined,
  // so every one of these stays at its plain tier-accent fallback for those two tiers, unchanged.
  const openCardType = openCardIndex != null ? deck[openCardIndex]?.type : undefined;
  const openCardVisual = openCardType ? typeVisualOf(openCardType) : null;
  const openCardHex = openCardVisual?.hex ?? palette.accentHex;

  // liftSV snaps 0->1 the instant a card opens and back to 0 on dock — reused here for the
  // glow/vignette ramp so they build in exactly the same instant as the flip, not gradually.
  const glowStrengthSV = hold.liftSV;

  const showTypeWord = openCardIndex != null && openCardVisual && (openCardTuning?.rings ?? 0) > 0;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.contentWrap, contentFadeStyle]} pointerEvents={leaving ? "none" : "auto"}>
      <VaultVignette
        width={width}
        height={height}
        glowColor={palette.vignetteGlow}
        typeRGB={openCardVisual?.rgb}
        strength={glowStrengthSV}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dimOverlay, dimOverlayStyle]} />

      <View style={styles.header}>
        <Text style={styles.kicker}>{palette.kicker}</Text>
        <Text style={styles.title}>Your Pull</Text>
        <Text style={styles.counter}>{hold.revealedCount} / {total} REVEALED</Text>
      </View>

      <View style={styles.fanArea}>
        {visibleIndex >= 0 && (
          <FanCard
            key={visibleIndex}
            face={faces[visibleIndex]}
            verso={verso}
            photoUrl={items[visibleIndex].textureUrl}
            slot={CENTER_SLOT}
            cardW={cardW}
            cardH={cardH}
            revealed={!visibleIsSealed}
            isFront
            dimmed={false}
            zIndex={1}
            dealIndex={0}
            palette={palette}
            rarity={visibleRarity ?? "CORE"}
            compressed={!!compressed && visibleRarity !== "GRAIL"}
            interactive
            onPress={
              visibleIsOpen
                ? hold.dock
                : visibleIsSealed
                  ? () => hold.grab(visibleIndex)
                  : undefined
            }
          />
        )}
        {openCardIndex != null && openCardTuning ? (
          <OpenFlourish
            rings={openCardTuning.rings}
            motes={openCardTuning.motes}
            hex={openCardHex}
            fx={openCardVisual?.fx}
            cardY={-cardH * 0.3}
          />
        ) : null}
        {openCardIndex != null && openCardVisual ? (
          <TypeGlow rgb={openCardVisual.rgb} strengthSV={glowStrengthSV} cardY={-cardH * 0.3} />
        ) : null}
        {showTypeWord && openCardIndex != null && openCardVisual ? (
          <TypeWordOverlay
            text={`${deck[openCardIndex].rarityLabel} · ${(openCardType ?? "").split("/")[0].trim().toUpperCase()}`}
            hex={openCardVisual.hex}
          />
        ) : null}
        {hold.done ? (
          <RevealedBunch
            deck={deck}
            faces={faces}
            items={items}
            cardW={cardW}
            cardH={cardH}
            palette={palette}
            onInspect={(i) => {
              Haptics.selectionAsync();
              setSelectedIndex((cur) => (cur === i ? null : i));
            }}
          />
        ) : null}
        {showContinue ? <FinaleSparkle hex={palette.accentHex} /> : null}
      </View>

      <View style={styles.footer}>
        {!showContinue ? (
          <View style={styles.holdChrome}>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            {visibleIsOpen ? (
              <Pressable onPress={handleInspectOpen} hitSlop={10}>
                <Text style={styles.skipHint}>Details</Text>
              </Pressable>
            ) : !hold.done && hold.openIndex == null ? (
              <Pressable onPress={hold.revealAll} hitSlop={10}>
                <Text style={styles.skipHint}>Reveal all instead</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <GestureDetector gesture={swipeGesture}>
            <Animated.View style={[styles.continueWrap, continueStyle]}>
              <Text style={styles.totalLabel}>
                TOTAL VALUE <Text style={styles.totalValue}>${(totalValueCents / 100).toFixed(0)}</Text>
              </Text>
              <Pressable
                style={[styles.continueButton, { borderColor: `rgba(${palette.accentRGB},0.5)`, backgroundColor: `rgba(${palette.accentRGB},0.1)` }]}
                onPress={beginLeave}
              >
                <Text style={styles.continueLabel}>Continue</Text>
              </Pressable>
              <Text style={styles.skipHint}>or swipe up</Text>
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      <DescriptionPanel
        item={selectedIndex !== null ? items[selectedIndex] : null}
        card={selectedIndex !== null ? deck[selectedIndex] : null}
        tierColorHex={tierColorHex}
        visible={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
      />
      </Animated.View>
      {leaving ? (
        <DealingOverlay total={total} verso={verso} cardW={cardW} cardH={cardH} width={width} height={height} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05030a" },
  contentWrap: { flex: 1 },
  dimOverlay: { backgroundColor: "#000000" },
  dealSlot: { position: "absolute", left: 0, top: 0 },
  header: { alignItems: "center", paddingTop: 64, gap: 6 },
  kicker: {
    fontFamily: mono, fontSize: 10, letterSpacing: 3.4, color: "#b99b57", textTransform: "uppercase",
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
    backfaceVisibility: "hidden",
  },
  ring: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 220,
    height: 220,
    marginLeft: -110,
    marginTop: -110,
    borderRadius: 110,
    borderWidth: 1.5,
  },
  mote: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 4,
    height: 4,
    marginLeft: -2,
    marginTop: -2,
    borderRadius: 2,
  },
  typeGlowWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
  },
  typeWordWrap: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  typeWord: {
    fontFamily: fonts.black,
    fontSize: 15,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  finaleSpark: {
    position: "absolute",
    left: "50%",
    top: "42%",
  },
  // A normal, non-absolute flex child of fanArea — fanArea's own alignItems/justifyContent
  // ("center"/"center") does the actual screen-centering, same as it already does for
  // FanCard/OpenFlourish; this group just stacks its own two children (the sized stack box, then
  // the caption) vertically underneath one another.
  bunchGroup: {
    alignItems: "center",
    gap: 14,
  },
  stackSlot: {
    position: "absolute",
    left: "50%",
    top: "50%",
  },
  stackFace: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    backgroundColor: "#0c0a14",
  },
  stackCaption: { alignItems: "center", gap: 4 },
  footer: { alignItems: "center", paddingBottom: 40, minHeight: 108, justifyContent: "flex-end", gap: spacing.md },
  holdChrome: { alignItems: "center", gap: 10 },
  hint: {
    fontFamily: mono, fontSize: 10, letterSpacing: 2.6, textTransform: "uppercase",
    color: "rgba(244,236,224,0.4)",
  },
  skipHint: {
    fontFamily: mono, fontSize: 9, letterSpacing: 1.8, textTransform: "uppercase",
    color: "rgba(244,236,224,0.28)", marginTop: 2,
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
    borderColor: "rgba(232,207,162,0.28)",
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
    borderWidth: 1, borderColor: "rgba(232,207,162,0.3)", backgroundColor: "rgba(232,207,162,0.08)",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  traitText: { fontFamily: fonts.semibold, fontSize: 10.5, color: "#e8cf9a" },
  valueRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    borderTopWidth: 1, borderTopColor: "rgba(232,207,162,0.16)", paddingTop: 14,
  },
  sheetValueBig: { fontFamily: fonts.black, fontSize: 24, color: "#f4ece0", marginTop: 2 },
  deltaText: { fontFamily: fonts.bold, fontSize: 12.5 },
});

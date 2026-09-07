import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { PackSku } from "@grailhaus/shared";
import { accents, ink, typography } from "../theme/tokens";
import { packTile as packTileCopy } from "../content/copy";
import { Price } from "./Price";
import { WatchDial } from "./WatchDial";
import { StockBar } from "./StockBar";

/** Display-only labels/art — matches the mockup's own tier vocabulary
 * (CASUAL/MID/HIGH-STAKES, ENTRY/SIGNATURE/GRAIL). Not admin-configurable:
 * only the economics (price, odds, rarity) are meant to be data-driven —
 * this is just how a fixed set of six SKUs is captioned. Exported so BuySheet
 * can render the same tier chip/art without re-deriving them. */
export const TIER_LABEL: Record<string, string> = {
  street_rip: "CASUAL",
  vault_break: "MID",
  black_label: "HIGH-STAKES",
  reserve: "ENTRY",
  archive: "SIGNATURE",
  obsidian_vault: "GRAIL",
};

/** The middle-priced tier per category gets the mockup's bigger vertical
 * "hero" treatment; the other two are compact rows. Cards-only — watches
 * render every tier as an equal hairline row (no hero), per the mockup. */
export const HERO_TIER = new Set(["vault_break"]);

export const ART_GRADIENT: Record<string, [string, string]> = {
  street_rip: ["#E4FBFF", "#1668D8"],
  vault_break: ["#FFB3F0", "#6420C8"],
  black_label: ["#FFF0CC", "#5C4520"],
  reserve: ["#F4EFE4", "#3A342B"],
  archive: ["#FFF3D6", "#6B4E1E"],
  obsidian_vault: ["#FFF8E4", "#7A5A22"],
};

export function PackTile({ sku, onPress, disabled }: { sku: PackSku; onPress: () => void; disabled?: boolean }) {
  if (sku.category === "watches") return <WatchTileRow sku={sku} onPress={onPress} disabled={disabled} />;
  return <CardTile sku={sku} onPress={onPress} disabled={disabled} />;
}

/** Cards: a violet-glowing hero or a compact row, chunky pack art, a stock
 * bar, and the buy button right on the tile — matches the mockup's dense,
 * gamified "shop" register for Card World. */
function CardTile({ sku, onPress, disabled }: { sku: PackSku; onPress: () => void; disabled?: boolean }) {
  const accent = accents.cards;
  const isHero = HERO_TIER.has(sku.tier);
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.street_rip;
  const countLabel = packTileCopy.countLabel(sku.category, sku.itemCount);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.card,
        isHero ? styles.cardHero : styles.cardRow,
        isHero && { borderColor: `${accent.top}99`, shadowColor: accent.top },
        disabled && styles.cardDisabled,
      ]}
    >
      <View style={[styles.art, isHero ? styles.artHero : styles.artRow]}>
        <LinearGradient colors={art} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.artStrip} />
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.36)", "transparent"]}
          locations={[0.3, 0.46, 0.58]}
          start={{ x: 0.05, y: 0.28 }}
          end={{ x: 0.95, y: 0.72 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.info}>
        <View style={styles.tierPill}>
          <Text style={styles.tierPillText}>{TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, isHero && styles.nameHero]} numberOfLines={1}>
          {sku.name}
        </Text>
        <Text style={styles.sub}>{countLabel}</Text>
        <StockBar remaining={sku.stockRemaining} max={sku.maxStock} />

        <View style={styles.buyRow}>
          <LinearGradient colors={[accent.top, accent.bottom]} style={styles.buyBtn}>
            <Text style={styles.buyLabel}>{packTileCopy.rip}</Text>
            <LinearGradient colors={["#FFE27A", "#E0A016"]} style={styles.coin} />
            <Price cents={sku.priceCents} color={ink.text} />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

/** Watches: a single hairline-separated row per tier — a lit circular dial
 * on a plinth instead of a rectangular pack, quiet cream type, no bulk badge,
 * no loud stock bar unless genuinely low. Tapping the whole row opens the
 * buy sheet; there's no button drawn on the tile itself, matching the
 * mockup's calmer "choosing one thing, not shopping a grid" watches rows. */
function WatchTileRow({ sku, onPress, disabled }: { sku: PackSku; onPress: () => void; disabled?: boolean }) {
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.reserve;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.watchRow, disabled && styles.cardDisabled]}>
      <WatchDial art={art} size={62} />
      <View style={styles.watchInfo}>
        <Text style={styles.watchTier}>{TIER_LABEL[sku.tier] ?? sku.tier.toUpperCase()}</Text>
        <Text style={styles.watchName} numberOfLines={1}>
          {sku.name}
        </Text>
        <Text style={styles.watchSub}>{packTileCopy.countLabel(sku.category, sku.itemCount)}</Text>
        <StockBar remaining={sku.stockRemaining} max={sku.maxStock} />
      </View>
      <View style={styles.watchPriceWrap}>
        <Text style={typography.priceWatches}>${(sku.priceCents / 100).toLocaleString()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 14,
    gap: 14,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardDisabled: { opacity: 0.5 },
  cardHero: {
    flexDirection: "column",
    alignItems: "stretch",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 44,
    elevation: 10,
  },
  art: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.34)",
    overflow: "hidden",
  },
  artRow: { width: 76, height: 104, flexShrink: 0, alignSelf: "center" },
  artHero: { width: "100%", height: 190, alignSelf: "stretch" },
  artStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "16%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255,255,255,0.44)",
    borderStyle: "dashed",
  },
  info: { flex: 1, minWidth: 0 },
  tierPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  tierPillText: typography.tierPill,
  name: { ...typography.packName, marginTop: 8 },
  nameHero: { fontSize: typography.packNameHero.fontSize, lineHeight: typography.packNameHero.lineHeight },
  sub: { ...typography.packSub, marginTop: 4 },
  buyRow: { flexDirection: "row", gap: 9, marginTop: 12 },
  buyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.26)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  buyLabel: {
    ...typography.ripLabel,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  coin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFE27A",
  },

  watchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  watchInfo: { flex: 1, minWidth: 0 },
  watchTier: typography.tierPillWatches,
  watchName: { ...typography.packNameWatches, marginTop: 5 },
  watchSub: { ...typography.packSubWatches, marginTop: 3 },
  watchPriceWrap: { alignItems: "flex-end", flexShrink: 0 },
});

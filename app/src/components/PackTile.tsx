import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { PackSku } from "@grailhaus/shared";
import { accents, fonts, typography } from "../theme/tokens";
import { packTile as packTileCopy } from "../content/copy";
import { WatchDial } from "./WatchDial";
import { StockBar } from "./StockBar";

/** Display-only labels/art — matches the mockup's own tier vocabulary
 * (CASUAL/MID/HIGH-STAKES, ENTRY/SIGNATURE/GRAIL). Not admin-configurable:
 * only the economics (price, odds, rarity) are meant to be data-driven —
 * this is just how a fixed set of six SKUs is captioned. Exported so other
 * screens (ConfirmPurchaseSheet, ShelfScreen's tier rows, ...) can render the
 * same tier chip/art without re-deriving them. */
export const TIER_LABEL: Record<string, string> = {
  street_rip: "CASUAL",
  vault_break: "MID",
  black_label: "HIGH-STAKES",
  reserve: "ENTRY",
  archive: "SIGNATURE",
  obsidian_vault: "GRAIL",
};

/** A pack SKU whose `tier` slug isn't one of the six curated ones above (any pack created for a
 * new category via the admin dashboard, e.g. "atelier_drop") used to fall back to the raw slug
 * uppercased with its underscore intact ("ATELIER_DROP") — every call site duplicated that same
 * `tierLabel(sku)` fallback, so it's centralized here once, with
 * the fallback itself prettified (spaces instead of underscores) instead of showing the raw slug. */
export function tierLabel(sku: { tier: string }): string {
  return TIER_LABEL[sku.tier] ?? sku.tier.replace(/_/g, " ").toUpperCase();
}

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

export function PackTile({
  sku,
  onBuy,
  disabled,
}: {
  sku: PackSku;
  onBuy: (quantity: 1 | 10) => void;
  disabled?: boolean;
}) {
  if (sku.category === "watches") return <WatchTileRow sku={sku} onPress={() => onBuy(1)} disabled={disabled} />;
  return <CardTile sku={sku} onBuy={onBuy} disabled={disabled} />;
}

/** Cards: a violet-glowing hero or a compact row, chunky pack art, a stock
 * bar, and a BUY 1 / ×10 button pair right on the tile — matches the
 * mockup's dense, gamified "shop" register for Card World. Bulk (×10) is
 * only offered on Casual/Mid, per the mockup's own footnote and the
 * backend's bulk-purchase rules. */
function CardTile({
  sku,
  onBuy,
  disabled,
}: {
  sku: PackSku;
  onBuy: (quantity: 1 | 10) => void;
  disabled?: boolean;
}) {
  const accent = accents.cards;
  const isHero = HERO_TIER.has(sku.tier);
  const art = ART_GRADIENT[sku.tier] ?? ART_GRADIENT.street_rip;
  const countLabel = packTileCopy.countLabel(sku.category, sku.itemCount);
  // Every card tier can batch now that a bulk buy runs the Grail Hunt presentation rather than
  // replaying a per-pack reveal ten times (see engine/cards/bulk/ and PackDetailScreen's own
  // `bulkEligible`); the only remaining gate is having the stock to actually sell ten.
  const canBulk = sku.stockRemaining == null || sku.stockRemaining >= 10;

  return (
    <View
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
          <Text style={styles.tierPillText}>{tierLabel(sku)}</Text>
        </View>
        <Text style={[styles.name, isHero && styles.nameHero]} numberOfLines={1}>
          {sku.name}
        </Text>
        <Text style={styles.sub}>{countLabel}</Text>
        <StockBar remaining={sku.stockRemaining} max={sku.maxStock} fillColor={accent.top} />

        <View style={styles.buyRow}>
          <Pressable onPress={() => onBuy(1)} disabled={disabled} style={styles.buyBtnWrap}>
            <LinearGradient colors={[accent.top, accent.bottom]} style={styles.buyBtn}>
              <Text style={styles.buyLabel}>{packTileCopy.buyOne}</Text>
              <LinearGradient colors={["#FFE27A", "#E0A016"]} style={styles.coin} />
              <Text style={styles.buyPrice}>{Math.round(sku.priceCents / 100)}</Text>
            </LinearGradient>
          </Pressable>
          {canBulk && (
            <Pressable onPress={() => onBuy(10)} disabled={disabled} style={styles.buyTenBtn}>
              <Text style={styles.buyTenLabel}>{packTileCopy.buyTen}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
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
        <Text style={styles.watchTier}>{tierLabel(sku)}</Text>
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
  artRow: { width: 80, height: 108, flexShrink: 0, alignSelf: "center" },
  artHero: { width: 142, height: 194, alignSelf: "center" },
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
  buyBtnWrap: { flex: 1 },
  buyBtn: {
    height: 46,
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
  buyPrice: { fontFamily: fonts.extrabold, fontSize: 13.5, color: "#FFFFFF" },
  coin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFE27A",
  },
  buyTenBtn: {
    width: 58,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  buyTenLabel: { fontFamily: fonts.black, fontSize: 13.5, color: "#FFFFFF" },

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

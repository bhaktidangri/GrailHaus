import type { CategoryRevealConfig } from "../core/types";
import { CardMesh } from "../components/CardMesh";

export const cardsConfig: CategoryRevealConfig = {
  id: "cards",
  label: "Trading Cards",
  // Deliberately its own moody, tension-appropriate palette — not the bright
  // shell tokens. The shelf is glossy and light; the rip itself still needs
  // to feel like a held breath.
  palette: { background: "#151226", accent: "#f4c94f" },
  lighting: [
    { kind: "ambient", intensity: 0.5 },
    { kind: "directional", position: [3, 4, 5], intensity: 1.2 },
    { kind: "directional", position: [-4, -2, -3], intensity: 0.3, color: "#7dd3fc" },
  ],
  camera: { position: [0, 0, 4], fov: 50 },
  buildMesh: (_item, { openProgress, tierColor }) => (
    <CardMesh tierColor={tierColor} openProgress={openProgress} />
  ),
  gesture: { mode: "tear", velocityThreshold: 800, travelDistance: 180 },
  timing: { commonBeatMs: 900, rareHoldMs: 2200 },
  hapticTrack: (phase, isRare) => {
    if (phase !== "opening") return [];
    return isRare
      ? [
          { atMs: 0, kind: "light" },
          { atMs: 250, kind: "medium" },
          { atMs: 600, kind: "heavy" },
          { atMs: 1200, kind: "heavy" },
          { atMs: 1900, kind: "success" },
        ]
      : [
          { atMs: 0, kind: "light" },
          { atMs: 200, kind: "medium" },
        ];
  },
  // Rarity is already ordinal (1..3) — commons first, Grail last, no lookup table needed.
  revealOrder: (items) => [...items].sort((a, b) => a.rarityTierLevel - b.rarityTierLevel),
};

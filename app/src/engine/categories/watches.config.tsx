import type { CategoryRevealConfig } from "../core/types";
import { WatchMesh } from "../components/WatchMesh";

export const watchesConfig: CategoryRevealConfig = {
  id: "watches",
  label: "Watches",
  palette: { background: "#0a0908", accent: "#c9a24b" },
  lighting: [
    { kind: "ambient", intensity: 0.2 },
    { kind: "directional", position: [2, 3, 4], intensity: 0.9, color: "#fff4dd" },
  ],
  camera: { position: [0, 0.4, 3.2], fov: 40 },
  buildMesh: (_item, { openProgress, tierColor }) => (
    <WatchMesh tierColor={tierColor} openProgress={openProgress} />
  ),
  gesture: { mode: "lift-lid", velocityThreshold: 500, travelDistance: 140 },
  timing: { commonBeatMs: 1400, rareHoldMs: 3000 },
  hapticTrack: (phase, isRare) => {
    if (phase !== "opening") return [];
    return isRare
      ? [
          { atMs: 0, kind: "light" },
          { atMs: 500, kind: "medium" },
          { atMs: 1400, kind: "heavy" },
          { atMs: 2600, kind: "success" },
        ]
      : [
          { atMs: 0, kind: "light" },
          { atMs: 400, kind: "medium" },
        ];
  },
  // Same lift-the-lid gesture and hold duration as always — this only narrates it in
  // labeled beats instead of one silent hold, per the cinematic reveal's slower pacing.
  openingBeats: (isRare) =>
    isRare
      ? [
          { atMs: 0, label: "VAULT DOOR OPENING" },
          { atMs: 700, label: "BUILDING PRESSURE" },
          { atMs: 1500, label: "SILHOUETTE VISIBLE" },
          { atMs: 2300, label: "RARITY LOCKING IN" },
        ]
      : [
          { atMs: 0, label: "VAULT DOOR OPENING" },
          { atMs: 500, label: "LIGHT SPILLING IN" },
          { atMs: 900, label: "SILHOUETTE VISIBLE" },
        ],
  revealOrder: (items) => [...items].sort((a, b) => a.rarityTierLevel - b.rarityTierLevel),
};

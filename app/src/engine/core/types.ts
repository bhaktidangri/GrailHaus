import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { Category, PulledItem } from "@grailhaus/shared";

export type RevealPhase = "idle" | "gesture" | "opening" | "settled" | "summary";

export interface HapticStep {
  /** Milliseconds after the phase starts. */
  atMs: number;
  kind: "light" | "medium" | "heavy" | "success";
}

export interface LightDef {
  kind: "ambient" | "directional";
  position?: [number, number, number];
  intensity: number;
  color?: string;
}

/**
 * The whole extension point. A category's personality — model, materials,
 * lighting, camera, timing, haptics, gesture feel, pacing order — is this
 * one object. RevealEngine.tsx is written once against this interface;
 * adding a new category (e.g. handbags) means writing one of these plus a
 * registry entry, never touching the engine, gesture layer, or haptics
 * track.
 */
export interface CategoryRevealConfig {
  id: Category;
  label: string;
  palette: { background: string; accent: string };
  lighting: LightDef[];
  camera: { position: [number, number, number]; fov: number };
  /**
   * Builds the category-specific R3F mesh subtree for one pulled item.
   * `openProgress` is a reanimated shared value (0 = sealed, 1 = fully
   * open/torn) — implementations read `.value` inside their own
   * `useFrame`, they don't receive a plain number as a prop, so the mesh
   * updates every GPU frame without round-tripping through React state.
   * `tierColor` is resolved by the engine from the pack's admin-configurable
   * rarity_tiers data for this pull's tier level — never hardcoded here.
   */
  buildMesh: (
    item: PulledItem,
    opts: { openProgress: SharedValue<number>; tierColor: string }
  ) => ReactNode;
  gesture: {
    mode: "tear" | "lift-lid";
    /** px/ms above which a partial drag still counts as a completed gesture. */
    velocityThreshold: number;
    /** px of travel that counts as a full gesture at zero velocity. */
    travelDistance: number;
  };
  timing: { commonBeatMs: number; rareHoldMs: number };
  hapticTrack: (phase: RevealPhase, isRare: boolean) => HapticStep[];
  /** Commons first, rare last — but each category can weight this differently. */
  revealOrder: (items: PulledItem[]) => PulledItem[];
}

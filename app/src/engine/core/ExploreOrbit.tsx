// Touch-driven "look at it from every side" exploration — RevealEngine's own generic add-on
// (not a watches-specific feature), active once a reveal has actually settled: drag to orbit the
// piece around its own center (1:1 with the finger, exactly like every other gesture in this
// app — no easing/snapping the drag itself, see instructions.md's own gesture-physics bar),
// pinch to zoom in on it. Distinct from GestureLayer's own Pan (which drives the tear/lift
// gesture and is only meaningful before a reveal settles) — this is a second, separate gesture
// scoped to after that, never active at the same time.
import { type ReactNode, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { useFrame } from "@react-three/fiber/native";
import type { Group } from "three";

const YAW_SENSITIVITY = 0.008;
const PITCH_SENSITIVITY = 0.008;
// Clamped well short of ±90° — past that the piece would flip past vertical and read as
// "broken," not "rotated." A real orbit rig would re-derive up-vector; this is a display piece
// sitting on a fixed base, not a free-floating object, so a bounded tilt is the honest range.
const PITCH_LIMIT = 0.6;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.7;

export interface ExploreOrbitHandle {
  yaw: SharedValue<number>;
  pitch: SharedValue<number>;
  zoom: SharedValue<number>;
}

export function useExploreOrbit(): ExploreOrbitHandle {
  const yaw = useSharedValue(0);
  const pitch = useSharedValue(0);
  const zoom = useSharedValue(1);
  return { yaw, pitch, zoom };
}

/** The touch surface — rendered as a sibling *on top of* the Canvas (same reason GestureLayer's
 * own Pan gesture had to move to an overlay-sibling instead of a wrapping parent: an r3f native
 * Canvas hardcodes its own PanResponder internally, which wins the touch-responder race over an
 * ancestor GestureDetector every time). Only ever mounted while `active`, so it never contests
 * GestureLayer's own tear/lift gesture beforehand. */
export function ExploreOrbitSurface({ handle, active }: { handle: ExploreOrbitHandle; active: boolean }) {
  const { yaw, pitch, zoom } = handle;
  const baseYaw = useSharedValue(0);
  const basePitch = useSharedValue(0);
  const baseZoom = useSharedValue(1);

  if (!active) return null;

  const pan = Gesture.Pan()
    .onStart(() => {
      "worklet";
      baseYaw.value = yaw.value;
      basePitch.value = pitch.value;
    })
    .onUpdate((e) => {
      "worklet";
      yaw.value = baseYaw.value + e.translationX * YAW_SENSITIVITY;
      pitch.value = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, basePitch.value - e.translationY * PITCH_SENSITIVITY));
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      "worklet";
      baseZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      "worklet";
      zoom.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, baseZoom.value * e.scale));
    });

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
      <View style={StyleSheet.absoluteFill} />
    </GestureDetector>
  );
}

/** Goes *inside* the Canvas, wrapping whatever `config.buildMesh` returned, applying the
 * gesture's current yaw/pitch/zoom every frame — a plain ref + useFrame, the same
 * read-a-shared-value-from-the-JS-thread-render-loop pattern this file's sibling meshes already
 * use, not a second animation system. Doesn't touch anything inside `children` — a mesh's own
 * internal scale (e.g. WatchMesh's CASE_SCALE) composes with this rather than being replaced by it. */
export function ExploreOrbitGroup({ handle, children }: { handle: ExploreOrbitHandle; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y = handle.yaw.value;
    ref.current.rotation.x = handle.pitch.value;
    ref.current.scale.setScalar(handle.zoom.value);
  });
  return <group ref={ref}>{children}</group>;
}

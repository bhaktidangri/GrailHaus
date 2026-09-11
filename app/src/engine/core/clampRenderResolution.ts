// Caps the resolution the 3D reveal scenes actually render at.
//
// Why this exists as an `onCreated` hook rather than the `dpr` prop everyone reaches for first:
// @react-three/fiber's *native* Canvas does not accept `dpr` at all. It omits the prop from its
// own CanvasProps and hardcodes `dpr: PixelRatio.get()` when it configures the root, with the
// comment "expo-gl can only render at native dpr/resolution". That's true of the GL *surface* —
// expo-gl allocates it at the device's native pixel size and we can't ask it for a smaller one —
// but it is not true of the *render target*: three.js's own setPixelRatio controls the size of
// the buffer it draws into, and expo-gl then scales that up to the surface for free on the GPU's
// blit. So the drawing cost is set here, not by the surface size.
//
// That matters because every one of these tear scenes is fill-rate bound, not vertex bound: big
// lit foil sheets, soft shadows, and (on Black Label) additive particle layers that overdraw the
// same pixels many times over. Fragment cost scales with the *square* of the pixel ratio, so on
// a 3x phone an uncapped buffer is ~9x the fragments of a 1x one and ~2.25x a 2x one — which on
// these scenes is the difference between comfortably holding the frame budget and missing it.
// A 3x-density phone renders this pack a couple of centimetres across; the detail past 2x is not
// resolvable, so this is close to free visually.
//
// Capped rather than fixed: a 1x or 1.5x device (or anything already at or below the cap) keeps
// its own ratio untouched and loses nothing.
import { PixelRatio } from "react-native";
import type { RootState } from "@react-three/fiber";

/** Highest pixel ratio any reveal scene renders at. 2 keeps text/edge detail on the pack's foil
 * crisp while cutting a 3x device's fragment count by more than half. */
export const MAX_RENDER_PIXEL_RATIO = 2;

/** Pass as `onCreated` to a reveal scene's `<Canvas>`. Safe to call on any device — it only ever
 * lowers the ratio, never raises it. */
export function clampRenderResolution(state: RootState) {
  const native = PixelRatio.get();
  if (native > MAX_RENDER_PIXEL_RATIO) {
    state.gl.setPixelRatio(MAX_RENDER_PIXEL_RATIO);
  }
}

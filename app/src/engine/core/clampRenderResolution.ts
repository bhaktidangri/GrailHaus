// Render-resolution policy for the 3D reveal scenes.
//
// The rip is the moment these tiers sell, so the default here is deliberately NOT to cap it:
// every scene renders at the device's own native pixel ratio, full sharpness, exactly as
// designed. Nothing is given away up front on the assumption that a device might struggle.
//
// What this module provides instead is the *floor* and the rungs that useAdaptiveQuality steps
// through, and it only ever steps if a specific device is measurably missing frames. A phone
// that can hold 60fps at 3x keeps 3x for the whole reveal and never touches this.
//
// Why resolution is the right thing to give up FIRST, if something has to give:
//   - It is the only lever that does not change what the tear *is*. Dropping geometry coarsens
//     the torn edge and the crinkle folds (both are sampled per-vertex); dropping lights or
//     shadows changes how the foil reads. Resolution changes only how many pixels the same
//     animation is drawn into — the silhouette, the folds, the choreography, the timing are all
//     bit-identical at every rung.
//   - These scenes are fill-rate bound (large lit foil surfaces, soft shadows, and on Black
//     Label additive particle layers that overdraw heavily), so pixels are the dominant cost and
//     scaling them is close to a linear win — the most frame time recovered per unit of quality.
//
// Note on the `dpr` prop: @react-three/fiber's native Canvas does not accept one. It omits it
// from CanvasProps and hardcodes `dpr: PixelRatio.get()`, commenting "expo-gl can only render at
// native dpr/resolution". That is true of the GL *surface* but not of the *render target* —
// three.js's setPixelRatio sizes the buffer it draws into, and expo-gl blits that up to the
// surface on the GPU. So resolution is controlled here, via the renderer, not via a prop.
import { PixelRatio } from "react-native";

/** Resolution rungs the adaptive governor steps down through, sharpest first.
 *
 * `Infinity` is the first rung and means "whatever this device's native ratio is" — the scene
 * starts here and stays here unless frames are actually being missed. The rungs below it are
 * only ever reached by a device that demonstrated it could not hold the budget. */
export const RESOLUTION_RUNGS = [Infinity, 2, 1.5, 1.25, 1] as const;

/** Never render below this. Past 1x the pack stops reading as foil at all, and a device that
 * cannot hold the frame budget at 1x has a problem more resolution cuts will not fix. */
export const MIN_RENDER_PIXEL_RATIO = 1;

/** Resolves a rung to the actual pixel ratio to hand three.js on this device. The first rung
 * resolves to the device's native ratio; lower rungs are only applied if they are genuinely
 * below it, so a 1.5x phone is never "stepped down" to a ratio it never exceeded. */
export function resolveRung(rung: number): number {
  const native = PixelRatio.get();
  return Math.max(MIN_RENDER_PIXEL_RATIO, Math.min(native, rung));
}

// Keeps a reveal scene inside its frame budget on hardware we can't test on.
//
// The rest of the performance work is unconditional and costs nothing visually: deform only on
// frames where the tear actually moved, precompute the per-vertex terms that never change, skip
// the liner while it is occluded, stop re-rendering the shadow map when nothing has moved. Full
// geometry, full shadow resolution and full native render resolution are all kept.
//
// This is the backstop for the case those are not enough on some specific device. "Never below
// 60fps on an average device" is a claim about a distribution of hardware, and the bottom of
// that distribution is always slower than whatever it was tuned on — so rather than pre-emptively
// degrading the rip for everyone, the scene starts at full quality and only gives something up
// on a device that is measurably missing frames.
//
// Resolution is the only thing it gives up, and that is deliberate: it is the single lever that
// leaves the animation itself untouched. The torn silhouette, the crinkle folds, the gape, the
// physics, the timing are bit-identical at every rung — only the pixel count the same frame is
// drawn into changes. Cutting geometry or lights instead would change what the tear *is*.
//
// Deliberately conservative in four ways, because a governor that thrashes is worse than none:
//   - It starts at the device's NATIVE ratio. No device is capped on suspicion.
//   - It ignores the opening frames outright. Shader compilation, texture upload and the intro
//     dolly all land there and none of them represent steady-state cost.
//   - It needs a sustained run of slow frames, not a spike. One long frame is a GC pause or an
//     OS interrupt; a scene that genuinely cannot hold the budget misses consistently.
//   - It only ever steps DOWN, once per window. A scene lasts seconds; recovering resolution
//     mid-tear would mean a visible resolution pop in the middle of the one animation the user
//     is watching.
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber/native";
import { RESOLUTION_RUNGS, resolveRung } from "./clampRenderResolution";

/** Frame budget to defend, in milliseconds. 60fps is 16.67ms; the threshold sits slightly above
 * it so a scene merely *at* the budget is not treated as failing it. */
const BUDGET_MS = 18;

/** Frames discarded at the start of a scene — shader compilation, texture upload and the intro
 * dolly all land here and none of them represent steady-state cost. */
const WARMUP_FRAMES = 45;

/** How many frames each decision is averaged over. At 60fps this is half a second: long enough
 * that a single GC pause cannot trip it, short enough to react within the tear itself. */
const WINDOW = 30;

/** Fraction of a window that must miss the budget before stepping down. */
const MISS_RATIO = 0.5;

/**
 * Watches this Canvas's real frame times and steps render resolution down only if the scene is
 * persistently missing the frame budget. Mount once inside a `<Canvas>`; renders nothing.
 *
 * Returns nothing on purpose — nothing in the scene should branch on the current quality level.
 * The whole point is that the choreography is identical at every rung and only the pixel count
 * moves, so a lower rung can never change what the tear *does*, only how sharp it is.
 */
export function useAdaptiveQuality() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const misses = useRef(0);
  const rung = useRef(0);

  // Start explicitly at the device's native ratio (rung 0 === Infinity === native). r3f already
  // configures this, but setting it here makes the starting point of the ladder unambiguous and
  // means a remount always begins at full quality rather than inheriting a previous scene's
  // stepped-down state.
  useEffect(() => {
    rung.current = 0;
    gl.setPixelRatio(resolveRung(RESOLUTION_RUNGS[0]));
  }, [gl]);

  useFrame((_state, delta) => {
    frames.current++;
    if (frames.current <= WARMUP_FRAMES) return;

    // `delta` is seconds since the previous frame — the frame time being defended.
    if (delta * 1000 > BUDGET_MS) misses.current++;

    const n = frames.current - WARMUP_FRAMES;
    if (n % WINDOW !== 0) return;

    const missed = misses.current;
    misses.current = 0;
    if (missed < WINDOW * MISS_RATIO) return;

    // Sustained miss: step down, if there is a rung left that is actually below where we are.
    const next = rung.current + 1;
    if (next >= RESOLUTION_RUNGS.length) return;
    const current = resolveRung(RESOLUTION_RUNGS[rung.current]);
    const target = resolveRung(RESOLUTION_RUNGS[next]);
    rung.current = next;
    // On a device whose native ratio already sits at or below this rung, stepping "down" would
    // be a no-op — skip the renderer call (which forces a full buffer reallocation) and let the
    // next window try the rung below instead.
    if (target >= current) return;
    gl.setPixelRatio(target);
    // The shadow map is sized off the renderer and PackTearMesh may have parked it with
    // autoUpdate off — force one redraw so it is not left at the previous resolution.
    gl.shadowMap.needsUpdate = true;
  });

  return null;
}

/** Component form, for mounting the governor as a child of a `<Canvas>` (hooks that call
 * `useFrame` have to run inside the r3f tree). Renders nothing. */
export function AdaptiveQuality() {
  useAdaptiveQuality();
  return null;
}

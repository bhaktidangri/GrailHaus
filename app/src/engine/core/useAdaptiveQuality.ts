// Keeps a reveal scene inside its frame budget on hardware we can't test on.
//
// Everything else in the performance pass is static: fewer vertices, precomputed tables, a
// capped render resolution, shadow maps that only redraw when something moved. Those choices are
// made once, for a device we guessed at. This is the part that reacts to the device actually in
// someone's hand — because "never below 60fps on an average device" is a claim about a
// distribution of hardware, and the bottom of that distribution is always slower than the bench
// it was tuned on.
//
// How it works: sample real frame times, and if the scene is persistently missing the budget,
// step the render resolution down. Resolution is the right lever because these scenes are
// fill-rate bound — big lit foil surfaces, soft shadows, and on Black Label additive particle
// layers that overdraw the same pixels repeatedly — so pixels are the dominant cost and scaling
// them is close to a linear win. It also degrades gracefully: a slightly softer pack that holds
// 60fps reads far better than a crisp one that hitches, and unlike dropping geometry or lights
// it changes nothing about the choreography, so the tear still looks and feels like itself.
//
// Deliberately conservative in three ways, because a governor that thrashes is worse than none:
//   - It only ever steps DOWN. A scene lasts a few seconds; recovering resolution mid-tear would
//     mean a visible resolution pop in the middle of the one animation the user is watching.
//   - It ignores the first samples outright. The opening frames of a reveal include shader
//     compilation, texture upload and the intro dolly — never representative, and reacting to
//     them would down-res every device on principle.
//   - It needs a sustained run of slow frames, not a spike. One long frame is a GC pause or an
//     OS interrupt; a scene that genuinely can't hold the budget misses it consistently.
import { useEffect, useRef } from "react";
import { PixelRatio } from "react-native";
import { useFrame, useThree } from "@react-three/fiber/native";
import { MAX_RENDER_PIXEL_RATIO } from "./clampRenderResolution";

/** Frame budget to defend, in milliseconds. 60fps is 16.67ms; the threshold sits slightly above
 * it so a scene that is merely *at* the budget isn't treated as failing it. */
const BUDGET_MS = 18;

/** Frames to discard at the start of a scene — shader compilation, texture upload and the intro
 * dolly all land here and none of them represent steady-state cost. */
const WARMUP_FRAMES = 45;

/** How many frames each decision is averaged over. At 60fps this is half a second: long enough
 * that a single GC pause can't trip it, short enough to react within the tear itself. */
const WINDOW = 30;

/** Fraction of a window that must miss the budget before stepping down. */
const MISS_RATIO = 0.5;

/** Resolution rungs, highest first. Never goes below 1 — past that the pack stops reading as
 * foil at all, and a scene that can't hold 60fps at 1x has a problem this can't fix. */
const RUNGS = [MAX_RENDER_PIXEL_RATIO, 1.5, 1.25, 1];

/**
 * Watches this Canvas's real frame times and steps the render resolution down if it is
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

  useEffect(() => {
    // A device already below the cap starts at its own ratio; there is no headroom to give back
    // and stepping down from a rung it never occupied would be wrong.
    const native = PixelRatio.get();
    rung.current = RUNGS.findIndex((r) => r <= native);
    if (rung.current < 0) rung.current = RUNGS.length - 1;
  }, []);

  useFrame((_state, delta) => {
    frames.current++;
    if (frames.current <= WARMUP_FRAMES) return;

    // `delta` is seconds since the previous frame — i.e. the frame time this is defending.
    if (delta * 1000 > BUDGET_MS) misses.current++;

    const n = frames.current - WARMUP_FRAMES;
    if (n % WINDOW !== 0) return;

    const missed = misses.current;
    misses.current = 0;
    if (missed < WINDOW * MISS_RATIO) return;

    // Sustained miss: drop a rung, if there is one left.
    const next = rung.current + 1;
    if (next >= RUNGS.length) return;
    rung.current = next;
    gl.setPixelRatio(RUNGS[next]);
    // The shadow map is sized off the renderer, and PackTearMesh may have parked it with
    // autoUpdate off — force one redraw so it isn't left at the previous resolution.
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

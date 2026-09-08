# GrailHaus

A React Native (Expo) port of the card-pack reveal from the Claude Design
handoff (`grailhaus-pack.html` + `rip-pack.js` + `pack-art.js`) — a
GPU-real, gesture-torn foil pack for the "Trading Cards" category of the
GrailHaus trial spec (see `design-handoff/instructions.md` for the full
40-hour brief this is one slice of).

## Scope of this pass

This patch implements **only Deliverable 1's card-pack reveal** — the 3D
tear-open pack, gesture physics, and card reveal — as a standalone screen.
It does not implement accounts, the shelf, purchases, drops, portfolio,
marketplace, or the concurrency/economics work the full trial also asks
for. That scope was agreed explicitly before writing any code, given how
large the full brief is.

Run it:

```sh
npm install
npx expo run:android   # or: npx expo run:ios
```

This needs a dev build, not Expo Go — the graphics path uses native
modules (`expo-gl`, `@shopify/react-native-skia`).

## Architecture

```
src/reveal/
  config/            category personality (colors, copy, size, timing,
                     haptic thresholds) — a new category is a new file
                     here, not a new screen. Only "trading-cards" exists;
                     the shape in config/types.ts is what a "watches" or
                     "handbags" personality would also implement.
  engine/
    noise.ts         multi-octave noise, ported verbatim
    buildPackObject.ts   pure three.js: geometry, tear/peel/gape
                     deformation, torn-strip physics. Ported from
                     project/rip-pack.js almost unchanged — it never
                     touched the DOM in the original either.
    textures.ts      DataTexture wrapper + logo asset loader
  art/
    packArt.ts       ported from design-handoff/pack-art.js onto Skia's
                     offscreen canvas (see "Why Skia for textures" below)
    canvasHelpers.ts small canvas-2D-shaped wrapper over Skia's Paint/
                     Path/Shader API (gradients, tracked text, dashed
                     lines) so packArt.ts reads as a port, not a rewrite
  gesture/
    useTearGesture.ts  the 1:1 / reversible / velocity-aware / interruptible
                     state machine (see below)
  haptics/
    hapticTrack.ts   sequenced haptic track (tick / give / commit / success)
  scene/
    PackScene.tsx    r3f scene: lighting rig, the pack object, the
                     invisible hit-plane that turns raycasts into gesture
                     input, per-frame engine wiring
  ui/
    VignetteBackground.tsx   the page's CSS radial-gradient vignette,
                     redrawn with Skia's declarative <Canvas>
  PackRevealScreen.tsx   the screen: loads the logo, lays the overlay
                     text and Reseal control over the Canvas
```

### Why react-three-fiber + expo-gl

`instructions.md` recommends this stack explicitly, and it's the shortest
path from the prototype: `rip-pack.js` is pure `three.js` math (geometry
construction, procedural vertex deformation, a small ballistic sim for the
torn strip) with **no DOM dependency** beyond where its texture came from —
so nearly the entire file ports unchanged into `engine/buildPackObject.ts`
(the original is kept for reference at `design-handoff/rip-pack.js`).
An `@shopify/react-native-skia` port would mean re-deriving the pillowed
3D geometry, per-vertex tear/peel/crinkle deformation, and lighting as a
2D approximation — a reinterpretation, not a port, and it's exactly the
"real-time 3D … not a layered-parallax illusion" the trial spec asks for.

**Fallback path**: not built in this pass. The trial's own answer —
detect an unsupported GL context and degrade to a 2D swipe-reveal — is a
second reveal implementation and out of scope for this patch; flagged
here rather than silently skipped.

### Why Skia for textures

React Native has no DOM `<canvas>`, so `rip-pack.js`'s
`new THREE.CanvasTexture(canvas)` has nothing to wrap. Two options:
pre-bake PNGs at build time, or generate the same art at runtime with a
canvas-shaped API. `@shopify/react-native-skia`'s CPU-backed offscreen
surface (`Skia.Surface.Make`, not `MakeOffscreen` — deliberately CPU, not
GPU, so there's no cross-context handoff between Skia's own GPU surface
and expo-gl's separate GL context) draws with a Paint/Path/Shader
vocabulary close enough to Canvas2D that `packArt.ts` is a function-for-
function port of `pack-art.js`, and `surface.getCanvas().readPixels(...)`
hands back a raw RGBA8 buffer that becomes a `THREE.DataTexture` directly
— no PNG encode/decode round trip. Textures are generated once per pack
build, not per frame.

One deliberate deviation: the front-panel's no-logo fallback drew a red
"clawMark" burst in the original file — leftover from an earlier,
differently-branded iteration in the chat history that never got cleaned
up in that specific branch. This port draws the gold ring+diamond+"G"
emblem (used elsewhere on the back face) instead, since a red claw burst
makes no sense on the GrailHaus violet/gold identity the rest of the pack
settled on.

**Texture resolution**: 640×960 (front/back) and 480×672 (card, one
texture shared across every card mesh) versus the prototype's 800×1200 —
a phone shows this pack at a fraction of a browser preview's width, so
the extra resolution was memory the pack didn't need. Every pixel
constant in `packArt.ts` is scaled by `width / 800`, so this is a tuning
knob, not a hardcoded assumption.

**Font**: baked-texture text uses Skia's `FontMgr.System().matchFamilyStyle`
against `"Georgia"` — the prototype's own CSS fallback chain was
`"Cormorant Garamond", Georgia, serif`, and Georgia is a real system font
on iOS; Android's FontMgr degrades to its default serif. Bundling the
actual Cormorant Garamond TTF for pixel-parity was cut for time — noted
here rather than left silent.

### Gesture physics — the four hard requirements

`useTearGesture.ts` reads pointer input off **react-three-fiber's own
raycasted pointer events**, not `react-native-gesture-handler`. Reasoning:
r3f-native's `Canvas` already installs its own `PanResponder` internally
to synthesize the pointer events its raycasting event system needs (see
`node_modules/@react-three/fiber/native/dist/*.cjs.dev.js`) — layering
RNGH's native gesture recognizers over the *same* view is two competing
touch-responder systems on one view tree, which is exactly the kind of
thing that produces intermittent, hard-to-repro gesture bugs on device.
Reading `event.point` (already a 3D intersection, converted to the pack's
local space with `pack.group.worldToLocal`) also deletes the screen-space
camera-projection math the web version needed (`cutSpan`/`cutAt` in
`grailhaus-pack.html`) — the intersection point is already in the same
local units as `seamY`/`W`.

- **1:1 finger tracking** — `progress` is set directly from the local-space
  fraction while `dragging` is true; no smoothing filter.
- **Reversible mid-gesture** — `onPointerUp` picks a spring target of 0 or
  1; letting go mid-pull springs back unless the flick/distance bar is met.
- **Velocity-aware completion** — release velocity feeds the spring's
  initial velocity *and* lowers the distance bar for completion (a flick
  finishes it, a slow drag past the same point doesn't).
- **Interruptible** — `onPointerDown` cancels any live settle spring
  outright, so a new touch takes over instantly, mid-animation or not.

### Haptics

`hapticTrack.ts` — a light tick every `1/14`th of the tear, a sharper
medium impact the instant the foil visibly gives, a heavy impact the
instant a release *commits* to completing (not when the spring finishes
animating), and a success notification if the user drags all the way
through without releasing. This is the P0 "sequenced platform-level
haptics" bar (`expo-haptics`) — the P1 bonus (CoreHaptics /
`VibrationEffect` composition) was not attempted.

### GPU memory discipline

`buildPackObject` returns a `dispose()` that frees every geometry,
material and texture it allocated (7 geometries, 9 materials, 4 textures
— see the arrays in `buildPackObject.ts`). `PackScene` calls it on
unmount/personality change. The full trial's per-batch memory-growth
requirement (ten packs in one session) isn't exercised here since bulk
ripping is out of this patch's scope, but the single-pack path is already
clean rather than leaking by default.

## What's cut from this pass (be upfront about it)

- **No fallback 2D path** for unsupported GL contexts.
- **No sequential per-card reveal / rare-pull slow-burn** — this pack
  tears open and all cards rise/fan together, matching the prototype's
  own behavior. The full trial wants commons-first, rare-last pacing
  across individual card flips; that's a different (larger) piece of work
  than "the pack."
- **No gyroscope-driven highlight.**
- **No bundled Cormorant Garamond TTF** (see Font, above).
- **Not run on a physical device or simulator** — this patch was built and
  type-checked (`npm run typecheck`, zero errors) in an environment
  without an iOS/Android runtime available. Treat the gesture/engine code
  as reviewed-carefully-but-unverified-on-hardware, not measured. The
  trial's own required performance table (cold-start frame time, memory
  per pack, frame pacing) could not be produced here for that reason —
  filling it in on a real mid-range Android is the first thing to do
  before trusting this feels right in the hand.

## `design-handoff/`

Reference only — not imported by the app:

- `grailhaus-pack.html`, `rip-pack.js`, `pack-art.js`, `three-d-stage.js`
  — the original Claude Design prototype this patch ports.
- `chat1.md` — the design iteration history. Genuinely worth reading
  before touching the tear physics; several "obvious" choices in
  `useTearGesture.ts` and `buildPackObject.ts`'s deformation math exist
  because earlier, more naive versions were tried in that chat and
  rejected for specific, articulated reasons (e.g. why the tear edge is
  multi-octave noise and not a straight line, why the strip falls under
  gravity instead of animating to a preset, why completion is judged
  against distance-still-reachable-from-grab-point rather than a fixed
  threshold).
- `instructions.md` — the full 40-hour trial brief this patch is one
  slice of.
- `GrailHaus Product Requirements Document.md` — product spec the card
  face's copy (rarity ribbon, valuation block, authentication footer)
  is drawn from.

The full handoff bundle (screenshots, PDFs, other uploads) was left out
of this patch to keep it to the code and the documents actually worth a
reviewer's time — ask if you want the rest included too.

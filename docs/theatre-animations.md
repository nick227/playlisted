# Theatre Animation Developer Guide

## Purpose

This document explains the theatre animation system in `apps/web/src/theatre`.
It is meant to help developers understand the current capabilities and build future audio-reactive scenes without duplicating the shared plumbing.

Theatre visuals are layered, audio-aware canvas animations. The controller owns playback binding, feature extraction, performance policy, preset selection, and the single frame loop. Individual animations focus on visual behavior.

## System Capabilities

The theatre system currently supports:

- fullscreen theatre overlays that leave the bottom player visible
- canvas animation layers composed into scene presets
- weighted preset selection by category
- reduced-motion preset fallback
- shared audio feature extraction from the active media element
- per-frame trigger helpers for beats, bass, mids, highs, and chaotic moments
- a single controller-owned RAF loop for externally driven animations
- device/performance policy for layer count, DPR, particles, and low-power mode
- optional micro-effects such as shockwaves, particles, rain surges, screen punch, and shake
- stop-motion style scripted scenes using a small story DSL
- static fallback visuals when every requested layer fails to initialize

## Core Files

- `apps/web/src/theatre/IAnimation.ts`
- `apps/web/src/theatre/TheatreController.ts`
- `apps/web/src/theatre/AnimationBridge.ts`
- `apps/web/src/theatre/CanvasAnimation.ts`
- `apps/web/src/theatre/AudioFeatureExtractor.ts`
- `apps/web/src/theatre/VisualTriggers.ts`
- `apps/web/src/theatre/getAudioBands.ts`
- `apps/web/src/theatre/MicroEffects.ts`
- `apps/web/src/theatre/PerformancePolicy.ts`
- `apps/web/src/theatre/scenePresets.ts`
- `apps/web/src/theatre/registry/index.ts`
- `apps/web/src/theatre/registry/seed.ts`
- `apps/web/src/theatre/stopMotion.ts`
- `apps/web/src/theatre/stopMotionScript.ts`
- `apps/web/src/theatre/scripts/*.script.ts`
- `apps/web/src/theatre/animations/*.ts`

## Runtime Flow

1. `TheatreController` binds to the active audio element.
2. On entry, the controller creates the overlay and computes the available theatre height above the bottom player.
3. The controller creates or reuses a shared analyser connection.
4. `AudioFeatureExtractor` produces shared features when an analyser is available.
5. `detectPolicy()` chooses layer count, DPR clamp, particle scale, and low-power behavior.
6. `pickPreset()` chooses a scene preset, with reduced-motion substitution when configured.
7. The controller converts preset layers into animation factories.
8. `AnimationBridge` creates each animation, calls `init(container, context)`, opts into external driving when supported, and calls `start()`.
9. The controller's single RAF loop updates shared time, updates audio features, and calls `bridge.renderFrame(context)`.
10. The bridge forwards frames to animation instances that implement `renderFrame()`.

This architecture keeps timing, audio, policy, and preset orchestration centralized while allowing animation modules to stay focused and expressive.

## Lifecycle Contract

All theatre visuals implement `IAnimation`:

```ts
interface IAnimation {
  init(container: HTMLElement, context: AnimationContext): Promise<void>
  start(): Promise<void>
  pause(): void
  resume(): void
  stop(): Promise<void>
  destroy(): void
  renderFrame?(context: AnimationContext): void
  enableExternalDriving?(): void
}
```

Required methods:

- `init(container, context)` creates DOM or canvas resources and attaches them to the container.
- `start()` marks the animation as running.
- `pause()` stops updates without destroying state.
- `resume()` resumes updates after pause.
- `stop()` stops cleanly and cancels any owned timers or RAF loops.
- `destroy()` removes DOM, event listeners, and internal references.

Optional methods:

- `enableExternalDriving()` tells an animation that the controller will drive frames.
- `renderFrame(context)` is called by the controller-owned RAF loop.

Most current canvas animations extend `CanvasAnimation`, which already implements this contract and supports external driving.

## Animation Context

`AnimationContext` is the shared input object passed to every layer:

```ts
type AnimationContext = {
  audioElement?: HTMLMediaElement | null
  analyser?: AnalyserNode | null
  mediaSrc?: string
  artworkUrl?: string
  metadata?: { title?: string; artist?: string }
  options?: AnimationOptions
  signals?: AbortSignal
  shared?: SharedContext
}
```

`shared` carries runtime state owned by the controller:

```ts
type SharedContext = {
  features?: Features
  reducedMotion?: boolean
  lowPower?: boolean
  dprClamp?: number
  particleScale?: number
  time?: {
    elapsed: number
    delta: number
    frame: number
  }
  getTriggers?: (preset?: string) => TriggerFrame
}
```

Use these fields first:

- `context.shared.features` for RMS, envelope, bands, flux, and centroid
- `context.shared.getTriggers(...)` for rhythm and onset events
- `context.shared.time` for elapsed time, frame delta, and frame number
- `context.shared.reducedMotion`, `lowPower`, and `particleScale` to scale effects

If `shared.features` is missing, use `this.readBands(context)` from `CanvasAnimation` or `bandsFromContext(context)` from `getAudioBands.ts`. This falls back to the analyser and then to a gentle synthetic signal.

## CanvasAnimation Base

`CanvasAnimation` is the default base class for canvas scenes. It provides:

- canvas creation and absolute positioning
- opacity, z-index, and blend-mode options
- high-DPI backing store setup through `resolveDpr`
- resize handling and cached CSS dimensions
- optional `MicroEffects`
- external frame driving through `renderFrame(context)`
- helper methods for audio bands and policy-aware effects

Use it when the visual renders to a canvas:

```ts
class MyScene extends CanvasAnimation {
  constructor() {
    super({ useEffects: true, defaultZIndex: 101 })
  }

  protected draw(context: AnimationContext) {
    const bands = this.readBands(context)
    const triggers = context.shared?.getTriggers?.('vivid')
    const t = context.shared?.time?.elapsed ?? performance.now()

    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)
    // Draw the scene using bands, triggers, and t.

    this.effects?.update(this.ctx, t, this.pixelRatio)
  }
}

export default function mySceneFactory(ctx: AnimationContext) {
  return new MyScene()
}
```

Keep scene state inside the class instance. Avoid direct page layout queries inside `draw`; use `this.cssWidth`, `this.cssHeight`, and the canvas context.

## Audio Features and Triggers

`AudioFeatureExtractor` computes:

- `rms`
- `env`
- band levels for `bass`, `mids`, and `highs`
- spectral flux overall and per band
- centroid/brightness

`VisualTriggers` converts features into:

- `bassHit`
- `midsHit`
- `highsHit`
- `beat`
- `chaosHit`
- `energy`
- `brightness`

Trigger presets currently include `tame`, `vivid`, `chaos`, and `nightmare`. Use a stronger preset only when the scene is intentionally aggressive.

Example:

```ts
const triggers = context.shared?.getTriggers?.(context.options?.preset ?? 'vivid')
if (triggers?.beat) {
  this.effects?.triggerScreenPunch(0.8)
}
```

## MicroEffects

`MicroEffects` is an accent layer, not the whole scene. Use it for short punctuation:

- `triggerShockwave(x, y, strength)`
- `triggerParticleBurst(x, y, count, strength, color)`
- `triggerRainSurge(count, strength, color)`
- `triggerScreenPunch(strength)`
- `getShake()`
- `update(ctx, time, dpr)`

`CanvasAnimation` syncs effect policy from `shared.particleScale` and `shared.lowPower`. Check `allowsShake(context)`, `allowsHeavyParticles(context)`, or `particleScale(context)` before adding expensive or intense effects.

## Performance Policy

`PerformancePolicy.ts` chooses one of four policies:

- full: up to 3 layers, DPR 2, full particles
- lite: up to 2 layers, DPR 1.5, half particles
- low: 1 layer, DPR 1, quarter particles, low-power mode
- calm: 1 layer, DPR 1.5, no particles for reduced motion

The controller applies this policy when building presets and populating `context.shared`.

Animation code should:

- respect `context.shared.reducedMotion`
- avoid expensive effects when `context.shared.lowPower` is true
- scale counts by `context.shared.particleScale`
- avoid allocating large arrays or object batches inside `draw`
- reuse buffers where possible
- keep canvas work proportional to `this.cssWidth`, `this.cssHeight`, and the active DPR

## Registries and Presets

There are two related systems:

- `registry/index.ts` stores individual animation entries.
- `scenePresets.ts` stores composed presets made from one or more registered animation IDs.

Individual registry entries are registered in `registry/seed.ts`:

```ts
registry.register({
  id: 'speaker',
  label: 'Speaker Pulse',
  factory: speakerFactory,
  visualType: 'canvas',
  mood: 'calm',
  role: 'subject',
  weight: 3,
})
```

Preset definitions are also registered in `registry/seed.ts`:

```ts
registerPreset({
  id: 'signalOrganism',
  label: 'Signal Organism',
  category: 'production',
  weight: 3,
  reducedMotionPreset: 'quietPulse',
  layers: [
    {
      animationId: 'signalOrganismScene',
      role: 'subject',
      options: {
        opacity: 0.98,
        zIndex: 101,
        blendMode: 'normal',
        intensity: 1,
        sensitivity: 1,
      },
    },
  ],
})
```

Preset categories are:

- `production`: default curated theatre scenes
- `lab`: experimental scenes surfaced in development
- `dev`: reserved for development-only utilities

In development, theatre prefers `lab` presets. In production, it prefers `production` presets. If a selected preset has `reducedMotionPreset`, reduced-motion users receive that safer preset instead.

## Current Registered Animations

Current animation entries in `registry/seed.ts`:

| ID | Label | Mood | Role |
| --- | --- | --- | --- |
| `speaker` | Speaker Pulse | `calm` | `subject` |
| `spinAmp` | Spin Amp | `calm` | `foreground` |
| `bioMachine` | Bio Machine | `dynamic` | `subject` |
| `weatherSpeaker` | Weather Speaker | `dynamic` | `background` |
| `monsterWave` | Monster Wave | `chaos` | `foreground` |
| `stopMotionFlowerStorm` | Stop-Motion Flower Storm | `dynamic` | `subject` |
| `cuteMonstro` | Cute Monstro | `dynamic` | `subject` |
| `signalOrganismScene` | Signal Organism | `dynamic` | `subject` |

Current presets:

| ID | Label | Category | Layers |
| --- | --- | --- | --- |
| `quietPulse` | Quiet Pulse | `production` | `speaker` |
| `signalOrganism` | Signal Organism | `production` | `signalOrganismScene` |
| `geometryTunnel` | Geometry Tunnel | `production` | `spinAmp`, `bioMachine`, `monsterWave` |
| `stormFlower` | Storm Flower | `lab` | `stopMotionFlowerStorm` |
| `monsterWaveStack` | Cute Monstro | `production` | `cuteMonstro` |

## Building a New Animation

1. Create `apps/web/src/theatre/animations/myScene.ts`.
2. Extend `CanvasAnimation` unless the scene truly needs another renderer.
3. Read features through `context.shared.features` or `this.readBands(context)`.
4. Read triggers through `context.shared.getTriggers(...)`.
5. Use `context.shared.time` for deterministic frame timing.
6. Scale particles, shake, and dense detail with `reducedMotion`, `lowPower`, and `particleScale`.
7. Export a factory function returning `IAnimation`.
8. Add a `registry.register(...)` entry in `registry/seed.ts`.
9. Add or update a `registerPreset(...)` entry so the scene is reachable.
10. Provide a `reducedMotionPreset` for any vivid, chaotic, or multi-layer preset.

Good scene options to support:

- `opacity`
- `zIndex`
- `blendMode`
- `intensity`
- `sensitivity`
- `preset` for trigger vocabulary
- scene-specific color or motion controls when useful

## Scene Design Guidance

Prefer scenes that evolve as systems rather than static loops. Strong theatre visuals often move through phases:

- seed or entry: an element appears and starts occupying space
- buildup: energy accumulates, fills, grows, or distorts the world
- reaction: overflow, crack, bloom, spark, collapse, or restructure
- aftermath: the scene settles into a new readable state

Use audio bands semantically:

- bass can add weight, pressure, volume, and large motion
- mids can bend forms, open paths, rotate mechanisms, and change structure
- highs can create brittle details, flicker, sparks, rain, cuts, and surface texture
- chaos/flux can trigger state changes or sudden visual reconfiguration

The goal is not simply to make things pulse. The best scenes feel like living systems responding to music.

## Stop-Motion and Scripted Stories

Stop-motion scenes use a discrete, tactile visual grammar: held poses, stepped values, pose swaps, persistent debris, and clear state changes.

The script DSL lives in `stopMotionScript.ts`. Scripts live in `apps/web/src/theatre/scripts/`.

Script shape:

```ts
const script: Script = {
  id: 'flowerStorm_v1',
  poseHoldMs: 220,
  stemHoldMs: 180,
  states: [
    { id: 'bud', poses: [{}, {}], durationMs: 2800, next: 'blooming' },
    { id: 'blooming', poses: [{}, {}, {}, {}], durationMs: 5200, next: 'fullBloom' },
    {
      id: 'fullBloom',
      poses: [{}, {}, {}, {}, {}, {}],
      durationMs: 6000,
      next: ({ triggers }) => (triggers.chaosHit ? 'stormStrain' : 'fullBloom'),
    },
  ],
}
```

`ScriptRunner` API:

- `new ScriptRunner(script)` creates a runner.
- `runner.update(now, features, triggers, reducedMotion)` advances the story.
- `runner.restart(now?)` restarts from the first state.
- `runner.setOverrides({ poseHoldMs, stemHoldMs })` overrides timing.
- `runner.onStateChange(cb)` subscribes to state transitions.
- `runner.getState()` returns the last output.

`RunnerOutput` contains:

- `state`
- `stateIndex`
- `poseIndex`
- `stemIndex`
- `stateElapsed`
- `progress`
- `noiseSeed`

Use `onStateChange(...)` for distinct events, such as shockwaves or scene resets, and use `update(...)` output for pose selection and continuous drawing.

## Debugging

Useful checks:

- Confirm `init(container, context)` appends the expected element.
- Confirm `start()` sets the scene running.
- Confirm `renderFrame(context)` is being called for `CanvasAnimation` subclasses.
- Confirm `stop()` cancels any self-owned loops.
- Confirm `destroy()` removes canvas elements and event listeners.
- Log `context.shared.features`, `context.shared.time`, and `context.shared.getTriggers(...)` when a scene feels inert.
- Test with no analyser available; scenes should still show fallback motion.
- Test with reduced motion enabled.
- Test low-power behavior by temporarily forcing a stricter policy.
- Use `?theatreDev=1` for the theatre dev panel when working locally.

## Common Pitfalls

- Do not create a new audio analyser per animation.
- Do not run a private RAF loop from a `CanvasAnimation` after external driving is enabled.
- Do not assume `context.shared.features` is always present.
- Do not hard-code viewport size; use canvas-local dimensions.
- Do not allocate large arrays or many objects every frame.
- Do not make every trigger spawn particles; visual noise hides the scene concept.
- Do not add a scene only to the animation registry and forget to add it to a preset.
- Do not ship a high-motion preset without a reduced-motion path.

## Future Extension Points

The current contracts can support:

- artwork-aware scenes using `context.artworkUrl`
- image, video, UI, and hybrid layers
- timed preset transitions
- admin-controlled preset locks
- shared listening overlays
- richer script DSLs for story-driven scenes
- WebGL or Three.js layers that still implement `IAnimation`

For any future renderer, keep `IAnimation` and `AnimationContext` as the orchestration boundary.

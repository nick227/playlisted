# Theatre Animations Inventory

Last updated from `apps/web/src/theatre` (registry seed + animation modules).

For architecture and how to add scenes, see [theatre-animations.md](./theatre-animations.md).

---

## Summary

| Count | Item |
|------:|------|
| 6 | Registered canvas animations (`registry/seed.ts`) |
| 1 | Emergency fallback (not registered; used by `AnimationBridge`) |
| 6 | Scene presets that stack animations (`registry/seed.ts`) |
| 1 | Stop-motion script (`scripts/stopMotionFlowerStorm.script.ts`) |

All registered animations extend `CanvasAnimation`, use `MicroEffects` where noted, and read `context.shared.features` with analyser fallback via `getAudioBands`.

---

## Registered animations

| ID | Label | File | Mood | Role | Weight | Effects |
|----|-------|------|------|------|-------:|---------|
| `speaker` | Speaker Pulse | `animations/speaker.ts` | calm | subject | 3 | yes |
| `spinAmp` | Spin Amp | `animations/spinAmp.ts` | calm | foreground | 2 | yes |
| `bioMachine` | Bio Machine | `animations/bioMachine.ts` | dynamic | subject | 1 | yes |
| `weatherSpeaker` | Weather Speaker | `animations/weatherSpeaker.ts` | dynamic | background | 2 | yes |
| `monsterWave` | Monster Wave | `animations/monsterWave.ts` | chaos | foreground | 1 | yes |
| `stopMotionFlowerStorm` | Stop-Motion Flower Storm | `animations/stopMotionFlowerStorm.ts` | dynamic | subject | 2 | yes |

**Selection helpers** (`registry/index.ts`): `pickRandom(mood?)`, `pickStack(count, preferMood?, roles?)` — weighted by `weight`, filtered by `mood` and `role`.

**Common options** (passed per layer in presets): `opacity`, `zIndex`, `blendMode`, `intensity`, `sensitivity`, `preset` (trigger preset name).

---

## Animation details

### `speaker` — Speaker Pulse

- **Visual:** Dark fill (`#06060a`), central radial glow that scales with bass/envelope, orbiting particles on a ring.
- **Audio:** Bass drives pulse radius (up to ~3.8×); mids/highs tint warmth and particle size; stepped sine hold for subtle pulse wobble (`frameHold` / `stepped`).
- **Triggers:** `chaosHit` + high energy → shockwave; `highsHit` → particle burst; `beat` → screen punch; shake from effects.
- **Defaults:** opacity 0.97, z-index 101, blend `normal`.
- **Best role:** Central “subject” layer; pairs with weather or bio backgrounds.

### `spinAmp` — Spin Amp

- **Visual:** Six concentric rotating elliptical rings (screen blend), no background fill — transparent stack layer.
- **Audio:** Ring radius and stroke width from bass/mids/highs; rotation speed tied to elapsed time.
- **Triggers:** `chaosHit` → shockwave; `midsHit` / `beat` → particle bursts at center.
- **Defaults:** blend `screen`, z-index 102.
- **Best role:** Foreground accent over speaker or bio scenes.

### `bioMachine` — Bio Machine

- **Visual:** Dark teal field; 12 radial “cells” on a 4×3 grid; rotating gear rings top-right.
- **Audio:** Cell size and color saturation from bass/mids; gear rotation from mids + stepped phase.
- **Triggers:** `midsHit` / `beat` → green-tinted bursts; `chaosHit` → shockwave upper-right.
- **Defaults:** z-index 100 (often background in presets).
- **Best role:** Organic background or mid-layer in `geometryTunnel`.

### `weatherSpeaker` — Weather Speaker

- **Visual:** Bass-tinted sky gradient, silhouette tower, procedural rain streaks (count scales with strength, `particleScale`, `lowPower`).
- **Audio:** Combined band strength drives rain density; sky color shifts with bass.
- **Triggers:** `highsHit` → bursts; `chaosHit` → `triggerRainSurge`; `beat` → bursts at tower base.
- **Defaults:** z-index 100, background role in `safeArtwork`.
- **Best role:** Atmospheric background behind a brighter subject.

### `monsterWave` — Monster Wave

- **Visual:** Five stacked filled wave polygons (stepped sine coastline), purple/violet fills, dark base `#030508`.
- **Audio:** `quantize` + `stepped` wave height from bass/mids; layer offset and alpha from energy.
- **Triggers:** `chaosHit` / `beat` → purple particle bursts along wave front.
- **Defaults:** z-index 102, chaos mood.
- **Best role:** Foreground or background wave stack (`geometryTunnel`, `monsterWaveStack`).

### `stopMotionFlowerStorm` — Stop-Motion Flower Storm

- **Visual:** Sky gradient, drifting clouds, curved stem + leaves, 8-petal flower with pose table, falling debris, rain, optional lightning in storm/collapse.
- **Story engine:** `ScriptRunner` + `scripts/stopMotionFlowerStorm.script.ts` (`flowerStorm_v1`).
- **Script states:** `bud` → `blooming` → `fullBloom` → (`chaosHit` → `stormStrain`) → `collapse` → `aftermath` → `fullBloom`.
- **Audio:** Bands and `getTriggers('chaos')` feed runner transitions and accents; `chaosHit` drives storm branch and rain/shockwave/punch.
- **Dev API:** `restartStory()`, `setScriptOverrides({ poseHoldMs, stemHoldMs })`, `getDebugState()`.
- **Reduced motion:** Fewer leaves/debris/rain; softer sky lerp; less jitter.
- **Defaults:** opacity 0.98, single-layer preset `stormFlower`.

---

## Non-registry fallback

### `staticFallback` — Static Fallback

| | |
|--|--|
| **File** | `animations/staticFallback.ts` |
| **Registered** | No |
| **Used when** | All layers fail `init` in `AnimationBridge.enter` |
| **Visual** | Dark fill + slow breathing central glow; no audio, no `MicroEffects` |

---

## Scene presets (composed stacks)

Presets are defined in `registry/seed.ts` via `registerPreset`. `pickPreset()` in `scenePresets.ts` chooses by category/weight; reduced motion swaps to `reducedMotionPreset` when set.

### Production

| Preset ID | Label | Weight | Layers (back → front) | Reduced motion |
|-----------|-------|-------:|------------------------|----------------|
| `quietPulse` | Quiet Pulse | 1 | `speaker` (subject, low intensity) | — (base RM preset) |
| `safeArtwork` | Safe Artwork | 3 | `weatherSpeaker` → `speaker` → `spinAmp` | `quietPulse` |
| `signalOrganism` | Signal Organism | 3 | `signalOrganismScene` (unified) | `quietPulse` |
| `geometryTunnel` | Geometry Tunnel | 2 | `spinAmp` → `bioMachine` → `monsterWave` | `quietPulse` |

### Lab

| Preset ID | Label | Weight | Layers | Reduced motion |
|-----------|-------|-------:|--------|----------------|
| `stormFlower` | Storm Flower | 2 | `stopMotionFlowerStorm` only | `quietPulse` |
| `monsterWaveStack` | Monster Wave Stack | 1 | `monsterWave` → `speaker` → `spinAmp` | `quietPulse` |

---

## Stop-motion script inventory

| Script ID | File | Driven animation | States |
|-----------|------|------------------|--------|
| `flowerStorm_v1` | `scripts/stopMotionFlowerStorm.script.ts` | `stopMotionFlowerStorm` | 6 (see above) |

Timing defaults: `poseHoldMs` 220, `stemHoldMs` 180. State durations range 1.8s–6s.

---

## Shared infrastructure (reference)

| Module | Role |
|--------|------|
| `IAnimation.ts` | Lifecycle contract, `AnimationContext`, registry types |
| `CanvasAnimation.ts` | Canvas boilerplate, DPR, resize, optional `MicroEffects` |
| `AudioFeatureExtractor.ts` | RMS, envelope, bands, flux, centroid |
| `VisualTriggers.ts` | Per-frame `beat`, `bassHit`, `midsHit`, `highsHit`, `chaosHit` |
| `MicroEffects.ts` | Shockwave, particles, screen punch, rain surge, shake |
| `stopMotion.ts` | `frameHold`, `stepped`, `quantize` |
| `stopMotionScript.ts` | `ScriptRunner` DSL |
| `TheatreController.ts` | Loads seed, resolves presets, RAF + feature pipeline |
| `AnimationBridge.ts` | Multi-layer init, external driving, fallback |

---

## File map

```
apps/web/src/theatre/
├── animations/
│   ├── speaker.ts
│   ├── spinAmp.ts
│   ├── bioMachine.ts
│   ├── weatherSpeaker.ts
│   ├── monsterWave.ts
│   ├── stopMotionFlowerStorm.ts
│   └── staticFallback.ts          # bridge fallback only
├── scripts/
│   └── stopMotionFlowerStorm.script.ts
└── registry/
    ├── index.ts
    └── seed.ts                    # register() + registerPreset()
```

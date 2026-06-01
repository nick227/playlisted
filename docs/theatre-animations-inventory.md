# Theatre Animations Inventory

Last updated from the current `apps/web/src/theatre` worktree on 2026-06-01.

For architecture, contracts, and guidance for building new scenes, see [theatre-animations.md](./theatre-animations.md).

## Summary

| Count | Item |
| ----: | ---- |
| 14 | Registered animation entries in `registry/seed.ts` |
| 11 | Scene presets in `registry/seed.ts` |
| 1 | Emergency fallback, not registered, used by `AnimationBridge` |
| 1 | Stop-motion script in `scripts/` |

All current registered animations are canvas-based. Most extend `CanvasAnimation`, read shared audio features from `AnimationContext`, and can use analyser fallback through `getAudioBands`.

## Registered Animations

| ID | Label | File | Visual Type | Mood | Role | Weight |
| --- | --- | --- | --- | --- | --- | ---: |
| `speaker` | Speaker Pulse | `animations/speaker.ts` | `canvas` | `calm` | `subject` | 3 |
| `spinAmp` | Spin Amp | `animations/spinAmp.ts` | `canvas` | `calm` | `foreground` | 2 |
| `bioMachine` | Bio Machine | `animations/bioMachine.ts` | `canvas` | `dynamic` | `subject` | 1 |
| `weatherSpeaker` | Weather Speaker | `animations/weatherSpeaker.ts` | `canvas` | `dynamic` | `background` | 2 |
| `monsterWave` | Monster Wave | `animations/monsterWave.ts` | `canvas` | `chaos` | `foreground` | 1 |
| `stopMotionFlowerStorm` | Stop-Motion Flower Storm | `animations/stopMotionFlowerStorm.ts` | `canvas` | `dynamic` | `subject` | 2 |
| `cuteMonstro` | Cute Monstro | `animations/cuteMonstro.ts` | `canvas` | `dynamic` | `subject` | 2 |
| `signalOrganismScene` | Signal Organism | `animations/signalOrganism.ts` | `canvas` | `dynamic` | `subject` | 2 |
| `goopy` | Goopy | `animations/goopy.ts` | `canvas` | `dynamic` | `subject` | 2 |
| `circuitBot` | Circuit Bot | `animations/circuitBot.ts` | `canvas` | `dynamic` | `subject` | 2 |
| `eyeCloud` | Eye Cloud | `animations/eyeCloud.ts` | `canvas` | `chaos` | `subject` | 2 |
| `jellyBell` | Jelly Bell | `animations/jellyBell.ts` | `canvas` | `calm` | `subject` | 2 |
| `monsterCrew` | Monster Crew | `animations/monsterCrew.ts` | `canvas` | `dynamic` | `subject` | 2 |
| `liminalDoom` | Liminal Doom | `animations/liminalDoom/LiminalDoomScene.ts` | `canvas` | `dynamic` | `subject` | 1 |

Registry helpers in `registry/index.ts`:

- `register(entry)`
- `get(id)`
- `list()`
- `pickRandom(mood?)`
- `pickStack(count, preferMood?, roles?)`

Common layer options:

- `opacity`
- `zIndex`
- `blendMode`
- `intensity`
- `sensitivity`
- `preset`

## Scene Presets

Presets are registered with `registerPreset(...)` in `registry/seed.ts` and stored by `scenePresets.ts`.

| Preset ID | Label | Category | Weight | Layers | Reduced Motion |
| --- | --- | --- | ---: | --- | --- |
| `quietPulse` | Quiet Pulse | `production` | 1 | `speaker` | none |
| `signalOrganism` | Signal Organism | `production` | 3 | `signalOrganismScene` | `quietPulse` |
| `geometryTunnel` | Geometry Tunnel | `production` | 2 | `spinAmp`, `bioMachine`, `monsterWave` | `quietPulse` |
| `stormFlower` | Storm Flower | `lab` | 2 | `stopMotionFlowerStorm` | `quietPulse` |
| `monsterWaveStack` | Cute Monstro | `production` | 2 | `cuteMonstro` | `quietPulse` |
| `monsterCrewScene` | Monster Crew | `production` | 2 | `monsterCrew` | `quietPulse` |
| `goopySlime` | Goopy | `production` | 2 | `goopy` | `quietPulse` |
| `circuitBotScene` | Circuit Bot | `production` | 2 | `circuitBot` | `quietPulse` |
| `eyeCloudScene` | Eye Cloud | `production` | 2 | `eyeCloud` | `quietPulse` |
| `jellyBellScene` | Jelly Bell | `production` | 2 | `jellyBell` | `quietPulse` |
| `liminal-doom-demo` | Liminal Doom | `lab` | 1 | `liminalDoom` | `quietPulse` |

`TheatreController` prefers `lab` presets in development and `production` presets in production. `detectPolicy(...)` caps how many preset layers are instantiated.

## Fallback

| Item | Value |
| --- | --- |
| File | `animations/staticFallback.ts` |
| Registered | No |
| Used When | Every requested preset layer fails during `AnimationBridge.enter(...)` |
| Visual | Dark static canvas with gentle fallback motion |

## Stop-Motion Scripts

| Script ID | File | Driven Animation | States |
| --- | --- | --- | --- |
| `flowerStorm_v1` | `scripts/stopMotionFlowerStorm.script.ts` | `stopMotionFlowerStorm` | `bud`, `blooming`, `fullBloom`, `stormStrain`, `collapse`, `aftermath` |

Timing defaults:

- `poseHoldMs`: 220
- `stemHoldMs`: 180

## Shared Infrastructure

| Module | Role |
| --- | --- |
| `IAnimation.ts` | Lifecycle contract, `AnimationContext`, registry types |
| `TheatreController.ts` | Overlay creation, audio binding, preset selection, shared RAF loop |
| `AnimationBridge.ts` | Layer instantiation, external driving, fallback handling |
| `CanvasAnimation.ts` | Canvas setup, resize/DPR, optional effects, frame rendering |
| `AudioFeatureExtractor.ts` | RMS, envelope, bands, flux, centroid |
| `VisualTriggers.ts` | Per-frame trigger vocabulary |
| `getAudioBands.ts` | Shared band fallback helper |
| `MicroEffects.ts` | Shockwave, particles, rain surge, punch, shake |
| `PerformancePolicy.ts` | Layer, DPR, particle, and low-power policy |
| `scenePresets.ts` | Preset registration, listing, weighted selection, reduced-motion resolution |
| `stopMotion.ts` | Stepped timing helpers |
| `stopMotionScript.ts` | Script DSL and `ScriptRunner` |
| `TheatreDevPanel.ts` | Optional local dev panel via `?theatreDev=1` |

## File Map

```text
apps/web/src/theatre/
+-- animations/
|   +-- bioMachine.ts
|   +-- circuitBot.ts
|   +-- cuteMonstro.ts
|   +-- eyeCloud.ts
|   +-- goopy.ts
|   +-- jellyBell.ts
|   +-- liminalDoom/
|   +-- monsterCrew.ts
|   +-- monsterWave.ts
|   +-- signalOrganism.ts
|   +-- signalOrganism/
|   +-- speaker.ts
|   +-- spinAmp.ts
|   +-- staticFallback.ts
|   +-- stopMotionFlowerStorm.ts
|   +-- weatherSpeaker.ts
+-- registry/
|   +-- index.ts
|   +-- seed.ts
+-- scripts/
|   +-- stopMotionFlowerStorm.script.ts
+-- AnimationBridge.ts
+-- AudioFeatureExtractor.ts
+-- CanvasAnimation.ts
+-- IAnimation.ts
+-- MicroEffects.ts
+-- PerformancePolicy.ts
+-- TheatreController.ts
+-- TheatreDevPanel.ts
+-- VisualTriggers.ts
+-- getAudioBands.ts
+-- resolveDpr.ts
+-- scenePresets.ts
+-- shapeGenerator.ts
+-- stopMotion.ts
+-- stopMotionScript.ts
```

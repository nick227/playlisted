You are working in the Playlisted theatre animation system under `apps/web/src/theatre`.

Goal:
Formalize theatre animations into a first-class Animation Package System without breaking existing animations or refactoring `TheatreController` unless absolutely necessary.

Current architecture constraints:

* `TheatreController` owns playback binding, overlay setup, analyser reuse, feature extraction, performance policy, preset selection, and the single RAF loop.
* `AnimationBridge` creates animations, initializes them, enables external driving where supported, starts them, and forwards `renderFrame(context)`.
* Existing animations implement `IAnimation`; most canvas scenes extend `CanvasAnimation`.
* Existing scene behavior must continue working.
* Do not create duplicate analysers.
* Do not add private RAF loops to externally driven canvas animations.
* Preserve reduced-motion and low-power behavior.
* Use `AnimationContext.shared.features`, `context.shared.getTriggers(...)`, and `context.shared.time` when possible.

Implementation order:

1. Qualify and formalize the registry layer.

Create package-oriented types near the theatre registry, for example:

* `AnimationPackage`
* `AnimationPackageManifest`
* `AnimationPackageKind`
* `AnimationPackageCapability`
* `PackageAnimationEntry`
* `PackagePresetEntry`

Suggested package kinds:

* `visual-scene`
* `character-scene`
* `character-rig`
* `effect-system`
* `stop-motion-story`
* `audio-reactive-background`
* `interactive-overlay`

Suggested package shape:

```ts
export type AnimationPackageKind =
  | 'visual-scene'
  | 'character-scene'
  | 'character-rig'
  | 'effect-system'
  | 'stop-motion-story'
  | 'audio-reactive-background'
  | 'interactive-overlay'

export type AnimationPackageManifest = {
  id: string
  label: string
  version: string
  kind: AnimationPackageKind
  category: 'production' | 'lab' | 'dev'
  description?: string
  capabilities?: string[]
  reducedMotionSafe?: boolean
}

export type AnimationPackage = {
  manifest: AnimationPackageManifest
  animations: AnimationRegistryEntry[]
  presets: ScenePresetDefinition[]
}
```

Adjust names to match the actual existing registry and preset types.

2. Add package registration.

Create a `registerAnimationPackage(pkg)` helper that expands packages into the existing registry and preset systems.

Important:

* Do not change how `TheatreController` consumes presets.
* Do not change how `AnimationBridge` creates animations.
* The package layer should be an onboarding abstraction above the existing runtime registry.

Expected shape:

```ts
export function registerAnimationPackage(pkg: AnimationPackage) {
  for (const animation of pkg.animations) {
    registry.register(animation)
  }

  for (const preset of pkg.presets) {
    registerPreset(preset)
  }
}
```

Add validation/guardrails where useful:

* duplicate package IDs
* duplicate animation IDs
* duplicate preset IDs
* missing reduced-motion preset for vivid/chaotic/high-motion presets
* missing factory
* invalid category
* empty animations/presets

3. Create package folder convention.

Add:

```txt
apps/web/src/theatre/packages/
```

New packages should follow:

```txt
packages/<package-id>/
  index.ts
  manifest.ts
  presets.ts
  README.md
  scene.ts
```

More complex packages may include:

```txt
rig/
skins/
poses/
sequences/
```

Do not require every package to have all folders. Keep the convention flexible but consistent.

4. Add the first new package: puppet dancer.

Create:

```txt
apps/web/src/theatre/packages/puppet-dancer/
  index.ts
  manifest.ts
  presets.ts
  PuppetDancerScene.ts
  rig/
    humanRig.ts
    rigTypes.ts
  skins/
    defaultHumanSkin.ts
    skinTypes.ts
  poses/
    basicPoses.ts
    poseTypes.ts
  sequences/
    twoStep.sequence.ts
    bounce.sequence.ts
    robot.sequence.ts
    sequenceTypes.ts
  README.md
```

Build a minimal but real first version.

The puppet system should separate:

* `Rig`: joint hierarchy, pivots, limb lengths, constraints
* `Skin`: body part drawing styles attached to joints
* `Pose`: joint angles, offsets, scale, face state
* `DanceSequence`: timed pose chain with easing and optional trigger behavior
* `DancePlayer`: sequence playback, interpolation, beat sync
* `PuppetDancerScene`: theatre integration and canvas rendering

Required joints:

* root/hips
* spine/chest
* neck/head
* left/right shoulder
* left/right elbow
* left/right wrist
* left/right hip
* left/right knee
* left/right ankle
* face controls: eyes, mouth, brows

The first implementation can be stylized/simple. It does not need full inverse kinematics. Use pose-driven forward kinematics.

Audio mapping:

* `beat` advances or accents the current dance step
* `bassHit` adds hip/knee bounce and screen weight
* `midsHit` accents torso/shoulders
* `highsHit` accents hands/head/face
* `chaosHit` briefly exaggerates motion or switches variation

Respect:

* `context.shared.reducedMotion`
* `context.shared.lowPower`
* `context.shared.particleScale`
* `context.shared.time`
* `context.shared.features`
* `context.shared.getTriggers(...)`

Register at least one production-safe preset and one lab preset:

* `puppetDancerBasic`
* `puppetDancerLab`

Provide a reduced-motion path, likely a slower sway/idle preset.

5. Convert existing animations into first-party packages.

Safely retrofit existing animations into package folders while preserving compatibility.

Current animations should become packages such as:

```txt
packages/speaker/
packages/spin-amp/
packages/bio-machine/
packages/weather-speaker/
packages/monster-wave/
packages/stop-motion-flower-storm/
packages/cute-monstro/
packages/signal-organism/
packages/goopy/
packages/circuit-bot/
packages/eye-cloud/
packages/jelly-bell/
packages/monster-crew/
packages/liminal-doom/
```

Each package should include:

```txt
index.ts
manifest.ts
presets.ts
README.md
<SceneFile>.ts
```

If the original animation file is already clean, move it into the package and re-export it from the old location temporarily.

Compatibility rule:
Existing imports from `apps/web/src/theatre/animations/*` must not break during the migration.

Example:

```ts
// apps/web/src/theatre/animations/goopy.ts
export { GoopyScene as default } from '../packages/goopy/GoopyScene'
export { goopyFactory } from '../packages/goopy'
```

6. Simplify `registry/seed.ts`.

After packages exist, `registry/seed.ts` should mainly import and register packages:

```ts
import { registerAnimationPackage } from './registerAnimationPackage'
import { goopyPackage } from '../packages/goopy'
import { circuitBotPackage } from '../packages/circuit-bot'
import { puppetDancerPackage } from '../packages/puppet-dancer'

registerAnimationPackage(goopyPackage)
registerAnimationPackage(circuitBotPackage)
registerAnimationPackage(puppetDancerPackage)
```

Avoid adding new loose `registry.register(...)` or `registerPreset(...)` calls directly in `seed.ts` except for temporary migration scaffolding.

7. Add package docs.

Create a short package onboarding doc:

```txt
apps/web/src/theatre/packages/README.md
```

Document:

* required files
* package manifest
* how to register animations
* how to register presets
* how to provide reduced-motion behavior
* how to use shared audio features
* how to use triggers
* how to respect performance policy
* how to test with `?theatreDev=1`

Also add package-level `README.md` files for migrated first-party packages.

8. Add tests or safety checks.

Add lightweight tests where the project already has test patterns.

At minimum verify:

* package registration expands animations into the registry
* package registration expands presets into preset lookup
* duplicate IDs are rejected or warned
* puppet dancer package registers successfully
* existing known presets still exist after migration
* reduced-motion preset substitution still works
* no controller changes were required

9. Do not over-refactor.

Avoid:

* rewriting `TheatreController`
* rewriting `AnimationBridge`
* changing `IAnimation`
* changing `AnimationContext`
* changing existing scene draw logic unless required by the move
* changing current preset selection semantics
* adding asset pipelines prematurely
* adding WebGL/Three.js abstractions in this pass

10. Acceptance criteria.

The work is complete when:

* `AnimationPackage` types exist.
* `registerAnimationPackage()` exists.
* `packages/puppet-dancer` exists and registers a working puppet dancer scene.
* Existing animations are represented as first-party packages or have a clear staged compatibility wrapper.
* `registry/seed.ts` is package-oriented.
* Existing theatre presets still work.
* Existing animation imports do not break.
* Reduced-motion behavior remains intact.
* The controller still owns the single RAF loop.
* No animation creates its own analyser.
* Package onboarding documentation exists.
* Build/tests pass.

Preferred outcome:
The theatre system should now feel like a real extension platform where developers add complete animation packages, not random animation files.

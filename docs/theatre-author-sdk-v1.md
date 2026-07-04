# Playlisted Theatre Author SDK — Specification v1

**Status:** Current  
**Public import path:** `@/theatre/author` — the **only** import path for scene authors  
**Package location:** `apps/web/src/theatre/packages/<name>/` (repo path, not an import)  
**Runtime:** Unchanged — this spec defines the author-facing contract only.

---

## 1. Purpose

The Theatre Author SDK lets contributors build **audio-reactive canvas animations** that run in Playlisted’s fullscreen theatre overlay during playback.

**The SDK is for scene authors, not engine authors.** It exposes a stable per-frame drawing API. Internal platform engines (object-spinner, eqBars FFT, composite orchestrators) may use lower-level runtime APIs; public authors must not.

v1 is intentionally narrow: one canvas layer, one preset, curated registration. The runtime (controller, audio extraction, performance policy, preset rotation) is platform-owned. Authors implement visual behavior only.

### Public imports

Scene authors import **only** from `@/theatre/author`. Do not import from `@/theatre/core`, `@/theatre/registry`, or other runtime modules in author package code. Maintainer registration in `registry/seed.ts` uses internal paths; that is platform wiring, not the author API.

---

## 2. Scope

### In scope (v1)

| Item | Description |
|------|-------------|
| Canvas scenes | Extend `CanvasAnimation`, implement `draw()` |
| Single layer | One animation + one scene preset per package |
| Audio reactivity | Bands, triggers, elapsed time via `PublicAnimationContext` |
| Optional micro-effects | Screen punch, particles, shockwaves via `useEffects: true` |
| Curated registration | Package merged via PR into `registry/seed.ts` |

### Out of scope (v1)

Do not submit these as public author packages until a future SDK version explicitly supports them:

- **Composite orchestrators** — e.g. cycling multiple child animations in one layer
- **Video / image layers** — `VideoAnimation`, `ImageAnimation`, user-media attachments
- **Data-driven engines** — object-spinner-mover and similar config-driven systems
- **Stop-motion story DSL** — scripted state machines with pose holds
- **Runtime plugins** — dynamic import, user-uploaded code, sandboxed third-party bundles
- **Raw audio access** — `AnalyserNode`, `getByteFrequencyData`, private analysers

---

## 3. Registration model

**Curated packages only.**

1. Author implements a package using `defineAnimationPackage()`.
2. Author opens a PR adding the package under `apps/web/src/theatre/packages/<name>/`.
3. Maintainer registers the package in `apps/web/src/theatre/registry/seed.ts`:

```ts
import { myPackage } from '../packages/my-scene'
// inside the registerAnimationPackage([...]) list:
myPackage,
```

4. Registration runs at **build time**. There is no runtime plugin loader in v1.

### Categories

| Category | Use |
|----------|-----|
| `lab` | Experimental / in-review animations (default for new packages) |
| `production` | Shipped to all users in preset rotation |
| `dev` | Internal tooling only |

New public submissions should start as `lab`. Promotion to `production` is a maintainer decision.

---

## 4. Author deliverables

A valid v1 submission consists of:

```
apps/web/src/theatre/packages/my-scene/
  MyScene.ts          # CanvasAnimation subclass + factory export
  index.ts            # defineAnimationPackage(...) export
```

Optional (recommended for non-trivial scenes):

```
  manifest.ts         # Override manifest metadata
  presets.ts          # Override preset tuning (rotation, tags, audioSensitivity)
  README.md           # Scene-specific notes
```

Minimum `index.ts`:

```ts
import { defineAnimationPackage } from '@/theatre/author'
import { mySceneFactory } from './MyScene'

export const myScenePackage = defineAnimationPackage({
  id: 'my-scene',
  label: 'My Scene',
  animationId: 'myScene',
  factory: mySceneFactory,
  presetId: 'myScenePreset',
  reducedMotionPreset: 'quietPulse',
  category: 'lab',
})
```

---

## 5. Lifecycle contract

Authors implement visual behavior through `CanvasAnimation`. The platform owns timing and audio.

```
init(container, context)   → platform-managed setup (canvas, resize)
start()                    → mark running (no private RAF loop)
renderFrame(context)       → platform calls each frame; invokes draw(publicContext)
pause() / resume()         → playback sync
stop() / destroy()         → cleanup
```

### Rules

1. **Do not start a private `requestAnimationFrame` loop.** After `enableExternalDriving()` (called by the platform), the controller drives all frames.
2. **Do not query page layout** inside `draw()`. Use `this.cssWidth`, `this.cssHeight`, and `this.ctx` only.
3. **Keep state on the class instance.** Do not store mutable data on the context object.
4. **`draw(PublicAnimationContext)` is the stable author API.** Lifecycle methods (`init`, `start`, etc.) are managed by the platform. Public authors should not depend on runtime-only context fields — implement all per-frame logic in `draw()`.

---

## 6. Input contract — `PublicAnimationContext`

Each frame, `draw(context)` receives a **frozen, author-safe snapshot**:

```ts
type PublicAnimationContext = Readonly<{
  artworkUrl?: string
  metadata?: Readonly<{ title?: string; artist?: string }>
  options: TheatreLayerOptions
  shared: PublicSharedContext
}>
```

### Deliberately excluded

These exist at runtime but are **not** passed to `draw()`:

| Field | Reason |
|-------|--------|
| `analyser` | Platform extracts features centrally |
| `audioElement` | Authors react to features, not DOM media |
| `mediaSrc` | Internal playback wiring |
| Internal option keys | See §7 |

Attempting to rely on excluded fields will not work in author code and may break in future versions.

---

## 7. Layer options — `TheatreLayerOptions`

Authors may **read** these in `draw()` and **set** them via `layerOptions` in `defineAnimationPackage()`:

```ts
type TheatreLayerOptions = {
  role?: 'background' | 'subject' | 'foreground' | 'overlay' | 'any'
  opacity?: number          // 0–1
  zIndex?: number
  blendMode?: string        // CSS mix-blend-mode
  sensitivity?: number      // Scales audio reactivity
  intensity?: number        // Scales visual intensity
  preset?: 'tame' | 'vivid' | 'chaos' | 'nightmare'
}
```

`preset` controls trigger sensitivity (how easily `beat`, `bassHit`, etc. fire). Match visual aggression to preset choice:

| Preset | Typical use |
|--------|-------------|
| `tame` | Calm, ambient, reduced reactivity |
| `vivid` | Default balanced reactivity |
| `chaos` | Aggressive, frequent hits |
| `nightmare` | Maximum sensitivity |

Internal-only options (media URLs, timeline sync, beatFx, objectTheatre config, etc.) are platform-controlled and not visible in `PublicAnimationContext.options`.

---

## 8. Shared runtime — `PublicSharedContext`

```ts
type PublicSharedContext = Readonly<{
  features?: ReadonlyFeatures
  reducedMotion: boolean
  lowPower: boolean
  dprClamp: number
  particleScale: number   // 0 = no particles/shake budget
  time: Readonly<{ elapsed: number; delta: number; frame: number }>
  getTriggers: (preset?: string) => TriggerFrame
}>
```

### `ReadonlyFeatures`

Updated each frame by the platform. **Read-only** — do not mutate.

| Field | Range | Meaning |
|-------|-------|---------|
| `rms` | 0–1 | Raw loudness |
| `env` | 0–1 | Smoothed envelope |
| `bands.bass` | 0–1 | Low-frequency energy |
| `bands.mids` | 0–1 | Mid-frequency energy |
| `bands.highs` | 0–1 | High-frequency energy |
| `bandEnv.*` | 0–1 | Smoothed band envelopes |
| `flux.overall` | 0–1 | Spectral change (transients) |
| `flux.bass/mids/highs` | 0–1 | Per-band flux |
| `centroid` | 0–1 | Spectral brightness |

When no audio is available, `features` may be `undefined`. `readBands()` falls back to a gentle synthetic signal for dev preview.

### `TriggerFrame`

```ts
type TriggerFrame = {
  bassHit: boolean
  midsHit: boolean
  highsHit: boolean
  beat: boolean
  chaosHit: boolean
  energy: number      // 0–1
  brightness: number  // 0–1
}
```

Usage:

```ts
const triggers = context.shared.getTriggers(context.options.preset ?? 'vivid')
if (triggers.beat) { /* punctuate on beat */ }
```

Boolean triggers are **edge-style per frame** — true on the frame the onset is detected, not held across frames.

### Performance flags

| Flag | When true | Author action |
|------|-----------|-----------------|
| `reducedMotion` | User prefers reduced motion | Simplify or disable motion |
| `lowPower` | Slow network / low-end device | Reduce draw cost, skip heavy effects |
| `particleScale` | 0 | Disable particles and shake |
| `particleScale` | 0.25–0.5 | Scale particle counts down |

Use helpers on `CanvasAnimation`:

```ts
if (this.allowsShake(context)) { /* apply shake offset */ }
if (this.allowsHeavyParticles(context)) { /* spawn particles */ }
const scale = this.particleScale(context)
```

---

## 9. Canvas API — `CanvasAnimation`

### Constructor options

```ts
super({
  useEffects?: boolean       // Enable MicroEffects (default false)
  defaultOpacity?: number
  defaultBlendMode?: string
  defaultZIndex?: number
})
```

### Protected members available in `draw()`

| Member | Description |
|--------|-------------|
| `this.ctx` | `CanvasRenderingContext2D`, DPR-scaled |
| `this.cssWidth` | Layout width in CSS pixels |
| `this.cssHeight` | Layout height in CSS pixels |
| `this.pixelRatio` | Device pixel ratio applied to canvas |
| `this.effects` | `EffectsManager` when `useEffects: true` |

### Required method

```ts
protected abstract draw(context: PublicAnimationContext): void
```

### Recommended draw pattern

```ts
protected draw(context: PublicAnimationContext) {
  const w = this.cssWidth
  const h = this.cssHeight
  if (!w || !h) return

  const bands = this.readBands(context)
  const triggers = context.shared.getTriggers(context.options.preset ?? 'vivid')
  const t = context.shared.time.elapsed

  this.ctx.clearRect(0, 0, w, h)
  // ... render scene ...

  if (this.effects) {
    this.effects.update(this.ctx, t, this.pixelRatio)
  }
}
```

### MicroEffects (optional accent layer)

When `useEffects: true`:

```ts
this.effects?.triggerScreenPunch(strength)          // 0–1
this.effects?.triggerShockwave(x, y, strength)
this.effects?.triggerParticleBurst(x, y, count, strength, color)
this.effects?.triggerRainSurge(count, strength, color)
const { x, y } = this.effects?.getShake() ?? { x: 0, y: 0 }
```

MicroEffects are punctuation, not the main scene. Always call `effects.update()` at the end of `draw()` when enabled.

---

## 10. Package builder — `defineAnimationPackage()`

```ts
defineAnimationPackage({
  id: string                    // Package manifest id (kebab-case)
  label: string                 // Human label
  version?: string              // Semver, default '1.0.0'
  animationId: string           // Registry animation id (camelCase)
  factory: AnimationFactory     // () => new MyScene()
  presetId: string              // Scene preset id
  presetLabel?: string
  kind?: 'visual-scene'         // Default for canvas
  category?: 'lab' | 'production' | 'dev'
  description?: string
  weight?: number               // Rotation weight
  role?: AnimationRole          // Default 'subject'
  mood?: AnimationMood          // Default 'dynamic'
  presetCategory?: SceneCategory
  reducedMotionPreset?: string  // Required for high-motion scenes
  layerOptions?: TheatreLayerOptions
})
```

Returns an `AnimationPackage`:

```ts
{
  manifest: AnimationPackageManifest
  animations: [{ id, label, factory, visualType: 'canvas', mood, role, weight }]
  presets: [{ id, label, category, layers: [{ animationId, role, options }], reducedMotionPreset? }]
}
```

### Factory signature

Public v1 authors should use a zero-argument factory:

```ts
function mySceneFactory() {
  return new MyScene()
}
```

At the type level, factories are declared as:

```ts
type AnimationFactory = (ctx?: AnimationContext) => IAnimation
```

The platform may pass runtime context when constructing internal/engine packages. **Public v1 authors should ignore it** and return `new MyScene()`. Per-layer options are injected at `init()` by the platform — authors read them via `draw()` → `context.options`.

---

## 11. Reduced motion

If a preset uses `layerOptions.preset` of `vivid`, `chaos`, or `nightmare`, registration **requires** `reducedMotionPreset` pointing to a calmer fallback (typically `quietPulse`).

Authors must also respect `context.shared.reducedMotion` inside `draw()` — simplify motion even when the fallback preset is not active.

---

## 12. Validation

### Automated (at registration)

`registerAnimationPackage()` rejects:

- Duplicate package, animation, or preset IDs
- Presets referencing unknown animation IDs
- High-motion presets without `reducedMotionPreset`
- Empty manifest fields or invalid categories

### Author self-test checklist

- [ ] Scene renders at multiple viewport sizes (resize handled by base class)
- [ ] Scene behaves with no audio (synthetic fallback via `readBands`)
- [ ] Scene respects `reducedMotion`, `lowPower`, `particleScale === 0`
- [ ] No private RAF loop after external driving
- [ ] No `analyser` or DOM layout queries in `draw()`
- [ ] High-motion preset has `reducedMotionPreset`
- [ ] `?theatreDev=1` shows layer without console errors

### Dev tooling

Append `?theatreDev=1` to any page URL to open the theatre dev panel (layer list, live debug).

---

## 13. Submission checklist (PR)

1. Package lives under `apps/web/src/theatre/packages/<name>/`
2. Author code imports **only** from `@/theatre/author`
3. Uses `defineAnimationPackage()` from `@/theatre/author`
4. Scene extends `CanvasAnimation`, implements `draw(PublicAnimationContext)`
5. Registered in `registry/seed.ts`
6. Unique `id`, `animationId`, and `presetId` (grep existing IDs first)
7. `category: 'lab'` unless explicitly approved for production
8. `reducedMotionPreset` set when using vivid/chaos/nightmare trigger preset
9. Factory returns `new MyScene()` — does not depend on runtime context at construction
10. No access to internal runtime APIs (`analyser`, registry, context converters)

---

## 14. Versioning

| Field | Location | Policy |
|-------|----------|--------|
| SDK version | This document | `v1` — breaking author contract changes bump to v2 |
| Package version | `manifest.version` | Semver per package; authors bump on behavior changes |

The platform may evolve internal runtime without a SDK version bump as long as `PublicAnimationContext` and `defineAnimationPackage()` remain compatible.

---

## 15. Reference implementation

See `apps/web/src/theatre/author/README.md` for a minimal working example.

Existing first-party packages using the canonical shape: `goopy`, `jelly-bell`, `eye-cloud`, `circuit-bot`, `cute-monstro`, `monster-wave`.

---

## 16. SDK exports (v1)

All public symbols come from `@/theatre/author` only:

```ts
import {
  CanvasAnimation,
  defineAnimationPackage,
  bandsFromPublicContext,
  type PublicAnimationContext,
  type PublicSharedContext,
  type ReadonlyFeatures,
  type TheatreLayerOptions,
  type TriggerPreset,
  type TriggerFrame,
  type AudioBands,
  type IAnimation,
  type AnimationMood,
  type AnimationRole,
  type CanvasAnimationInitOptions,
  type DefineAnimationPackageOptions,
} from '@/theatre/author'
```

Platform-internal helpers (`toPublicAnimationContext`, runtime context types, registry APIs) are not part of the public export surface.

---

## Appendix A — Architecture (informative)

```
TheatreController
  ├─ AudioFeatureExtractor → shared.features
  ├─ PerformancePolicy     → particleScale, lowPower, dprClamp
  └─ RAF loop
       └─ AnimationBridge.renderFrame(ctx)
            └─ CanvasAnimation.renderFrame(ctx)
                 └─ draw(publicContext)  ← author code (platform converts runtime → public)
```

Authors sit at the bottom of this stack. Everything above is platform-owned.

---

## Appendix B — Future (v2 candidates)

Not committed. Listed for context only:

- Runtime plugin loading with sandbox
- Multi-layer package authoring
- Typed per-scene config schema (`AnimationConfig`)
- Video/image author layers
- Author-facing test harness / preview CLI
- Capability enforcement on manifest declarations

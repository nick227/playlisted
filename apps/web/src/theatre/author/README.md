# Theatre Animation Author SDK (v1)

Public-facing contract for canvas animations.

**Import from `@/theatre/author` only** — do not import `@/theatre/core`, `@/theatre/registry`, or other runtime modules in author package code.

**Full specification:** [docs/theatre-author-sdk-v1.md](../../../docs/theatre-author-sdk-v1.md)

## Registration model

**Curated packages only.** Authors submit an `AnimationPackage` via PR; maintainers register it in `registry/seed.ts`. There is no runtime plugin loader in v1.

## Scope (v1)

- Single-layer canvas scenes extending `CanvasAnimation`
- One animation + one preset per package via `defineAnimationPackage()`

Out of scope for v1 public authors: composites (`monsterCrew`), video/image layers, object-spinner engines, stop-motion story DSL.

## Happy path

```ts
import {
  CanvasAnimation,
  defineAnimationPackage,
  type PublicAnimationContext,
} from '@/theatre/author'

class PulseScene extends CanvasAnimation {
  constructor() {
    super({ useEffects: true, defaultZIndex: 101 })
  }

  protected draw(context: PublicAnimationContext) {
    const bands = this.readBands(context)
    const triggers = context.shared.getTriggers(context.options.preset ?? 'vivid')
    const t = context.shared.time.elapsed
    const { cssWidth: w, cssHeight: h } = this

    this.ctx.clearRect(0, 0, w, h)
    const r = 40 + bands.bass * 80
    this.ctx.beginPath()
    this.ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
    this.ctx.fillStyle = `hsl(${(t * 0.05) % 360}, 80%, 50%)`
    this.ctx.fill()

    if (triggers.beat) this.effects?.triggerScreenPunch(0.6)
    this.effects?.update(this.ctx, t, this.pixelRatio)
  }
}

function pulseFactory() {
  return new PulseScene()
}

export const pulsePackage = defineAnimationPackage({
  id: 'pulse',
  label: 'Pulse',
  animationId: 'pulse',
  factory: pulseFactory,
  presetId: 'pulseScene',
  reducedMotionPreset: 'quietPulse',
  category: 'lab',
})
```

Register in `registry/seed.ts`:

```ts
import { pulsePackage } from '../packages/pulse'
registerAnimationPackage(pulsePackage)
```

## Inputs (what authors receive)

| Field | Access |
|-------|--------|
| Canvas size | `this.cssWidth`, `this.cssHeight` |
| Time | `context.shared.time` |
| Audio bands | `this.readBands(context)` |
| Beat/onset | `context.shared.getTriggers(preset)` |
| Performance | `context.shared.particleScale`, `lowPower`, `reducedMotion` |
| Layer styling | `context.options` (`TheatreLayerOptions` only) |
| Artwork | `context.artworkUrl` |

## Rules

- Do **not** access `AnalyserNode` — use `context.shared.features` / `readBands()`
- Do **not** start a private RAF loop — the controller drives frames
- High-motion presets must set `reducedMotionPreset`
- Respect `context.shared.reducedMotion`, `lowPower`, and `particleScale`

## Dev validation

Use `?theatreDev=1` to inspect live layers while developing.

# Theatre Animation Packages

Animation packages are the onboarding unit for theatre scenes. A package bundles a manifest, one or more registry animations, and one or more scene presets.

**Public authors:** use the v1 SDK at `@/theatre/author` — see `author/README.md`. Registration is curated via PR into `registry/seed.ts`.

## Required files for new first-party packages

- `index.ts`: exports the package and scene factory.
- `manifest.ts`: exports an `AnimationPackageManifest`.
- `presets.ts`: exports package presets.
- `*Scene.ts`: the scene implementation.

For simple canvas scenes, prefer `defineAnimationPackage()` from `@/theatre/author` in `index.ts`.

## Registration

```ts
import { registerAnimationPackage } from '../../registry/registerAnimationPackage'
import { myPackage } from '../packages/my-package'

registerAnimationPackage(myPackage)
```

## Package expectations

- Use `context.shared.features` / `this.readBands(context)` for audio data.
- Use `context.shared.getTriggers(...)` for beat/onset decisions.
- Use `context.shared.time` for controller-owned timing.
- Respect `context.shared.reducedMotion`, `lowPower`, and `particleScale`.
- Do not create new analysers or access `context.analyser` in author code.
- Externally driven canvas scenes should extend `CanvasAnimation` and avoid private RAF loops.
- Vivid, chaotic, or high-motion presets should provide `reducedMotionPreset`.

## Testing

Use `?theatreDev=1` to inspect live layers and debug state while validating package behavior.


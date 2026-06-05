Theatre Animation Packages
==========================

Animation packages are the onboarding unit for theatre scenes. A package bundles a manifest, one or more registry animations, and one or more scene presets. The controller still consumes presets and the bridge still creates `IAnimation` instances; packages sit above that runtime as registration structure.

Required files for new packages:

- `index.ts`: exports the package and scene factory.
- `manifest.ts`: exports an `AnimationPackageManifest`.
- `presets.ts`: exports package presets.
- `README.md`: explains purpose, capabilities, and reduced-motion behavior.
- `*Scene.ts`: the scene implementation, or a compatibility wrapper around an existing one.

Registration:

```ts
import { registerAnimationPackage } from '../../registry/registerAnimationPackage'
import { myPackage } from '../packages/my-package'

registerAnimationPackage(myPackage)
```

Package expectations:

- Use `context.shared.features` for audio data when available.
- Use `context.shared.getTriggers(...)` for beat/onset decisions.
- Use `context.shared.time` for controller-owned timing.
- Respect `context.shared.reducedMotion`, `lowPower`, and `particleScale`.
- Do not create new analysers. Use the analyser and shared features already provided.
- Externally driven canvas scenes should extend `CanvasAnimation` and avoid private RAF loops once `enableExternalDriving()` has been called.
- Vivid, chaotic, or high-motion presets should provide `reducedMotionPreset`.

Testing:

Use `?theatreDev=1` to inspect live layers and debug state while validating package behavior.


# Object Spinner Mover

One shared canvas engine (`objectSpinnerMover`) + individually registerable preset packages.

## Register in seed.ts

Engine **must** be registered first. Then cherry-pick preset packages:

```ts
import {
  objectSpinnerMoverEnginePackage,
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  ghostOrbitMidnightPackage,
  // comment out any you don't want in rotation
} from '../packages/object-spinner-mover'

[
  objectSpinnerMoverEnginePackage,
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  ghostOrbitMidnightPackage,
].forEach(registerAnimationPackage)
```

Theatre **randomly rotates** among registered presets — it does not generate configs at runtime. Each package is a fixed seed.

### All named preset packages

| Export | Preset id |
| --- | --- |
| `osmCalmFloatPackage` | `osm-calm-float` |
| `burgerBounceCarnivalPackage` | `burger-bounce-carnival` |
| `ghostOrbitMidnightPackage` | `ghost-orbit-midnight` |
| `tacoRainAcidPackage` | `taco-rain-acid` |
| `beeSwarmSunsetPackage` | `bee-swarm-sunset` |
| `dicePanicCasinoPackage` | `dice-panic-casino` |
| `smileyFloatCandyPackage` | `smiley-float-candy` |
| `knifeSpiralHorrorPackage` | `knife-spiral-horror` |
| `ufoTunnelCosmicPackage` | `ufo-tunnel-cosmic` |
| `discoDuckRavePackage` | `disco-duck-rave` |
| `poopWaveSillyPackage` | `poop-wave-silly` |
| `pizzaPortalPosterPackage` | `pizza-portal-poster` |
| `hotdogFountainToxicPackage` | `hotdog-fountain-toxic` |
| `heartSpotlightPastelPackage` | `heart-spotlight-pastel` |
| `skullIdolGhostsPackage` | `skull-idol-ghosts` |

Register everything: `objectSpinnerMoverPresetPackages` (array of all preset packages).

## Add a new preset

1. Add a named seed in `seeds.ts`
2. Export a package in `packages.ts` via `defineObjectTheatrePresetPackage(yourSeed)`
3. Import and register it in `seed.ts`

## Force a preset at runtime

```
?theatrePreset=burger-bounce-carnival
```

Keep `osmCalmFloatPackage` registered — other presets use it as `reducedMotionPreset`.

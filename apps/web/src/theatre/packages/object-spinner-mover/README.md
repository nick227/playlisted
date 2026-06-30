# Object Spinner Mover

One shared canvas engine (`objectSpinnerMover`) + individually registerable preset packages.

## Register in seed.ts

Use `registerObjectTheatreInSeed` — it registers the shared engine automatically, then your preset packages:

```ts
import {
  registerObjectTheatreInSeed,
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  knifeSpiralHorrorPackage,
} from '../packages/object-spinner-mover'

registerObjectTheatreInSeed([
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  knifeSpiralHorrorPackage,
])
```

Do **not** call `registerAnimationPackage` on preset packages alone — they need `objectSpinnerMover` registered first.

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

## Audio-reactive juice

The engine uses shared `MicroEffects` + macro overlays:

| Layer | On beat / bass / drop |
| --- | --- |
| **Micro** | Particle bursts at hero/center, shockwaves, screen punch shake |
| **Macro** | Expanding pulse rings, vignette crush, zoom punch, color flash |

Loudest combos: `dropExplosion`, `burstSpawn`, `spawnMore` + `panic` / `centerBurst`.

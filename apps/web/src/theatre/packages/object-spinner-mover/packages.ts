import type { AnimationPackage } from '../../registry/packages'
import { objectSpinnerMoverManifest } from './manifest'
import { objectSpinnerMoverFactory } from './ObjectSpinnerMoverScene'
import { buildObjectTheatrePreset, type ObjectTheatreSeed } from './buildPreset'
import {
  ALL_OBJECT_THEATRE_SEEDS,
  beeSwarmSunsetSeed,
  burgerBounceCarnivalSeed,
  dicePanicCasinoSeed,
  discoDuckRaveSeed,
  ghostOrbitMidnightSeed,
  heartSpotlightPastelSeed,
  hotdogFountainToxicSeed,
  knifeSpiralHorrorSeed,
  osmCalmFloatSeed,
  pizzaPortalPosterSeed,
  poopWaveSillySeed,
  skullIdolGhostsSeed,
  smileyFloatCandySeed,
  tacoRainAcidSeed,
  ufoTunnelCosmicSeed,
} from './seeds'

/** Registers the shared canvas engine once. Required before any preset package. */
export const objectSpinnerMoverEnginePackage: AnimationPackage = {
  manifest: {
    ...objectSpinnerMoverManifest,
    id: 'object-spinner-mover-engine',
    label: 'Object Spinner Mover Engine',
    description: 'Shared sticker theatre engine — register preset packages separately in seed.ts.',
  },
  animations: [{
    id: 'objectSpinnerMover',
    label: 'Object Spinner Mover',
    factory: objectSpinnerMoverFactory,
    visualType: 'canvas',
    mood: 'dynamic',
    role: 'subject',
    weight: 2,
  }],
  presets: [],
}

export function defineObjectTheatrePresetPackage(seed: ObjectTheatreSeed): AnimationPackage {
  return {
    manifest: {
      id: `osm-${seed.id}`,
      label: seed.label,
      version: '1.0.0',
      kind: 'effect-system',
      category: seed.category ?? 'production',
      description: `Object spinner mover preset: ${seed.label}`,
      capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'reduced-motion'],
      reducedMotionSafe: true,
    },
    animations: [],
    presets: [buildObjectTheatrePreset(seed)],
  }
}

export const osmCalmFloatPackage = defineObjectTheatrePresetPackage(osmCalmFloatSeed)
export const burgerBounceCarnivalPackage = defineObjectTheatrePresetPackage(burgerBounceCarnivalSeed)
export const ghostOrbitMidnightPackage = defineObjectTheatrePresetPackage(ghostOrbitMidnightSeed)
export const tacoRainAcidPackage = defineObjectTheatrePresetPackage(tacoRainAcidSeed)
export const beeSwarmSunsetPackage = defineObjectTheatrePresetPackage(beeSwarmSunsetSeed)
export const dicePanicCasinoPackage = defineObjectTheatrePresetPackage(dicePanicCasinoSeed)
export const smileyFloatCandyPackage = defineObjectTheatrePresetPackage(smileyFloatCandySeed)
export const knifeSpiralHorrorPackage = defineObjectTheatrePresetPackage(knifeSpiralHorrorSeed)
export const ufoTunnelCosmicPackage = defineObjectTheatrePresetPackage(ufoTunnelCosmicSeed)
export const discoDuckRavePackage = defineObjectTheatrePresetPackage(discoDuckRaveSeed)
export const poopWaveSillyPackage = defineObjectTheatrePresetPackage(poopWaveSillySeed)
export const pizzaPortalPosterPackage = defineObjectTheatrePresetPackage(pizzaPortalPosterSeed)
export const hotdogFountainToxicPackage = defineObjectTheatrePresetPackage(hotdogFountainToxicSeed)
export const heartSpotlightPastelPackage = defineObjectTheatrePresetPackage(heartSpotlightPastelSeed)
export const skullIdolGhostsPackage = defineObjectTheatrePresetPackage(skullIdolGhostsSeed)

/** All preset packages — use only if you want every seed registered. */
export const objectSpinnerMoverPresetPackages = ALL_OBJECT_THEATRE_SEEDS.map(defineObjectTheatrePresetPackage)

import type { ObjectTheatrePreset } from './engine/types'
import type { ObjectTheatreSeed } from './buildPreset'

export const osmCalmFloatSeed: ObjectTheatreSeed = {
  id: 'osm-calm-float',
  label: 'Sticker Drift Calm',
  category: 'production',
  weight: 2,
  config: {
    backgroundPreset: 'radialGradient', shapePack: 'nature', motionPreset: 'float',
    beatBehavior: 'scaleOnBeat', spawnStyle: 'randomPop', palette: 'pastel', depthBands: 3,
    objectCount: 12,
  },
}

export const burgerBounceCarnivalSeed: ObjectTheatreSeed = {
  id: 'burger-bounce-carnival',
  label: 'Burger Bounce Carnival',
  config: {
    backgroundPreset: 'checkerboard', shapePack: 'fastFood', motionPreset: 'bounce',
    beatBehavior: 'spinKick', spawnStyle: 'edges', palette: 'poster', depthBands: 3,
    heroObject: { shape: 'burger', behavior: 'centerWobble', scale: 2.5 },
  },
}

export const ghostOrbitMidnightSeed: ObjectTheatreSeed = {
  id: 'ghost-orbit-midnight',
  label: 'Ghost Orbit Midnight',
  config: {
    backgroundPreset: 'starfield', shapePack: 'spooky', motionPreset: 'orbit',
    beatBehavior: 'backgroundFlash', spawnStyle: 'orbitRing', palette: 'midnight', depthBands: 3,
    heroObject: { shape: 'moon', behavior: 'spinIdle', scale: 2.2 },
  },
}

export const tacoRainAcidSeed: ObjectTheatreSeed = {
  id: 'taco-rain-acid',
  label: 'Taco Rain Acid',
  config: {
    backgroundPreset: 'liquidLava', shapePack: 'fastFood', motionPreset: 'falling',
    beatBehavior: 'bassGravity', spawnStyle: 'rain', palette: 'acid', depthBands: 3,
  },
}

export const beeSwarmSunsetSeed: ObjectTheatreSeed = {
  id: 'bee-swarm-sunset',
  label: 'Bee Swarm Sunset',
  config: {
    backgroundPreset: 'radialGradient', shapePack: 'nature', motionPreset: 'swarm',
    beatBehavior: 'snareShuffle', spawnStyle: 'randomPop', palette: 'sunset', depthBands: 3,
  },
}

export const dicePanicCasinoSeed: ObjectTheatreSeed = {
  id: 'dice-panic-casino',
  label: 'Dice Panic Casino',
  config: {
    backgroundPreset: 'neonCity', shapePack: 'gambling', motionPreset: 'orbit',
    beatBehavior: 'spinKick', spawnStyle: 'orbitRing', palette: 'chrome', depthBands: 2,
    objectCount: 10,
  },
}

export const smileyFloatCandySeed: ObjectTheatreSeed = {
  id: 'smiley-float-candy',
  label: 'Smiley Float Candy',
  config: {
    backgroundPreset: 'comicBurst', shapePack: 'party', motionPreset: 'float',
    beatBehavior: 'scaleOnBeat', spawnStyle: 'randomPop', palette: 'candy', depthBands: 3,
  },
}

export const knifeSpiralHorrorSeed: ObjectTheatreSeed = {
  id: 'knife-spiral-horror',
  label: 'Knife Spiral Horror',
  config: {
    backgroundPreset: 'vhsGrid', shapePack: 'horrorSnack', motionPreset: 'spiral',
    beatBehavior: 'spinKick', spawnStyle: 'centerBurst', palette: 'horror', depthBands: 3,
    heroObject: { shape: 'skull', behavior: 'orbitPulse', scale: 2.8 },
  },
}

export const ufoTunnelCosmicSeed: ObjectTheatreSeed = {
  id: 'ufo-tunnel-cosmic',
  label: 'UFO Tunnel Cosmic',
  config: {
    backgroundPreset: 'tunnelWarp', shapePack: 'cosmic', motionPreset: 'tunnel',
    beatBehavior: 'colorFlash', spawnStyle: 'orbitRing', palette: 'midnight', depthBands: 3,
  },
}

export const discoDuckRaveSeed: ObjectTheatreSeed = {
  id: 'disco-duck-rave',
  label: 'Disco Duck Rave',
  config: {
    backgroundPreset: 'neonCity', shapePack: 'rave', motionPreset: 'orbit',
    beatBehavior: 'spawnMore', spawnStyle: 'beatBurst', palette: 'acid', depthBands: 3,
    heroObject: { shape: 'duck', behavior: 'bounceHero', scale: 2.4 },
    personality: 'raver',
  },
}

export const poopWaveSillySeed: ObjectTheatreSeed = {
  id: 'poop-wave-silly',
  label: 'Poop Wave Silly',
  config: {
    backgroundPreset: 'paperCollage', shapePack: 'silly', motionPreset: 'waveRows',
    beatBehavior: 'scaleOnBeat', spawnStyle: 'gridFill', palette: 'pastel', depthBands: 3,
  },
}

export const pizzaPortalPosterSeed: ObjectTheatreSeed = {
  id: 'pizza-portal-poster',
  label: 'Pizza Portal',
  config: {
    backgroundPreset: 'comicBurst', shapePack: 'fastFood', motionPreset: 'spiral',
    beatBehavior: 'burstSpawn', spawnStyle: 'centerBurst', palette: 'poster', depthBands: 3,
    heroObject: { shape: 'pizza', behavior: 'spinIdle', scale: 3 },
  },
}

export const hotdogFountainToxicSeed: ObjectTheatreSeed = {
  id: 'hotdog-fountain-toxic',
  label: 'Hotdog Fountain Toxic',
  config: {
    backgroundPreset: 'checkerboard', shapePack: 'kitchen', motionPreset: 'rising',
    beatBehavior: 'bassGravity', spawnStyle: 'fountain', palette: 'toxic', depthBands: 3,
  },
}

export const heartSpotlightPastelSeed: ObjectTheatreSeed = {
  id: 'heart-spotlight-pastel',
  label: 'Heart Spotlight',
  config: {
    backgroundPreset: 'spotlightStage', shapePack: 'party', motionPreset: 'float',
    beatBehavior: 'backgroundFlash', spawnStyle: 'edges', palette: 'pastel', depthBands: 3,
  },
}

export const skullIdolGhostsSeed: ObjectTheatreSeed = {
  id: 'skull-idol-ghosts',
  label: 'Skull Idol',
  config: {
    backgroundPreset: 'radialGradient', shapePack: 'spooky', motionPreset: 'orbit',
    beatBehavior: 'spinKick', spawnStyle: 'orbitRing', palette: 'horror', depthBands: 3,
    heroObject: { shape: 'skull', behavior: 'centerWobble', scale: 3 },
    objectCount: 12,
  },
}

export const ALL_OBJECT_THEATRE_SEEDS = [
  osmCalmFloatSeed,
  burgerBounceCarnivalSeed,
  ghostOrbitMidnightSeed,
  tacoRainAcidSeed,
  beeSwarmSunsetSeed,
  dicePanicCasinoSeed,
  smileyFloatCandySeed,
  knifeSpiralHorrorSeed,
  ufoTunnelCosmicSeed,
  discoDuckRaveSeed,
  poopWaveSillySeed,
  pizzaPortalPosterSeed,
  hotdogFountainToxicSeed,
  heartSpotlightPastelSeed,
  skullIdolGhostsSeed,
] as const

export function listObjectTheatreSeedIds(): string[] {
  return ALL_OBJECT_THEATRE_SEEDS.map(seed => seed.id)
}

const seedConfigById = new Map<string, ObjectTheatrePreset>(
  ALL_OBJECT_THEATRE_SEEDS.map(seed => [seed.id, seed.config]),
)

export function getObjectTheatreSeedConfig(presetId: string): ObjectTheatrePreset | null {
  return seedConfigById.get(presetId) ?? null
}

import type { ScenePresetDef } from '../../registry/scenePresets'
import type { ObjectTheatrePreset } from './engine/types'

export type ObjectTheatreSeed = {
  id: string
  label: string
  weight?: number
  category?: 'production' | 'lab'
  reducedMotionPreset?: string
  config: ObjectTheatrePreset
}

const LAYER_BASE = {
  opacity: 1,
  zIndex: 101,
  blendMode: 'normal' as const,
  intensity: 1,
  sensitivity: 1,
  preset: 'vivid' as const,
}

export function buildObjectTheatrePreset(seed: ObjectTheatreSeed): ScenePresetDef {
  return {
    id: seed.id,
    label: seed.label,
    category: seed.category ?? 'lab',
    weight: seed.weight ?? 1,
    reducedMotionPreset: seed.reducedMotionPreset ?? 'osm-calm-float',
    layers: [{
      animationId: 'objectSpinnerMover',
      role: 'subject',
      options: { ...LAYER_BASE, objectTheatre: seed.config },
    }],
  }
}

export const OBJECT_THEATRE_SEEDS: ObjectTheatreSeed[] = [
  {
    id: 'osm-calm-float',
    label: 'Sticker Drift Calm',
    category: 'production',
    weight: 2,
    config: {
      backgroundPreset: 'radialGradient', shapePack: 'party', motionPreset: 'float',
      beatBehavior: 'scaleOnBeat', spawnStyle: 'randomPop', palette: 'pastel', depthBands: 3,
      objectCount: 16,
    },
  },
  {
    id: 'burger-bounce-carnival',
    label: 'Burger Bounce Carnival',
    config: {
      backgroundPreset: 'checkerboard', shapePack: 'fastFood', motionPreset: 'bounce',
      beatBehavior: 'spinKick', spawnStyle: 'edges', palette: 'poster', depthBands: 3,
      heroObject: { shape: 'burger', behavior: 'centerWobble', scale: 2.5 },
    },
  },
  {
    id: 'ghost-orbit-midnight',
    label: 'Ghost Orbit Midnight',
    config: {
      backgroundPreset: 'starfield', shapePack: 'spooky', motionPreset: 'orbit',
      beatBehavior: 'backgroundFlash', spawnStyle: 'orbitRing', palette: 'midnight', depthBands: 3,
      heroObject: { shape: 'moon', behavior: 'spinIdle', scale: 2.2 },
    },
  },
  {
    id: 'taco-rain-acid',
    label: 'Taco Rain Acid',
    config: {
      backgroundPreset: 'liquidLava', shapePack: 'fastFood', motionPreset: 'falling',
      beatBehavior: 'bassGravity', spawnStyle: 'rain', palette: 'acid', depthBands: 3,
    },
  },
  {
    id: 'bee-swarm-sunset',
    label: 'Bee Swarm Sunset',
    config: {
      backgroundPreset: 'radialGradient', shapePack: 'nature', motionPreset: 'swarm',
      beatBehavior: 'snareShuffle', spawnStyle: 'randomPop', palette: 'sunset', depthBands: 3,
    },
  },
  {
    id: 'dice-panic-casino',
    label: 'Dice Panic Casino',
    config: {
      backgroundPreset: 'neonCity', shapePack: 'gambling', motionPreset: 'panic',
      beatBehavior: 'dropExplosion', spawnStyle: 'centerBurst', palette: 'chrome', depthBands: 3,
    },
  },
  {
    id: 'smiley-float-candy',
    label: 'Smiley Float Candy',
    config: {
      backgroundPreset: 'comicBurst', shapePack: 'party', motionPreset: 'float',
      beatBehavior: 'scaleOnBeat', spawnStyle: 'randomPop', palette: 'candy', depthBands: 3,
    },
  },
  {
    id: 'knife-spiral-horror',
    label: 'Knife Spiral Horror',
    config: {
      backgroundPreset: 'vhsGrid', shapePack: 'horrorSnack', motionPreset: 'spiral',
      beatBehavior: 'spinKick', spawnStyle: 'centerBurst', palette: 'horror', depthBands: 3,
      heroObject: { shape: 'skull', behavior: 'orbitPulse', scale: 2.8 },
    },
  },
  {
    id: 'ufo-tunnel-cosmic',
    label: 'UFO Tunnel Cosmic',
    config: {
      backgroundPreset: 'tunnelWarp', shapePack: 'cosmic', motionPreset: 'tunnel',
      beatBehavior: 'colorFlash', spawnStyle: 'orbitRing', palette: 'midnight', depthBands: 3,
    },
  },
  {
    id: 'disco-duck-rave',
    label: 'Disco Duck Rave',
    config: {
      backgroundPreset: 'neonCity', shapePack: 'rave', motionPreset: 'orbit',
      beatBehavior: 'spawnMore', spawnStyle: 'beatBurst', palette: 'acid', depthBands: 3,
      heroObject: { shape: 'duck', behavior: 'bounceHero', scale: 2.4 },
      personality: 'raver',
    },
  },
  {
    id: 'poop-wave-silly',
    label: 'Poop Wave Silly',
    config: {
      backgroundPreset: 'paperCollage', shapePack: 'silly', motionPreset: 'waveRows',
      beatBehavior: 'scaleOnBeat', spawnStyle: 'gridFill', palette: 'pastel', depthBands: 3,
    },
  },
  {
    id: 'pizza-portal-poster',
    label: 'Pizza Portal',
    config: {
      backgroundPreset: 'comicBurst', shapePack: 'fastFood', motionPreset: 'spiral',
      beatBehavior: 'burstSpawn', spawnStyle: 'centerBurst', palette: 'poster', depthBands: 3,
      heroObject: { shape: 'pizza', behavior: 'spinIdle', scale: 3 },
    },
  },
  {
    id: 'hotdog-fountain-toxic',
    label: 'Hotdog Fountain Toxic',
    config: {
      backgroundPreset: 'checkerboard', shapePack: 'kitchen', motionPreset: 'rising',
      beatBehavior: 'bassGravity', spawnStyle: 'fountain', palette: 'toxic', depthBands: 3,
    },
  },
  {
    id: 'heart-spotlight-pastel',
    label: 'Heart Spotlight',
    config: {
      backgroundPreset: 'spotlightStage', shapePack: 'party', motionPreset: 'float',
      beatBehavior: 'backgroundFlash', spawnStyle: 'edges', palette: 'pastel', depthBands: 3,
    },
  },
  {
    id: 'skull-idol-ghosts',
    label: 'Skull Idol',
    config: {
      backgroundPreset: 'radialGradient', shapePack: 'spooky', motionPreset: 'orbit',
      beatBehavior: 'spinKick', spawnStyle: 'orbitRing', palette: 'horror', depthBands: 3,
      heroObject: { shape: 'skull', behavior: 'centerWobble', scale: 3 },
      objectCount: 18,
    },
  },
]

export const objectSpinnerMoverPresets = OBJECT_THEATRE_SEEDS.map(buildObjectTheatrePreset)

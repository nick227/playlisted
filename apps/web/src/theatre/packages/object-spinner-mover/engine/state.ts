import type { ObjectTheatrePreset, TheatreObject, HeroObjectConfig } from './types'
import type { ShapeKind } from './types'
import { SHAPE_PACKS } from './shapes'
import { seededRandom } from './rng'
import { assignDepthBand } from './depth'
import { pickPersonality } from './personality'
import { positionForSpawn } from './spawn'

export function createObjectPool(preset: ObjectTheatrePreset, w: number, h: number): TheatreObject[] {
  const count = preset.objectCount ?? 24
  const shapes = SHAPE_PACKS[preset.shapePack]
  const bandCount = preset.depthBands ?? 3
  const cx = w / 2; const cy = h / 2
  const objects: TheatreObject[] = []

  for (let i = 0; i < count; i++) {
    const shape = shapes[Math.floor(seededRandom(i * 2.1) * shapes.length)]!
    const obj = makeObject(i, shape, preset, bandCount)
    positionForSpawn(obj, preset.spawnStyle, { w, h, cx, cy, index: i, total: count, beat: false, initial: true })
    objects.push(obj)
  }

  if (preset.heroObject) {
    objects.push(makeHero(preset.heroObject, preset, bandCount))
  }

  return objects
}

function makeObject(
  index: number,
  shape: ShapeKind,
  preset: ObjectTheatrePreset,
  bandCount: number,
): TheatreObject {
  return {
    x: 0, y: 0, vx: (seededRandom(index) - 0.5) * 2, vy: (seededRandom(index + 1) - 0.5) * 2,
    rot: seededRandom(index + 2) * Math.PI * 2,
    rotSpeed: (seededRandom(index + 3) - 0.5) * 2,
    baseScale: 0.6 + seededRandom(index + 4) * 0.6,
    scalePulse: 1,
    shape,
    zBand: assignDepthBand(index, bandCount),
    personality: pickPersonality(preset.personality, index),
    colorIndex: index,
    orbitAngle: seededRandom(index + 5) * Math.PI * 2,
    orbitRadius: 80 + seededRandom(index + 6) * 120,
    wavePhase: seededRandom(index + 7) * 10,
    spawnDelay: 0,
    alive: true,
    isHero: false,
  }
}

function makeHero(hero: HeroObjectConfig, preset: ObjectTheatrePreset, bandCount: number): TheatreObject {
  const obj = makeObject(9999, hero.shape, preset, bandCount)
  obj.isHero = true
  obj.baseScale = hero.scale
  obj.zBand = bandCount - 1
  obj.personality = 'magnetic'
  return obj
}

export function respawnObject(
  obj: TheatreObject,
  index: number,
  preset: ObjectTheatrePreset,
  w: number,
  h: number,
  beat: boolean,
) {
  const shapes = SHAPE_PACKS[preset.shapePack]
  obj.shape = shapes[Math.floor(seededRandom(index + performance.now()) * shapes.length)]!
  obj.alive = true
  obj.scalePulse = 1
  positionForSpawn(obj, preset.spawnStyle, { w, h, cx: w / 2, cy: h / 2, index, total: preset.objectCount ?? 24, beat })
}

export function updateHero(obj: TheatreObject, hero: HeroObjectConfig, frame: { w: number; h: number; cx: number; cy: number; time: number }) {
  const { cx, cy, time } = frame
  obj.x = cx; obj.y = cy

  switch (hero.behavior) {
    case 'centerWobble':
      obj.x += Math.sin(time * 0.002) * 20
      obj.y += Math.cos(time * 0.0025) * 15
      obj.rot = Math.sin(time * 0.001) * 0.2
      break
    case 'orbitPulse':
      obj.x = cx + Math.cos(time * 0.001) * 30
      obj.y = cy + Math.sin(time * 0.0012) * 20
      obj.rot += 0.02
      break
    case 'spinIdle':
      obj.rot += 0.03
      break
    case 'bounceHero':
      obj.y = cy + Math.abs(Math.sin(time * 0.003)) * 40 - 20
      obj.rot = Math.sin(time * 0.004) * 0.15
      break
  }
}

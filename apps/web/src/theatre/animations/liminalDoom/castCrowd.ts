import type { CastActivity, CastMemberDef } from '../../sceneKit'
import { hash01 } from './types'
import { resolveBodyStyle, resolveGender } from './bodies'

export function patron(
  id: string,
  nx: number,
  ny: number,
  activity: CastActivity,
  seed: number,
  opts: Partial<CastMemberDef> = {},
): CastMemberDef {
  const scale = opts.placement?.scale ?? 0.34 + hash01(seed, 2) * 0.14
  const placement = opts.placement ?? { nx, ny, scale, z: 0.28 + ny * 0.25 }
  return {
    ...opts,
    id,
    placement,
    role: opts.role ?? 'ambient',
    faceLayer: 'studio',
    activity: opts.activity ?? activity,
    gender: opts.gender ?? resolveGender(seed, 1),
    style: opts.style ?? resolveBodyStyle(seed, 3),
    showFace: opts.showFace ?? (activity === 'look' && hash01(seed, 5) > 0.65),
    wanderRadius: opts.wanderRadius ?? (activity === 'wander' ? 0.045 : undefined),
  }
}

export function buildBarPatrons(seed: number): CastMemberDef[] {
  return [
    patron('patron-a', 0.22, 0.82, 'drink', seed + 10),
    patron('patron-b', 0.38, 0.88, 'smoke', seed + 20, { gender: 'female', style: 'punk' }),
    patron('patron-c', 0.78, 0.85, 'hangOut', seed + 30),
    patron('patron-d', 0.88, 0.78, 'look', seed + 40, { showFace: true }),
  ]
}

export function buildBandMembers(seed: number): CastMemberDef[] {
  return [
    patron('drummer', 0.48, 0.78, 'playDrums', seed + 50, { bodyScale: 0.44, gender: 'male', style: 'street' }),
    patron('guitar-l', 0.38, 0.8, 'playGuitar', seed + 60, { gender: 'female', style: 'neon' }),
    patron('guitar-r', 0.62, 0.8, 'playGuitar', seed + 70, { gender: 'male', style: 'classic' }),
    patron('bassist', 0.72, 0.82, 'playBass', seed + 80, { style: 'thrift' }),
  ]
}

export function buildDancers(seed: number, count: number): CastMemberDef[] {
  const out: CastMemberDef[] = []
  const acts: CastActivity[] = ['dance', 'dance', 'dance', 'hangOut', 'wander', 'look']
  for (let i = 0; i < count; i++) {
    const s = seed + i * 13
    out.push(patron(`dancer-${i}`,
      0.1 + hash01(s, 1) * 0.8,
      0.72 + hash01(s, 2) * 0.18,
      acts[i % acts.length],
      s,
    ))
  }
  return out
}

export function buildHallwayWatchers(seed: number, rows: number, perSide: number): CastMemberDef[] {
  const out: CastMemberDef[] = []
  for (let row = 0; row < rows; row++) {
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < perSide; i++) {
        const idx = row * 10 + side * 5 + i
        const s = seed + idx
        const depth = row / rows
        const nx = side === 0 ? 0.08 + hash01(s, 1) * 0.2 : 0.92 - hash01(s, 1) * 0.2
        const ny = 0.35 + depth * 0.45
        out.push(patron(`watcher-${idx}`, nx, ny,
          hash01(s, 4) > 0.7 ? 'look' : 'stand',
          s,
          {
            placement: { nx, ny, scale: (0.3 + depth * 0.2) * (0.85 + hash01(s, 2) * 0.2), z: 0.15 + depth * 0.4 },
            showFace: hash01(s, 6) > 0.55,
            alpha: 0.8 + depth * 0.15,
          },
        ))
      }
    }
  }
  return out
}

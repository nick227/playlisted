import type { CastActivity, CastMemberDef } from '../../sceneKit'
import { buildRecipeFromSeed } from './character'
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
  const scale = opts.placement?.scale ?? 0.38 + hash01(seed, 2) * 0.16
  const placement = opts.placement ?? { nx, ny, scale, z: 0.28 + ny * 0.25 }
  return {
    ...opts,
    id,
    placement,
    role: opts.role ?? 'ambient',
    faceLayer: 'studio',
    recipe: { ...buildRecipeFromSeed(seed), ...opts.recipe },
    activity: opts.activity ?? activity,
    gender: opts.gender ?? resolveGender(seed, 1),
    style: opts.style ?? resolveBodyStyle(seed, 3),
    showFace: opts.showFace ?? shouldShowFace(activity, seed),
    faceMode: opts.faceMode ?? faceMode(activity),
    wanderRadius: opts.wanderRadius ?? (activity === 'wander' ? 0.045 : undefined),
  }
}

/** Face visibility rules for crowd members. */
function shouldShowFace(activity: CastActivity, seed: number): boolean {
  switch (activity) {
    case 'look':      return hash01(seed, 5) > 0.25   // 75% — looking characters are watchful
    case 'stand':     return hash01(seed, 5) > 0.45   // 55%
    case 'hangOut':   return hash01(seed, 5) > 0.5    // 50%
    case 'dance':     return hash01(seed, 5) > 0.55   // 45% — moving, harder to see
    case 'drink':     return hash01(seed, 5) > 0.55   // 45%
    case 'smoke':     return hash01(seed, 5) > 0.6    // 40%
    case 'wander':    return hash01(seed, 5) > 0.65   // 35%
    case 'playGuitar':
    case 'playBass':  return hash01(seed, 5) > 0.45   // 55% — band members are characters
    case 'playDrums': return hash01(seed, 5) > 0.5    // 50%
    default:          return hash01(seed, 5) > 0.6    // 40% fallback
  }
}

function faceMode(activity: CastActivity): CastMemberDef['faceMode'] {
  if (activity === 'look' || activity === 'stand') return 'watching'
  return undefined
}

// ── Scene-specific crowd builders ─────────────────────────────────────────────

export function buildBarPatrons(seed: number): CastMemberDef[] {
  return [
    patron('patron-a', 0.18, 0.82, 'drink',   seed + 10),
    patron('patron-b', 0.32, 0.88, 'smoke',   seed + 20, { gender: 'female', style: 'punk' }),
    patron('patron-c', 0.75, 0.86, 'hangOut', seed + 30),
    patron('patron-d', 0.88, 0.78, 'look',    seed + 40, { showFace: true, faceMode: 'watching' }),
    // Extra loiterer near the door — always watching
    patron('patron-e', 0.08, 0.75, 'stand',   seed + 50, { showFace: true, faceMode: 'watching', style: 'formal' }),
  ]
}

export function buildBandMembers(seed: number): CastMemberDef[] {
  return [
    patron('drummer',   0.48, 0.78, 'playDrums',  seed + 50, {
      bodyScale: 0.44, gender: 'male',   style: 'street',
      // Drummer's face always visible — they're expressive on the beat
      showFace: true, faceMode: 'watching',
    }),
    patron('guitar-l',  0.34, 0.80, 'playGuitar', seed + 60, {
      gender: 'female', style: 'neon',
    }),
    patron('guitar-r',  0.63, 0.80, 'playGuitar', seed + 70, {
      gender: 'male',   style: 'classic',
    }),
    patron('bassist',   0.74, 0.82, 'playBass',   seed + 80, { style: 'thrift' }),
    // A fifth figure hanging back — stand-in for a vocalist or second guitarist
    patron('figure-bg', 0.52, 0.74, 'stand',      seed + 90, {
      showFace: true, faceMode: 'watching',
      placement: { nx: 0.52, ny: 0.74, scale: 0.34, z: 0.28 },
    }),
  ]
}

export function buildDancers(seed: number, count: number): CastMemberDef[] {
  const n = Math.min(count, 14)
  const out: CastMemberDef[] = []
  const acts: CastActivity[] = ['dance', 'dance', 'dance', 'dance', 'hangOut', 'wander', 'look', 'drink']
  for (let i = 0; i < n; i++) {
    const s = seed + i * 13
    out.push(patron(`dancer-${i}`,
      0.08 + hash01(s, 1) * 0.84,
      0.70 + hash01(s, 2) * 0.20,
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
        const nx = side === 0 ? 0.06 + hash01(s, 1) * 0.22 : 0.94 - hash01(s, 1) * 0.22
        const ny = 0.32 + depth * 0.48
        // Front rows get faces more often — they're in closer view
        const faceProbabilityThreshold = 0.25 + depth * 0.35   // front = 25%, back = 60%
        out.push(patron(`watcher-${idx}`, nx, ny,
          hash01(s, 4) > 0.6 ? 'look' : 'stand',
          s,
          {
            placement: { nx, ny, scale: (0.28 + depth * 0.2) * (0.85 + hash01(s, 2) * 0.2), z: 0.15 + depth * 0.4 },
            showFace: hash01(s, 6) > faceProbabilityThreshold,
            faceMode: 'watching',
            alpha: 0.78 + depth * 0.18,
          },
        ))
      }
    }
  }
  return out
}

import type { CastActivity, CastMemberDef } from '../../../sceneKit'
import { buildRecipeFromSeed } from '../character'
import { spreadNxSlots } from './placement'
import { hash01 } from '../core/math'
import { resolveBodyStyle, resolveGender } from '../body/bodies'

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
    wanderRadius: opts.wanderRadius ?? (activity === 'wander' ? 0.03 : undefined),
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
    patron('patron-a', 0.22, 0.84, 'drink',   seed + 10),
    patron('patron-b', 0.78, 0.86, 'hangOut', seed + 30),
    patron('patron-c', 0.88, 0.78, 'look',    seed + 40, { showFace: true, faceMode: 'watching' }),
  ]
}

export function buildBandMembers(seed: number): CastMemberDef[] {
  const [nx0, nx1, nx2, nx3] = spreadNxSlots(4, 0.28)
  return [
    patron('drummer',   nx0, 0.78, 'playDrums',  seed + 50, {
      bodyScale: 0.44, gender: 'male',   style: 'street',
      // Drummer's face always visible — they're expressive on the beat
      showFace: true, faceMode: 'watching',
    }),
    patron('guitar-l',  nx1, 0.80, 'playGuitar', seed + 60, {
      gender: 'female', style: 'neon',
    }),
    patron('guitar-r',  nx2, 0.80, 'playGuitar', seed + 70, {
      gender: 'male',   style: 'classic',
    }),
    patron('bassist',   nx3, 0.82, 'playBass',   seed + 80, { style: 'thrift' }),
  ]
}

export function buildDancers(seed: number, count: number): CastMemberDef[] {
  const n = Math.min(count, 8)
  const out: CastMemberDef[] = []
  const acts: CastActivity[] = ['dance', 'dance', 'dance', 'dance', 'hangOut', 'wander', 'look', 'drink']
  const nxSlots = spreadNxSlots(n, 0.08)
  for (let i = 0; i < n; i++) {
    const s = seed + i * 13
    out.push(patron(`dancer-${i}`,
      nxSlots[i] + (hash01(s, 1) - 0.5) * 0.03,
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
        const sideSlots = spreadNxSlots(perSide, 0.12)
        const nx = side === 0
          ? 0.06 + sideSlots[i] * 0.2
          : 0.94 - sideSlots[i] * 0.2
        const ny = 0.32 + depth * 0.48 + (hash01(s, 3) - 0.5) * 0.04
        // Only the nearest row shows faces often — back rows stay silhouettes
        const faceProbabilityThreshold = 0.55 + depth * 0.35
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

import type { LiminalRenderer } from '../render/renderer'
import { palette } from '../core/palette'
import { hash01 } from '../core/math'

export type DecalStroke = {
  x: number
  y: number
  w: number
  h: number
  rot: number
  kind: 'grime' | 'graffiti' | 'stain'
  alpha: number
}

export type WallDecalSet = {
  strokes: DecalStroke[]
  corridor: DecalStroke[]
}

const MAX_STROKES = 24

/** Pre-generate at room creation — no per-frame allocation. */
export function buildWallDecals(seed: number, wallW: number, wallH: number): WallDecalSet {
  const strokes: DecalStroke[] = []
  const corridor: DecalStroke[] = []
  const count = 8 + Math.floor(hash01(seed, 1) * 6)

  for (let i = 0; i < count && strokes.length < MAX_STROKES; i++) {
    const kindRoll = hash01(seed, i + 10)
    strokes.push({
      x: hash01(seed, i * 4) * wallW,
      y: hash01(seed, i * 4 + 1) * wallH,
      w: 20 + hash01(seed, i * 4 + 2) * 80,
      h: 4 + hash01(seed, i * 4 + 3) * 40,
      rot: (hash01(seed, i + 50) - 0.5) * 0.4,
      kind: kindRoll < 0.5 ? 'grime' : kindRoll < 0.8 ? 'stain' : 'graffiti',
      alpha: 0.35 + hash01(seed, i + 60) * 0.4,
    })
  }

  for (let i = 0; i < 3; i++) {
    corridor.push({
      x: hash01(seed, 100 + i) * wallW * 0.6,
      y: hash01(seed, 110 + i) * wallH,
      w: 30 + hash01(seed, 120 + i) * 50,
      h: 8 + hash01(seed, 130 + i) * 20,
      rot: hash01(seed, 140 + i) * 0.2,
      kind: i === 0 ? 'graffiti' : 'grime',
      alpha: 0.4,
    })
  }

  return { strokes, corridor }
}

export function queueWallDecals(
  renderer: LiminalRenderer,
  decals: WallDecalSet,
  wallLeft: number,
  wallTop: number,
  shimmer: number,
  zBase = 0.08,
) {
  for (let i = 0; i < decals.strokes.length; i++) {
    const d = decals.strokes[i]
    queueStroke(renderer, d, wallLeft, wallTop, shimmer, zBase + i * 0.001)
  }
}

export function queueCorridorDecals(
  renderer: LiminalRenderer,
  decals: WallDecalSet,
  left: number,
  top: number,
  alphaShift: number,
) {
  for (let i = 0; i < decals.corridor.length; i++) {
    const d = decals.corridor[i]
    queueStroke(renderer, d, left, top, alphaShift, 0.12 + i * 0.002)
  }
}

function queueStroke(
  renderer: LiminalRenderer,
  d: DecalStroke,
  ox: number,
  oy: number,
  shimmer: number,
  z: number,
) {
  const x = ox + d.x
  const y = oy + d.y
  const alpha = d.alpha * (0.85 + shimmer * 0.15)

  if (d.kind === 'graffiti') {
    renderer.pushPosterShard(z, x, y, d.w, d.h, 0.1 + shimmer * 0.2, { alpha, tint: palette.magenta })
    if (shimmer > 0.5) {
      renderer.pushFaceMask(z + 0.01, x + d.w * 0.5, y + d.h * 0.55, d.h * 0.9, shimmer * 0.3, 0, 0, { alpha: alpha * 0.6 })
    }
  } else {
    renderer.pushSmokeQuad(z, { x, y, w: d.w, h: d.h }, alpha * 0.7, { tint: palette.grime })
    renderer.pushPosterShard(z + 0.001, x, y + d.h * 0.2, d.w * 0.6, d.h * 0.35, shimmer * 0.15, {
      alpha: alpha * 0.5,
      tint: d.kind === 'stain' ? palette.amberDim : palette.wallDark,
    })
  }
}

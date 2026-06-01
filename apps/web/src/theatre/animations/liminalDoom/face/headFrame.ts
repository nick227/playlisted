import type { FaceSkull } from '../character/libraries/face'
import { pathSquircle } from './faceShapes'
import type { CacheCtx } from './faceUtil'
import { faceHash as h } from './faceUtil'

/** Shared head metrics for hair + sculpted faces (matches faceCore squircle). */
export type HeadFrame = {
  cx: number
  cy: number
  hw: number
  hh: number
  round: number
}

export function computeHeadFrame(
  cx: number,
  cy: number,
  scale: number,
  skull: FaceSkull,
  female: boolean,
  seed: number,
  distort: number,
): HeadFrame {
  const sk = skullStretch(skull, female)
  const wStretch = sk.w + (h(seed, 1) - 0.5) * distort * 0.2
  const hStretch = sk.h + (h(seed, 2) - 0.5) * distort * 0.16
  return {
    cx,
    cy,
    hw: scale * 0.56 * wStretch,
    hh: scale * 0.62 * hStretch,
    round: 0.4,
  }
}

function skullStretch(skull: FaceSkull, fem: boolean) {
  switch (skull) {
    case 'angular': return { w: fem ? 0.9 : 1.05, h: fem ? 1.0 : 0.96 }
    case 'long':    return { w: fem ? 0.88 : 0.98, h: fem ? 1.08 : 1.04 }
    default:        return { w: fem ? 0.92 : 1.02, h: fem ? 1.04 : 1.0 }
  }
}

export function pathHeadSquircle(ctx: CacheCtx, f: HeadFrame) {
  ctx.save()
  ctx.translate(f.cx, f.cy)
  pathSquircle(ctx, f.hw, f.hh, f.round)
  ctx.restore()
}

/** Diamond / ovoid for sculpted ink faces (reference proportions). */
export function pathSculptedHead(ctx: CacheCtx, f: HeadFrame) {
  const { cx, cy, hw, hh } = f
  ctx.beginPath()
  ctx.moveTo(cx, cy - hh)
  ctx.bezierCurveTo(cx + hw * 0.92, cy - hh * 0.82, cx + hw * 0.98, cy - hh * 0.15, cx + hw * 0.68, cy + hh * 0.22)
  ctx.bezierCurveTo(cx + hw * 0.32, cy + hh * 0.92, cx - hw * 0.32, cy + hh * 0.92, cx - hw * 0.68, cy + hh * 0.22)
  ctx.bezierCurveTo(cx - hw * 0.98, cy - hh * 0.15, cx - hw * 0.92, cy - hh * 0.82, cx, cy - hh)
  ctx.closePath()
}

/** Hairline: upper boundary of scalp (widow's peak + temples). */
export function pathScalpHairline(ctx: CacheCtx, f: HeadFrame) {
  const { cx, cy, hw, hh } = f
  const y = cy - hh * 0.52
  const peak = cy - hh * 0.88
  ctx.beginPath()
  ctx.moveTo(cx - hw * 0.88, y)
  ctx.quadraticCurveTo(cx - hw * 0.55, cy - hh * 0.72, cx, peak)
  ctx.quadraticCurveTo(cx + hw * 0.55, cy - hh * 0.72, cx + hw * 0.88, y)
}

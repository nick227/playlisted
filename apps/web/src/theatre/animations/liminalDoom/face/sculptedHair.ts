import type { HairStyle } from '../fashion'
import type { HeadFrame } from './headFrame'
import { pathHeadSquircle, pathScalpHairline } from './headFrame'
import type { CacheCtx } from './faceUtil'

/** Scalp-conforming hair — repurposed from studio clumps; only on sculpted heads. */
export function drawSculptedHair(
  ctx: CacheCtx,
  frame: HeadFrame,
  style: HairStyle,
  base: string,
  hi: string,
) {
  ctx.save()
  pathHeadSquircle(ctx, frame)
  ctx.clip()

  const { cx, cy, hw, hh } = frame

  if (style === 'buzz') {
    ctx.fillStyle = base
    ctx.beginPath()
    pathScalpHairline(ctx, frame)
    ctx.lineTo(cx + hw, cy - hh * 0.35)
    ctx.lineTo(cx - hw, cy - hh * 0.35)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    return
  }

  ctx.fillStyle = base
  ctx.beginPath()
  pathScalpHairline(ctx, frame)
  ctx.lineTo(cx + hw * 0.92, cy - hh * 0.2)
  ctx.quadraticCurveTo(cx + hw * 0.5, cy - hh * 0.05, cx, cy - hh * 0.12)
  ctx.quadraticCurveTo(cx - hw * 0.5, cy - hh * 0.05, cx - hw * 0.92, cy - hh * 0.2)
  ctx.closePath()
  ctx.fill()

  if (style === 'long' || style === 'bob') {
    ctx.fillStyle = base
    for (const side of [-1, 1] as const) {
      const sx = cx + side * hw * 0.78
      ctx.beginPath()
      ctx.moveTo(sx - side * hw * 0.12, cy - hh * 0.35)
      ctx.quadraticCurveTo(sx + side * hw * 0.08, cy + hh * 0.5, sx + side * hw * 0.14, cy + hh * 0.85)
      ctx.lineTo(sx + side * hw * 0.02, cy + hh * 0.88)
      ctx.quadraticCurveTo(sx - side * hw * 0.06, cy + hh * 0.35, sx - side * hw * 0.14, cy - hh * 0.35)
      ctx.closePath()
      ctx.fill()
    }
  }

  if (style === 'bun') {
    ctx.beginPath()
    ctx.ellipse(cx + hw * 0.35, cy - hh * 0.55, hw * 0.22, hh * 0.2, 0.2, 0, Math.PI * 2)
    ctx.fill()
  }

  if (style === 'spiky') {
    const n = 7
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const tx = cx - hw * 0.7 + t * hw * 1.4
      const tipY = cy - hh * (0.95 + t * 0.05)
      ctx.beginPath()
      ctx.moveTo(tx - hw * 0.06, cy - hh * 0.55)
      ctx.lineTo(tx, tipY)
      ctx.lineTo(tx + hw * 0.06, cy - hh * 0.55)
      ctx.closePath()
      ctx.fill()
    }
  }

  ctx.fillStyle = hi
  ctx.globalAlpha = 0.45
  ctx.beginPath()
  pathScalpHairline(ctx, frame)
  ctx.lineTo(cx, cy - hh * 0.4)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

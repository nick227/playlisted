import type { FacePresetDef } from '../character/libraries/face'
import type { CacheCtx, FaceGender } from './faceUtil'
import { faceColors, faceHash as h, paintSquircleBody, strokeRim } from './faceUtil'

function skullStretch(skull: FacePresetDef['skull'], fem: boolean) {
  switch (skull) {
    case 'angular': return { w: fem ? 0.9 : 1.05, h: fem ? 1.0 : 0.96 }
    case 'long':    return { w: fem ? 0.88 : 0.98, h: fem ? 1.08 : 1.04 }
    default:        return { w: fem ? 0.92 : 1.02, h: fem ? 1.04 : 1.0 }
  }
}

function drawBrows(
  ctx: CacheCtx,
  hw: number,
  hh: number,
  face: FacePresetDef,
  gender: FaceGender,
  col: ReturnType<typeof faceColors>,
  seed: number,
  s: number,
) {
  const bw = face.browWeight * (gender === 'female' ? 0.88 : 1)
  const y = -hh * 0.4
  for (const side of [-1, 1] as const) {
    const bx = side * hw * 0.3
    ctx.fillStyle = col.brow
    ctx.beginPath()
    ctx.ellipse(bx, y, hw * 0.14 * bw, hh * 0.045 * bw, side * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = col.shadow
    ctx.beginPath()
    ctx.ellipse(bx + side * hw * 0.02, y + hh * 0.04, hw * 0.12 * bw, hh * 0.02, side * 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
  if (h(seed, 412) > 0.45) {
    strokeRim(ctx, col, Math.max(0.6, s * 0.01), () => {
      for (const side of [-1, 1] as const) {
        const bx = side * hw * 0.3
        ctx.beginPath()
        ctx.ellipse(bx, y, hw * 0.14 * bw, hh * 0.045 * bw, side * 0.2, 0, Math.PI * 2)
        ctx.stroke()
      }
    })
  }
}

/** Nose as two filled wedges (reference diagonal blocks, not strokes). */
function drawNoseBlocks(ctx: CacheCtx, hw: number, hh: number, col: ReturnType<typeof faceColors>, seed: number) {
  const nx = (h(seed, 79) - 0.5) * hw * 0.12
  const ny = hh * 0.02
  const nw = hw * 0.09
  const nh = hh * 0.1
  ctx.fillStyle = col.shadow
  for (const side of [-1, 1] as const) {
    ctx.beginPath()
    ctx.moveTo(nx + side * nw * 0.15, ny - nh * 0.35)
    ctx.lineTo(nx + side * nw * 0.95, ny + nh * 0.55)
    ctx.lineTo(nx + side * nw * 0.35, ny + nh * 0.45)
    ctx.closePath()
    ctx.fill()
  }
}

export function drawFaceCore(
  ctx: CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  distort: number,
  seed: number,
  gender: FaceGender,
  face: FacePresetDef,
) {
  const s = scale
  const fem = gender === 'female'
  const sk = skullStretch(face.skull, fem)
  const wStretch = sk.w + (h(seed, 1) - 0.5) * distort * 0.2
  const hStretch = sk.h + (h(seed, 2) - 0.5) * distort * 0.16
  const tiltAngle = (h(seed, 3) - 0.5) * distort * 0.1
  const col = faceColors(seed, 0, distort)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tiltAngle)

  const hw = s * 0.56 * wStretch
  const hh = s * 0.62 * hStretch

  paintSquircleBody(ctx, col, hw, hh, seed)

  ctx.fillStyle = col.blush
  for (const side of [-1, 1] as const) {
    ctx.beginPath()
    ctx.ellipse(side * hw * 0.33, hh * 0.2, hw * (0.1 + face.cheekDepth * 0.08), hh * 0.075, side * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }

  drawNoseBlocks(ctx, hw, hh, col, seed)
  drawBrows(ctx, hw, hh, face, gender, col, seed, s)
  ctx.restore()
}

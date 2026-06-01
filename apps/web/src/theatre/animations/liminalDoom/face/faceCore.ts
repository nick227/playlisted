import type { FacePresetDef } from '../character/libraries/face'
import type { CacheCtx, FaceGender } from './faceUtil'
import { faceColors, faceHash as h, strokeInk } from './faceUtil'

function skullStretch(skull: FacePresetDef['skull'], fem: boolean) {
  switch (skull) {
    case 'angular': return { w: fem ? 0.9 : 1.08, h: fem ? 1.02 : 0.98 }
    case 'long':    return { w: fem ? 0.88 : 0.98, h: fem ? 1.12 : 1.08 }
    default:        return { w: fem ? 0.92 : 1.05, h: fem ? 1.06 : 1.0 }
  }
}

function pathHead(ctx: CacheCtx, hw: number, hh: number, chin: number, jaw: number) {
  ctx.moveTo(0, -hh)
  ctx.bezierCurveTo(hw * 0.92, -hh * 0.86, hw * 1.06, -hh * 0.12, hw * jaw, hh * 0.52)
  ctx.bezierCurveTo(hw * 0.40, hh * (0.95 + chin), -hw * 0.40, hh * (0.95 + chin), -hw * jaw, hh * 0.52)
  ctx.bezierCurveTo(-hw * 1.06, -hh * 0.12, -hw * 0.92, -hh * 0.86, 0, -hh)
  ctx.closePath()
}

function drawBrows(
  ctx: CacheCtx,
  hw: number,
  hh: number,
  face: FacePresetDef,
  gender: FaceGender,
  col: ReturnType<typeof faceColors>,
  s: number,
) {
  const bw = face.browWeight * (gender === 'female' ? 0.88 : 1)
  const y = -hh * 0.41
  for (const side of [-1, 1] as const) {
    const bx = side * hw * 0.31
    const arch = -hh * 0.07 * bw
    ctx.fillStyle = col.line
    ctx.beginPath()
    ctx.moveTo(bx - hw * 0.14 * bw, y)
    ctx.quadraticCurveTo(bx, y + arch, bx + side * hw * 0.16 * bw, y + hh * 0.01)
    ctx.quadraticCurveTo(bx + side * hw * 0.08 * bw, y - hh * 0.02, bx - hw * 0.1 * bw, y - hh * 0.01)
    ctx.closePath()
    ctx.fill()
  }
  strokeInk(ctx, col, Math.max(0.8, s * 0.012), () => {
    for (const side of [-1, 1] as const) {
      const bx = side * hw * 0.31
      ctx.beginPath()
      ctx.moveTo(bx - hw * 0.14 * bw, y)
      ctx.quadraticCurveTo(bx, y - hh * 0.07 * bw, bx + side * hw * 0.16 * bw, y)
      ctx.stroke()
    }
  })
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
  const wStretch = sk.w + (h(seed, 1) - 0.5) * distort * 0.28
  const hStretch = sk.h + (h(seed, 2) - 0.5) * distort * 0.22
  const tiltAngle = (h(seed, 3) - 0.5) * distort * 0.14
  const col = faceColors(seed, 0, distort)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tiltAngle)

  const hw = s * (0.54 + h(seed, 71) * 0.05) * wStretch
  const hh = s * (0.64 + h(seed, 72) * 0.05) * hStretch
  const chin = (0.16 + h(seed, 73) * 0.16) * (0.75 + distort * 0.5)
  const jaw = (0.62 + h(seed, 74) * 0.2) * (0.92 + (1 - distort) * 0.08)

  ctx.fillStyle = col.fill
  ctx.beginPath()
  pathHead(ctx, hw, hh, chin, jaw)
  ctx.fill()

  ctx.fillStyle = col.fillHi
  ctx.beginPath()
  ctx.ellipse(hw * 0.22, -hh * 0.35, hw * 0.2, hh * 0.22, 0.2, 0, Math.PI * 2)
  ctx.fill()

  strokeInk(ctx, col, Math.max(1, s * 0.018), () => {
    ctx.beginPath()
    pathHead(ctx, hw, hh, chin, jaw)
    ctx.stroke()
  })

  ctx.fillStyle = col.shadow
  for (const side of [-1, 1] as const) {
    ctx.beginPath()
    ctx.ellipse(side * hw * 0.33, hh * 0.18, hw * 0.16, hh * 0.12, side * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = col.blush
  for (const side of [-1, 1] as const) {
    ctx.beginPath()
    ctx.ellipse(side * hw * 0.34, hh * 0.22, hw * (0.11 + face.cheekDepth * 0.1), hh * 0.08, side * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }

  const nx = (h(seed, 79) - 0.5) * hw * distort * 0.14
  const ny = -hh * 0.02
  const noseW = hw * (0.075 + h(seed, 80) * 0.04)
  const noseH = hh * (0.11 + h(seed, 81) * 0.06)
  ctx.fillStyle = col.shadow
  ctx.beginPath()
  ctx.moveTo(nx, ny - noseH * 0.4)
  ctx.quadraticCurveTo(nx + noseW * 0.5, ny + noseH * 0.12, nx + noseW * 0.15, ny + noseH)
  ctx.quadraticCurveTo(nx - noseW * 0.08, ny + noseH * 1.02, nx - noseW * 0.2, ny + noseH * 0.72)
  ctx.quadraticCurveTo(nx - noseW * 0.22, ny + noseH * 0.08, nx, ny - noseH * 0.4)
  ctx.fill()

  drawBrows(ctx, hw, hh, face, gender, col, s)
  ctx.restore()
}

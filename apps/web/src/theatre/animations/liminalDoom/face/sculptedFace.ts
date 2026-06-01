import type { EyesPresetDef } from '../character/libraries/eyes'
import type { FaceGender } from './faceUtil'
import type { MouthPresetDef } from '../character/libraries/mouth'
import { blinkOpen, saccadeJitter } from '../character/faceLive'
import type { HeadFrame } from './headFrame'
import { pathSculptedHead } from './headFrame'
import type { CacheCtx } from './faceUtil'
import { faceColors, strokeRim } from './faceUtil'

function drawEar(ctx: CacheCtx, cx: number, cy: number, hw: number, hh: number, side: -1 | 1, ink: string) {
  const ex = cx + side * hw * 0.92
  const ey = cy + hh * 0.02
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(0.8, hw * 0.04)
  ctx.beginPath()
  ctx.ellipse(ex, ey, hw * 0.12, hh * 0.14, side * 0.15, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(ex + side * hw * 0.02, ey, hw * 0.06, hh * 0.08, side * 0.15, 0, Math.PI * 2)
  ctx.stroke()
}

function drawSculptedFeatures(
  ctx: CacheCtx,
  f: HeadFrame,
  col: ReturnType<typeof faceColors>,
  gender: FaceGender,
  eyes: EyesPresetDef,
  mouth: MouthPresetDef,
  talkLevel: number,
  trackX: number,
  trackY: number,
  timeMs: number,
  seed: number,
) {
  const { cx, cy, hw, hh } = f
  const ink = col.line
  const blink = blinkOpen(timeMs, seed)
  const sac = saccadeJitter(timeMs, seed)
  const spread = hw * 0.34 * eyes.spreadMul
  const eyeY = cy - hh * 0.08
  const browY = cy - hh * 0.38
  const bw = hw * 0.16 * (gender === 'female' ? 0.85 : 1)

  ctx.fillStyle = col.brow
  for (const side of [-1, 1] as const) {
    const bx = cx + side * spread * 0.95
    ctx.beginPath()
    ctx.moveTo(bx - hw * 0.14 * bw, browY + hh * 0.02)
    ctx.quadraticCurveTo(bx, browY - hh * 0.08 * bw, bx + side * hw * 0.16 * bw, browY)
    ctx.quadraticCurveTo(bx + side * hw * 0.06, browY + hh * 0.04, bx - hw * 0.1 * bw, browY + hh * 0.02)
    ctx.closePath()
    ctx.fill()
  }

  const pr = hw * 0.055 * eyes.pupilMul
  for (const side of [-1, 1] as const) {
    const ex = cx + side * spread + (trackX + sac.x) * hw * 0.08
    const ey = eyeY + (trackY + sac.y) * hh * 0.06
    const ew = hw * 0.14 * eyes.sizeMul
    const eh = hh * 0.07 * eyes.sizeMul * blink

    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(1, hw * 0.045)
    ctx.beginPath()
    ctx.ellipse(ex, ey, ew, eh, eyes.lidTilt * 0.2, 0, Math.PI * 2)
    ctx.stroke()

    if (blink > 0.25) {
      ctx.fillStyle = col.sclera
      ctx.beginPath()
      ctx.ellipse(ex, ey, ew * 0.82, eh * 0.75, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = col.pupil
      ctx.beginPath()
      ctx.arc(ex + (trackX + sac.x) * pr, ey + (trackY + sac.y) * pr, pr, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f4f0ea'
      ctx.beginPath()
      ctx.arc(ex + pr * 0.3, ey - pr * 0.35, pr * 0.28, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const nx = cx
  const ny = cy + hh * 0.12
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(0.7, hw * 0.028)
  ctx.beginPath()
  ctx.moveTo(nx, ny - hh * 0.08)
  ctx.lineTo(nx, ny + hh * 0.06)
  ctx.lineTo(nx + hw * 0.05, ny + hh * 0.07)
  ctx.stroke()

  const mw = hw * 0.22 * mouth.widthMul
  const my = cy + hh * 0.38 + mouth.yBias * hh
  const mh = hh * (0.03 + talkLevel * 0.08) * mouth.heightMul
  ctx.beginPath()
  ctx.moveTo(cx - mw, my)
  ctx.lineTo(cx + mw, my)
  ctx.stroke()
  if (talkLevel > 0.4) {
    ctx.beginPath()
    ctx.moveTo(cx - mw * 0.7, my + mh)
    ctx.quadraticCurveTo(cx, my + mh * 1.2, cx + mw * 0.7, my + mh)
    ctx.stroke()
  }

  drawEar(ctx, cx, cy, hw, hh, -1, ink)
  drawEar(ctx, cx, cy, hw, hh, 1, ink)
}

export function drawSculptedFace(
  ctx: CacheCtx,
  frame: HeadFrame,
  seed: number,
  distort: number,
  gender: FaceGender,
  eyes: EyesPresetDef,
  mouth: MouthPresetDef,
  talkLevel: number,
  trackX: number,
  trackY: number,
  timeMs: number,
) {
  const col = faceColors(seed, talkLevel, distort)

  ctx.fillStyle = col.fill
  pathSculptedHead(ctx, frame)
  ctx.fill()

  const g = ctx.createRadialGradient(frame.cx, frame.cy - frame.hh * 0.15, 0, frame.cx, frame.cy, frame.hh)
  g.addColorStop(0, col.fillHi)
  g.addColorStop(0.7, col.fill)
  g.addColorStop(1, col.fillEdge)
  ctx.fillStyle = g
  pathSculptedHead(ctx, frame)
  ctx.fill()

  strokeRim(ctx, col, Math.max(1.1, frame.hw * 0.035), () => {
    pathSculptedHead(ctx, frame)
    ctx.stroke()
  })

  drawSculptedFeatures(ctx, frame, col, gender, eyes, mouth, talkLevel, trackX, trackY, timeMs, seed)
}

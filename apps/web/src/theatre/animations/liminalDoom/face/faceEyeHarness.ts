import type { EyesPresetDef } from '../character/libraries/eyes'
import { blinkOpen, saccadeJitter } from '../character/faceLive'
import type { CacheCtx, FaceColors } from './faceUtil'
import { faceColors, strokeInk } from './faceUtil'

type EyeShape = 'almond' | 'round' | 'hooded'

function shapeFromPreset(eyes: EyesPresetDef): EyeShape {
  if (eyes.id.includes('heavy') || eyes.id.includes('lazy')) return 'hooded'
  if (eyes.id.includes('wide') || eyes.id.includes('bright')) return 'round'
  return 'almond'
}

function pathEyeOpening(
  ctx: CacheCtx,
  cx: number,
  cy: number,
  ew: number,
  eh: number,
  tilt: number,
  shape: EyeShape,
) {
  const inner = -ew
  const outer = ew
  const top = -eh
  const bot = eh * 0.72

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tilt)

  if (shape === 'round') {
    ctx.ellipse(0, 0, ew, eh, 0, 0, Math.PI * 2)
    ctx.restore()
    return
  }

  const hood = shape === 'hooded' ? 1.18 : 1
  ctx.moveTo(inner, eh * 0.05)
  ctx.bezierCurveTo(inner * 0.35, top * hood, 0, top * 0.92, outer * 0.35, top * hood)
  ctx.bezierCurveTo(outer * 0.95, top * 0.35, outer, eh * 0.08, outer * 0.88, bot * 0.55)
  ctx.bezierCurveTo(outer * 0.35, bot, 0, bot * 0.95, inner * 0.35, bot)
  ctx.bezierCurveTo(inner * 0.95, bot * 0.55, inner, eh * 0.08, inner, eh * 0.05)
  ctx.closePath()
  ctx.restore()
}

function pathUpperLid(
  ctx: CacheCtx,
  cx: number,
  cy: number,
  ew: number,
  eh: number,
  tilt: number,
  open: number,
) {
  const drop = (1 - open) * eh * 1.1 + eh * 0.08
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tilt)
  ctx.moveTo(-ew * 1.02, eh * 0.1)
  ctx.bezierCurveTo(-ew * 0.4, -eh * 0.95 - drop, 0, -eh * 0.88 - drop, ew * 0.4, -eh * 0.95 - drop)
  ctx.bezierCurveTo(ew * 1.02, -eh * 0.5 - drop * 0.35, ew * 1.02, eh * 0.15, -ew * 1.02, eh * 0.1)
  ctx.closePath()
  ctx.restore()
}

function drawOneEye(
  ctx: CacheCtx,
  col: FaceColors,
  skinFill: string,
  cx: number,
  cy: number,
  ew: number,
  eh: number,
  tilt: number,
  shape: EyeShape,
  blink: number,
  gazeX: number,
  gazeY: number,
  pr: number,
  s: number,
) {
  if (blink < 0.18) {
    ctx.fillStyle = col.line
    ctx.beginPath()
    ctx.ellipse(cx, cy, ew, Math.max(1, s * 0.012), tilt, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  const open = blink

  ctx.fillStyle = col.shadow
  ctx.beginPath()
  ctx.ellipse(cx, cy + eh * 0.15, ew * 1.08, eh * 1.05, tilt, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = col.sclera
  ctx.beginPath()
  pathEyeOpening(ctx, cx, cy, ew, eh, tilt, shape)
  ctx.fill()

  strokeInk(ctx, col, Math.max(0.6, s * 0.01), () => {
    ctx.beginPath()
    pathEyeOpening(ctx, cx, cy, ew, eh, tilt, shape)
    ctx.stroke()
  })

  const px = cx + gazeX
  const py = cy + gazeY
  const irisR = pr * 1.15

  ctx.fillStyle = col.irisRing
  ctx.beginPath()
  ctx.ellipse(px, py, irisR * 1.08, irisR * 1.02, tilt, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = col.iris
  ctx.beginPath()
  ctx.ellipse(px, py, irisR, irisR * 0.96, tilt, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = col.pupil
  ctx.beginPath()
  ctx.arc(px, py, pr * 0.62, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  ctx.arc(px - pr * 0.42, py - pr * 0.4, pr * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.beginPath()
  ctx.arc(px + pr * 0.25, py + pr * 0.2, pr * 0.12, 0, Math.PI * 2)
  ctx.fill()

  if (open < 0.98) {
    ctx.fillStyle = skinFill
    ctx.beginPath()
    pathUpperLid(ctx, cx, cy, ew, eh, tilt, open)
    ctx.fill()
    strokeInk(ctx, col, Math.max(0.7, s * 0.012), () => {
      ctx.beginPath()
      pathUpperLid(ctx, cx, cy, ew, eh, tilt, open)
      ctx.stroke()
    })
  }

  ctx.fillStyle = col.shadow
  ctx.beginPath()
  ctx.ellipse(cx, cy + eh * 0.78, ew * 0.92, eh * 0.18, tilt, 0, Math.PI * 2)
  ctx.fill()

  strokeInk(ctx, col, Math.max(0.85, s * 0.014), () => {
    ctx.beginPath()
    ctx.moveTo(cx - ew * 0.95, cy - eh * 0.05)
    ctx.quadraticCurveTo(cx, cy - eh * 1.05, cx + ew * 0.95, cy - eh * 0.05)
    ctx.stroke()
  })
}

export function drawEyeHarness(
  ctx: CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  trackX: number,
  trackY: number,
  distort: number,
  seed: number,
  talkLevel: number,
  eyes: EyesPresetDef,
  timeMs: number,
) {
  const s = scale
  const col = faceColors(seed, talkLevel, distort)
  const blink = blinkOpen(timeMs, seed)
  const sac = saccadeJitter(timeMs, seed)
  const tx = trackX + sac.x
  const ty = trackY + sac.y
  const shape = shapeFromPreset(eyes)
  const spread = s * 0.27 * eyes.spreadMul
  const rise = s * 0.11
  const tilt = eyes.lidTilt * 0.35
  const ew = s * 0.145 * eyes.sizeMul
  const eh = s * 0.095 * eyes.sizeMul
  const pr = s * 0.046 * eyes.pupilMul

  for (const side of [-1, 1] as const) {
    const ex = cx + side * spread + tx * s * 0.07
    const ey = cy - rise + ty * s * 0.05
    const gx = tx * pr * 2
    const gy = ty * pr * 1.6
    drawOneEye(ctx, col, col.fill, ex, ey, ew, eh * blink, tilt * side, shape, blink, gx, gy, pr, s)
  }
}

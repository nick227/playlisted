import type { EyesPresetDef } from '../character/libraries/eyes'
import { blinkOpen, saccadeJitter } from '../character/faceLive'
import { pathSocketDome } from './faceShapes'
import type { CacheCtx, FaceColors } from './faceUtil'
import { faceColors, strokeRim } from './faceUtil'

type EyeStyle = 'dome' | 'round'

function styleFromPreset(eyes: EyesPresetDef): EyeStyle {
  if (eyes.id.includes('wide') || eyes.id.includes('bright')) return 'round'
  return 'dome'
}

function paintIris(
  ctx: CacheCtx,
  col: FaceColors,
  px: number,
  py: number,
  pr: number,
  tilt: number,
) {
  const g = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.35, 0, px, py, pr * 1.2)
  g.addColorStop(0, col.irisHi)
  g.addColorStop(0.55, col.iris)
  g.addColorStop(1, col.irisRing)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(px, py, pr * 1.08, pr * 1.02, tilt, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = col.pupil
  ctx.beginPath()
  ctx.arc(px, py, pr * 0.55, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.beginPath()
  ctx.arc(px - pr * 0.4, py - pr * 0.38, pr * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.arc(px + pr * 0.28, py + pr * 0.22, pr * 0.13, 0, Math.PI * 2)
  ctx.fill()
}

function drawOneEye(
  ctx: CacheCtx,
  col: FaceColors,
  cx: number,
  cy: number,
  ew: number,
  eh: number,
  tilt: number,
  style: EyeStyle,
  blink: number,
  gazeX: number,
  gazeY: number,
  pr: number,
  s: number,
) {
  if (blink < 0.18) {
    ctx.fillStyle = col.brow
    ctx.beginPath()
    ctx.ellipse(cx, cy, ew, Math.max(1.2, s * 0.014), tilt, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  const rim = 1.14
  ctx.fillStyle = col.fill
  if (style === 'round') {
    ctx.beginPath()
    ctx.ellipse(cx, cy, ew * rim, eh * rim, tilt, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = col.socket
    ctx.beginPath()
    ctx.ellipse(cx, cy, ew, eh, tilt, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    pathSocketDome(ctx, cx, cy, ew * rim, eh * rim)
    ctx.fill()
    ctx.fillStyle = col.socket
    ctx.beginPath()
    pathSocketDome(ctx, cx, cy, ew, eh)
    ctx.fill()
  }

  ctx.fillStyle = col.sclera
  if (style === 'round') {
    ctx.beginPath()
    ctx.ellipse(cx, cy, ew * 0.88, eh * 0.88, tilt, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    pathSocketDome(ctx, cx, cy, ew * 0.9, eh * 0.92)
    ctx.fill()
  }

  const px = cx + gazeX
  const py = cy + gazeY
  paintIris(ctx, col, px, py, pr, tilt)

  ctx.fillStyle = col.shadow
  ctx.beginPath()
  ctx.ellipse(cx, cy + eh * 0.92, ew * 1.05, eh * 0.32, tilt, 0, Math.PI * 2)
  ctx.fill()

  const lidDrop = (1 - blink) * eh * 0.65
  if (lidDrop > 0.5) {
    ctx.fillStyle = col.fill
    if (style === 'round') {
      ctx.beginPath()
      ctx.ellipse(cx, cy - eh * 0.35, ew * 1.05, lidDrop, tilt, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      pathSocketDome(ctx, cx, cy - eh * 0.08, ew * 1.02, eh * 0.5 + lidDrop * 0.5)
      ctx.fill()
    }
  }

  strokeRim(ctx, col, Math.max(0.65, s * 0.011), () => {
    ctx.beginPath()
    if (style === 'round') {
      ctx.ellipse(cx, cy, ew * rim, eh * rim, tilt, 0, Math.PI * 2)
    } else {
      pathSocketDome(ctx, cx, cy, ew * rim, eh * rim)
    }
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
  const style = styleFromPreset(eyes)
  const spread = s * 0.26 * eyes.spreadMul
  const rise = s * 0.1
  const tilt = eyes.lidTilt * 0.25
  const ew = s * 0.14 * eyes.sizeMul
  const eh = s * 0.1 * eyes.sizeMul
  const pr = s * 0.044 * eyes.pupilMul

  for (const side of [-1, 1] as const) {
    const ex = cx + side * spread + tx * s * 0.06
    const ey = cy - rise + ty * s * 0.05
    drawOneEye(
      ctx, col, ex, ey, ew, eh * blink, tilt * side, style, blink,
      tx * pr * 1.9, ty * pr * 1.5, pr, s,
    )
  }
}

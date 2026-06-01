import type { MouthPresetDef } from '../character/libraries/mouth'
import type { CacheCtx, FaceColors } from './faceUtil'
import { faceColors, faceHash as h, strokeInk } from './faceUtil'

type LipPose = 'neutral' | 'smile' | 'pursed' | 'open'

function poseFromPreset(mouth: MouthPresetDef, talk: number): LipPose {
  if (talk > 0.55) return 'open'
  if (mouth.id.includes('pursed')) return 'pursed'
  if (mouth.id.includes('wide')) return 'smile'
  return 'neutral'
}

function pathUpperLip(
  ctx: CacheCtx,
  mx: number,
  my: number,
  mw: number,
  mh: number,
  arch: number,
) {
  const cupid = mh * 0.35
  ctx.moveTo(mx - mw, my)
  ctx.bezierCurveTo(mx - mw * 0.55, my - cupid - arch, mx - mw * 0.12, my - cupid * 0.5, mx, my - cupid * 0.35)
  ctx.bezierCurveTo(mx + mw * 0.12, my - cupid * 0.5, mx + mw * 0.55, my - cupid - arch, mx + mw, my)
}

function pathLowerLip(
  ctx: CacheCtx,
  mx: number,
  my: number,
  mw: number,
  mh: number,
  smile: number,
) {
  ctx.moveTo(mx - mw * 0.98, my)
  ctx.bezierCurveTo(mx - mw * 0.45, my + mh * (0.95 + smile), mx, my + mh * (1.15 + smile * 0.3), mx + mw * 0.45, my + mh * (0.95 + smile))
  ctx.bezierCurveTo(mx + mw * 0.98, my + mh * 0.15, mx + mw * 0.98, my, mx - mw * 0.98, my)
}

function drawTeeth(ctx: CacheCtx, col: FaceColors, mx: number, my: number, mw: number, mh: number, s: number) {
  const th = Math.min(mh * 0.55, s * 0.05)
  const tw = mw * 1.05
  const ty = my + mh * 0.08
  ctx.fillStyle = col.tooth
  ctx.beginPath()
  ctx.roundRect(mx - tw * 0.5, ty, tw, th, 1.5)
  ctx.fill()
  ctx.strokeStyle = col.line
  ctx.lineWidth = Math.max(0.4, s * 0.006)
  for (let i = 1; i < 5; i++) {
    const tx = mx - tw * 0.5 + (tw / 5) * i
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx, ty + th)
    ctx.stroke()
  }
}

export function drawMouthHarness(
  ctx: CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  talkLevel: number,
  distort: number,
  seed: number,
  mouth: MouthPresetDef,
) {
  const s = scale
  const col = faceColors(seed, talkLevel, distort)
  const mw = s * 0.2 * mouth.widthMul
  const baseH = s * 0.035 * mouth.heightMul
  const mh = baseH + talkLevel * s * 0.14 * mouth.heightMul
  const mx = cx + (h(seed, 13) - 0.5) * s * 0.04
  const my = cy + s * (0.23 + mouth.yBias)
  const smile = (h(seed, 15) - 0.5) * 0.25 + talkLevel * 0.12
  const pose = poseFromPreset(mouth, talkLevel)
  const arch = pose === 'smile' ? mh * 0.35 : pose === 'pursed' ? mh * 0.55 : mh * 0.2

  if (pose === 'open' && talkLevel > 0.35) {
    ctx.fillStyle = col.mouthInner
    ctx.beginPath()
    pathUpperLip(ctx, mx, my, mw * 0.92, mh, arch * 0.5)
    pathLowerLip(ctx, mx, my + mh * 0.12, mw * 0.88, mh * 1.1, smile)
    ctx.fill()
    drawTeeth(ctx, col, mx, my, mw, mh, s)
    ctx.fillStyle = `hsla(${h(seed, 209) * 360} 55% 45% 0.35)`
    ctx.beginPath()
    ctx.ellipse(mx, my + mh * 0.55, mw * 0.38, mh * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = col.lip
  ctx.beginPath()
  pathUpperLip(ctx, mx, my, mw, mh, arch)
  pathLowerLip(ctx, mx, my + (pose === 'pursed' ? mh * 0.08 : mh * 0.04), mw * (pose === 'pursed' ? 0.75 : 0.95), mh, smile)
  ctx.fill()

  ctx.fillStyle = col.lipHi
  ctx.beginPath()
  ctx.ellipse(mx, my + mh * (pose === 'pursed' ? 0.35 : 0.5), mw * 0.42, mh * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()

  strokeInk(ctx, col, Math.max(0.75, s * 0.011), () => {
    ctx.beginPath()
    pathUpperLip(ctx, mx, my, mw, mh, arch)
    ctx.stroke()
    ctx.beginPath()
    pathLowerLip(ctx, mx, my + mh * 0.04, mw * 0.95, mh, smile)
    ctx.stroke()
  })
}

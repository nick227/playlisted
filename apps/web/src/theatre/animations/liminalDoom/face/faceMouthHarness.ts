import type { MouthPresetDef } from '../character/libraries/mouth'
import { drawChicletTeeth, pathMouthBean, pathSmileSlot } from './faceShapes'
import type { CacheCtx } from './faceUtil'
import { faceColors, faceHash as h, strokeRim } from './faceUtil'

type LipPose = 'neutral' | 'smile' | 'pursed' | 'open'

function poseFromPreset(mouth: MouthPresetDef, talk: number): LipPose {
  if (talk > 0.5) return 'open'
  if (mouth.id.includes('pursed')) return 'pursed'
  if (mouth.id.includes('wide')) return 'smile'
  return 'neutral'
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
  const mw = s * 0.19 * mouth.widthMul
  const baseH = s * 0.032 * mouth.heightMul
  const mh = baseH + talkLevel * s * 0.13 * mouth.heightMul
  const mx = cx + (h(seed, 13) - 0.5) * s * 0.03
  const my = cy + s * (0.22 + mouth.yBias)
  const smile = (h(seed, 15) - 0.5) * 0.2 + talkLevel * 0.1
  const pose = poseFromPreset(mouth, talkLevel)
  const open = pose === 'open' && talkLevel > 0.3

  const lipPad = s * 0.018
  ctx.fillStyle = col.fill
  if (open) {
    ctx.beginPath()
    pathMouthBean(ctx, mx, my, mw + lipPad, mh + lipPad, smile)
    ctx.fill()
  } else {
    ctx.beginPath()
    pathSmileSlot(ctx, mx, my + mh * 0.15, mw * (pose === 'pursed' ? 0.72 : 0.92), mh * 0.55, smile)
    ctx.fill()
  }

  if (open) {
    ctx.fillStyle = col.mouthInner
    ctx.beginPath()
    pathMouthBean(ctx, mx, my + mh * 0.06, mw * 0.92, mh * 0.95, smile)
    ctx.fill()

    const toothY = my + mh * 0.1
    const toothCount = mouth.id.includes('wide') ? 5 : 4
    drawChicletTeeth(ctx, mx, toothY, mw * 0.88, mh * 0.5, col.tooth, col.shadow, toothCount)

    ctx.fillStyle = col.tongue
    ctx.beginPath()
    ctx.ellipse(mx, my + mh * 0.62, mw * 0.38, mh * 0.38, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = col.lipHi
    ctx.beginPath()
    ctx.ellipse(mx, my + mh * 0.58, mw * 0.12, mh * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = col.shadow
    ctx.beginPath()
    pathSmileSlot(ctx, mx, my + mh * 0.18, mw * 0.85, mh * 0.35, smile)
    ctx.fill()
    ctx.fillStyle = col.lip
    ctx.beginPath()
    pathSmileSlot(ctx, mx, my + mh * 0.14, mw * 0.8, mh * 0.28, smile)
    ctx.fill()
    ctx.fillStyle = col.lipHi
    ctx.beginPath()
    ctx.ellipse(mx, my + mh * 0.28, mw * 0.35, mh * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  strokeRim(ctx, col, Math.max(0.55, s * 0.009), () => {
    ctx.beginPath()
    if (open) pathMouthBean(ctx, mx, my, mw + lipPad * 0.5, mh + lipPad * 0.5, smile)
    else pathSmileSlot(ctx, mx, my + mh * 0.14, mw * 0.85, mh * 0.4, smile)
    ctx.stroke()
  })
}

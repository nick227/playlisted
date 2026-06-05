import type { EyesPresetDef } from '../character/libraries/eyes'
import { EYES_PRESETS } from '../character/libraries/eyes'
import type { FacePresetDef } from '../character/libraries/face'
import { FACE_PRESETS, isRubberFace, isSculptedFace, rubberExprFromSeed } from '../character/libraries/face'
import type { MouthPresetDef } from '../character/libraries/mouth'
import { MOUTH_PRESETS } from '../character/libraries/mouth'
import { drawFaceCore } from './faceCore'
import { drawEyeHarness } from './faceEyeHarness'
import { computeHeadFrame } from './headFrame'
import { drawSculptedFace } from './sculptedFace'
import { drawSculptedHair } from './sculptedHair'
import { drawMouthHarness } from './faceMouthHarness'
import { drawRubberHoseFace } from './rubberHoseDraw'
import { faceColors, faceHash as h } from './faceUtil'
import type { HairStyle } from '../body/fashion'
import { resolveDevicePixelRatio } from '../../../runtime/resolveDpr'
import { clamp } from '../core/math'
import { FACE_CACHE_MAX_DISPLAY_D, FaceCacheEntry } from './cache'
import type { FaceConfig } from './types'

function drawFragments(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  fragmentLevel: number,
  seed: number,
) {
  const count = Math.floor(fragmentLevel * 14)
  const col = faceColors(seed, 0, 0.6)
  ctx.fillStyle = col.fill
  for (let i = 0; i < count; i++) {
    const angle = h(seed, 20 + i) * Math.PI * 2
    const dist = h(seed, 30 + i) * scale * fragmentLevel * 0.8
    const fw = h(seed, 40 + i) * scale * 0.18 + scale * 0.04
    const fh = h(seed, 50 + i) * scale * 0.1 + scale * 0.02
    const fx = cx + Math.cos(angle) * dist
    const fy = cy + Math.sin(angle) * dist
    ctx.save()
    ctx.translate(fx, fy)
    ctx.rotate(angle)
    ctx.globalAlpha = Math.max(0, (1 - fragmentLevel) * 0.7)
    ctx.fillRect(-fw / 2, -fh / 2, fw, fh)
    ctx.restore()
  }
}

export function drawFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  config: FaceConfig,
  cache?: FaceCacheEntry,
  facePreset?: FacePresetDef,
  eyesPreset?: EyesPresetDef,
  mouthPreset?: MouthPresetDef,
  hairStyle?: HairStyle,
  hairBase?: string,
  hairHi?: string,
  timeMs = 0,
): void {
  const { state, talkLevel, trackX, trackY, distort, dissolveAlpha, fragmentLevel, seed, gender } = config
  const g = gender ?? 'male'
  const face = facePreset ?? FACE_PRESETS['face.round']
  const eyes = eyesPreset ?? EYES_PRESETS['eyes.average']
  const mouth = mouthPreset ?? MOUTH_PRESETS['mouth.average']

  const baseAlpha = state === 'dissolving' ? clamp(dissolveAlpha, 0, 1) : 1
  if (baseAlpha <= 0.01) return

  ctx.save()
  ctx.globalAlpha = baseAlpha

  const sculpted = isSculptedFace(face)
  const frame = computeHeadFrame(x, y, scale, face.skull, g === 'female', seed, distort)

  if (sculpted) {
    if (hairStyle && hairBase && hairHi) {
      drawSculptedHair(ctx, frame, hairStyle, hairBase, hairHi)
    }
    drawSculptedFace(ctx, frame, seed, distort, g, eyes, mouth, talkLevel, trackX, trackY, timeMs)
  } else {
    const displayD = scale * 2.15
    const useBitmapCache = cache && displayD <= FACE_CACHE_MAX_DISPLAY_D

    if (useBitmapCache && cache) {
      const bakePx = Math.ceil(displayD * resolveDevicePixelRatio())
      cache.ensureBakePixels(bakePx)
      if (cache.needsRebake(distort, seed, g, face.id)) {
        const size = cache.canvas.width
        const half = size / 2
        cache.ctx.clearRect(0, 0, size, size)
        drawFaceCore(cache.ctx, half, half, size * 0.46, distort, seed, g, face)
        cache.markClean(distort, seed, g, face.id)
      }
      const destX = x - scale * 1.05
      const destY = y - scale * 1.05
      const prevSmooth = ctx.imageSmoothingEnabled
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(cache.canvas as CanvasImageSource, destX, destY, displayD, displayD)
      ctx.imageSmoothingEnabled = prevSmooth
    } else {
      drawFaceCore(ctx, x, y, scale, distort, seed, g, face)
    }

    if (isRubberFace(face)) {
      const expr = face.rubberExpr ?? rubberExprFromSeed(seed)
      drawRubberHoseFace(ctx, x, y, scale, expr, talkLevel)
    } else {
      drawEyeHarness(ctx, x, y, scale, trackX, trackY, distort, seed, talkLevel, eyes, timeMs)
      drawMouthHarness(ctx, x, y, scale, talkLevel, distort, seed, mouth)
    }
  }

  if (state === 'dissolving' && fragmentLevel > 0.05) {
    ctx.globalAlpha = 1
    drawFragments(ctx, x, y, scale, fragmentLevel, seed)
  }

  ctx.restore()
}

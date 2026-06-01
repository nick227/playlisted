import type { EyesPresetDef } from './character/libraries/eyes'
import { EYES_PRESETS } from './character/libraries/eyes'
import type { FacePresetDef } from './character/libraries/face'
import { FACE_PRESETS, isRubberFace, rubberExprFromSeed } from './character/libraries/face'
import type { MouthPresetDef } from './character/libraries/mouth'
import { MOUTH_PRESETS } from './character/libraries/mouth'
import { drawFaceCore } from './face/faceCore'
import { drawEyeHarness } from './face/faceEyeHarness'
import { drawStudioHair } from './face/faceHair'
import { drawMouthHarness } from './face/faceMouthHarness'
import { drawRubberHoseFace } from './face/rubberHoseDraw'
import type { CacheCtx, FaceGender } from './face/faceUtil'
import { faceColors, faceHash as h } from './face/faceUtil'
import type { HairStyle } from './fashion'
import { resolveDevicePixelRatio } from '../../resolveDpr'
import { clamp, lerp } from './types'

export type { FaceGender }

/** Max baked head diameter in backing-store pixels (memory cap per cast member). */
const FACE_CACHE_MAX_PX = 320
/** Below this on-screen diameter we bake to an offscreen bitmap; above, draw vector at full size. */
const FACE_CACHE_MAX_DISPLAY_D = 168

export type FaceState = 'idle' | 'watching' | 'talking' | 'dissolving'

export type FaceConfig = {
  state: FaceState
  gender?: FaceGender
  talkLevel: number
  trackX: number
  trackY: number
  distort: number
  dissolveAlpha: number
  fragmentLevel: number
  seed: number
}

export const DEFAULT_FACE_CONFIG: FaceConfig = {
  state: 'idle',
  talkLevel: 0,
  trackX: 0,
  trackY: 0,
  distort: 0,
  dissolveAlpha: 1,
  fragmentLevel: 0,
  seed: 0,
}

export class FaceCacheEntry {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement
  readonly ctx: CacheCtx
  dirty = true
  private lastDistort = -1
  private lastSeed = -1
  private lastGender: FaceGender = 'male'
  private lastFaceId = ''

  constructor(size: number) {
    if (typeof OffscreenCanvas !== 'undefined') {
      const oc = new OffscreenCanvas(size, size)
      this.canvas = oc
      this.ctx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D
    } else {
      const el = document.createElement('canvas')
      el.width = size
      el.height = size
      this.canvas = el
      this.ctx = el.getContext('2d') as CanvasRenderingContext2D
    }
  }

  needsRebake(distort: number, seed: number, gender: FaceGender, faceId: string): boolean {
    return this.dirty
      || Math.abs(distort - this.lastDistort) > 0.04
      || seed !== this.lastSeed
      || gender !== this.lastGender
      || faceId !== this.lastFaceId
  }

  markClean(distort: number, seed: number, gender: FaceGender, faceId: string) {
    this.dirty = false
    this.lastDistort = distort
    this.lastSeed = seed
    this.lastGender = gender
    this.lastFaceId = faceId
  }

  markDirty() {
    this.dirty = true
  }

  ensureBakePixels(backingStoreDiameter: number) {
    const size = Math.min(FACE_CACHE_MAX_PX, Math.max(64, Math.ceil(backingStoreDiameter)))
    if (this.canvas.width === size) return
    this.canvas.width = size
    this.canvas.height = size
    this.dirty = true
  }
}

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

  if (hairStyle && hairBase && hairHi) {
    drawStudioHair(ctx, x, y, scale, seed, hairStyle, hairBase, hairHi)
  }

  if (isRubberFace(face)) {
    const expr = face.rubberExpr ?? rubberExprFromSeed(seed)
    drawRubberHoseFace(ctx, x, y, scale, expr, talkLevel)
  } else {
    drawEyeHarness(ctx, x, y, scale, trackX, trackY, distort, seed, talkLevel, eyes, timeMs)
    drawMouthHarness(ctx, x, y, scale, talkLevel, distort, seed, mouth)
  }

  if (state === 'dissolving' && fragmentLevel > 0.05) {
    ctx.globalAlpha = 1
    drawFragments(ctx, x, y, scale, fragmentLevel, seed)
  }

  ctx.restore()
}

export function idleBreath(timeMs: number, seed: number): number {
  const period = 3200 + h(seed, 99) * 1200
  return 1 + Math.sin((timeMs / period) * Math.PI * 2) * 0.04
}

export function watchingGaze(timeMs: number, seed: number): { trackX: number; trackY: number } {
  const tx = Math.sin(timeMs / (4100 + h(seed, 60) * 2000)) * 0.6
  const ty = Math.sin(timeMs / (5300 + h(seed, 61) * 1800)) * 0.35
  return { trackX: tx, trackY: ty }
}

export function tickDissolve(
  alpha: number,
  fragLevel: number,
  dtMs: number,
  highs: number,
): { dissolveAlpha: number; fragmentLevel: number } {
  const rate = (0.0004 + highs * 0.0012) * dtMs
  const newAlpha = clamp(alpha - rate, 0, 1)
  const newFrag = clamp(lerp(fragLevel, 1 - newAlpha, 0.08), 0, 1)
  return { dissolveAlpha: newAlpha, fragmentLevel: newFrag }
}

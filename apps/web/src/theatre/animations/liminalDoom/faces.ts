import type { EyesPresetDef } from './character/libraries/eyes'
import { EYES_PRESETS } from './character/libraries/eyes'
import type { FacePresetDef } from './character/libraries/face'
import { FACE_PRESETS } from './character/libraries/face'
import type { MouthPresetDef } from './character/libraries/mouth'
import { MOUTH_PRESETS } from './character/libraries/mouth'
import { palette } from './palette'
import { clamp, lerp } from './types'

export type FaceState = 'idle' | 'watching' | 'talking' | 'dissolving'

export type FaceGender = 'male' | 'female'

export type FaceConfig = {
  state: FaceState
  gender?: FaceGender
  /** 0–1 mouth openness, driven by mids */
  talkLevel: number
  /** -1–1 horizontal gaze offset */
  trackX: number
  /** -1–1 vertical gaze offset */
  trackY: number
  /** 0–1 wrong-proportion distortion */
  distort: number
  /** 0–1 overall opacity for dissolve */
  dissolveAlpha: number
  /** 0–1 fragment scatter for dissolving state */
  fragmentLevel: number
  /** seed for deterministic shape variation */
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

// ── Offscreen cache ───────────────────────────────────────────────────────────

type CacheCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

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
}

// ── Deterministic noise helper ────────────────────────────────────────────────

function h(seed: number, salt: number): number {
  let v = (seed ^ ((salt + 0x9e3779b9) | 0)) >>> 0
  v ^= v >>> 16
  v = Math.imul(v, 0x7feb352d) >>> 0
  v ^= v >>> 15
  v = Math.imul(v, 0x846ca68b) >>> 0
  v ^= v >>> 16
  return (v >>> 0) / 0xffffffff
}

// ── Core procedural drawing ───────────────────────────────────────────────────

function skullStretch(skull: FacePresetDef['skull'], fem: boolean) {
  switch (skull) {
    case 'angular': return { w: fem ? 0.9 : 1.08, h: fem ? 1.02 : 0.98 }
    case 'long':    return { w: fem ? 0.88 : 0.98, h: fem ? 1.12 : 1.08 }
    default:        return { w: fem ? 0.92 : 1.05, h: fem ? 1.06 : 1.0 }
  }
}

function drawFaceCore(
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
  const wStretch = sk.w + (h(seed, 1) - 0.5) * distort * 0.35
  const hStretch = sk.h + (h(seed, 2) - 0.5) * distort * 0.28
  const tiltAngle = (h(seed, 3) - 0.5) * distort * 0.18

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tiltAngle)

  // Head silhouette
  ctx.fillStyle = palette.faceFill
  ctx.strokeStyle = palette.faceLine
  ctx.lineWidth = Math.max(1, s * 0.04)
  ctx.beginPath()
  // Not a perfect ellipse — slightly angular jaw via bezier
  const hw = s * 0.52 * wStretch
  const hh = s * 0.62 * hStretch
  ctx.moveTo(0, -hh)
  ctx.bezierCurveTo( hw * 0.9, -hh * 0.85,  hw * 1.05, -hh * 0.1,  hw * 0.7,  hh * 0.55)
  ctx.bezierCurveTo( hw * 0.4,  hh,          -hw * 0.4,  hh,         -hw * 0.7,  hh * 0.55)
  ctx.bezierCurveTo(-hw * 1.05, -hh * 0.1,  -hw * 0.9, -hh * 0.85,  0,        -hh)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = `rgba(60,45,70,${0.12 + face.cheekDepth})`
  ctx.beginPath()
  ctx.moveTo(hw * 0.15, hh * 0.05)
  ctx.lineTo(hw * 0.35, hh * 0.35)
  ctx.lineTo(hw * 0.1, hh * 0.4)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(80,60,90,0.25)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < face.scanLines; i++) {
    const ly = -hh * 0.7 + (i / 3) * hh * 1.3
    const xoff = (h(seed, 10 + i) - 0.5) * hw * 0.3
    ctx.beginPath()
    ctx.moveTo(-hw + xoff, ly)
    ctx.lineTo( hw + xoff, ly)
    ctx.stroke()
  }

  ctx.restore()
}

function drawFaceEyes(
  ctx: CanvasRenderingContext2D | CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  trackX: number,
  trackY: number,
  distort: number,
  seed: number,
  talkLevel: number,
  eyes: EyesPresetDef,
) {
  const s = scale
  const eyeSpread = s * (0.26 + (h(seed, 5) - 0.5) * distort * 0.12) * eyes.spreadMul
  const eyeRise = s * (0.10 + (h(seed, 6) - 0.5) * distort * 0.08)
  const eyeSkew = (h(seed, 7) - 0.5) * distort * s * 0.10

  for (let side = -1; side <= 1; side += 2) {
    const ex = cx + side * eyeSpread + trackX * s * 0.1
    const ey = cy - eyeRise + (side === 1 ? eyeSkew : 0) + trackY * s * 0.07

    const ew = s * (0.13 + h(seed, 8 + side) * 0.03) * eyes.sizeMul
    const eh = s * (0.065 + talkLevel * 0.01) * eyes.sizeMul
    ctx.fillStyle = palette.strobe
    ctx.beginPath()
    ctx.ellipse(ex, ey, ew, eh, eyes.lidTilt + (h(seed, 9) - 0.5) * 0.25, 0, Math.PI * 2)
    ctx.fill()

    const pr = s * (0.04 + talkLevel * 0.015) * eyes.pupilMul
    ctx.fillStyle = palette.figure
    ctx.beginPath()
    ctx.arc(ex + trackX * pr * 2.5, ey + trackY * pr * 2, pr, 0, Math.PI * 2)
    ctx.fill()

    // Specular catch
    ctx.fillStyle = 'rgba(240,230,255,0.55)'
    ctx.beginPath()
    ctx.arc(ex + pr * 0.5, ey - pr * 0.4, pr * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFaceMouth(
  ctx: CanvasRenderingContext2D | CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  talkLevel: number,
  distort: number,
  seed: number,
  mouth: MouthPresetDef,
) {
  const s = scale
  const mw = s * (0.22 + (h(seed, 12) - 0.5) * distort * 0.1) * mouth.widthMul
  const mh = s * (0.04 + talkLevel * 0.16) * mouth.heightMul
  const mx = cx + (h(seed, 13) - 0.5) * distort * s * 0.08
  const my = cy + s * (0.24 + (h(seed, 14) - 0.5) * distort * 0.06 + mouth.yBias)

  ctx.fillStyle = palette.magenta
  ctx.beginPath()
  ctx.ellipse(mx, my, mw, Math.max(1, mh), (h(seed, 15) - 0.5) * 0.15, 0, Math.PI * 2)
  ctx.fill()

  // Teeth sliver when talking hard
  if (talkLevel > 0.4) {
    ctx.fillStyle = 'rgba(220,200,210,0.6)'
    ctx.fillRect(mx - mw * 0.55, my - mh * 0.3, mw * 1.1, Math.min(mh * 0.45, s * 0.04))
  }
}

// ── Fragment scatter for dissolve ─────────────────────────────────────────────

function drawFragments(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  fragmentLevel: number,
  seed: number,
) {
  const count = Math.floor(fragmentLevel * 14)
  ctx.fillStyle = palette.faceFill
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

// ── Public draw function ──────────────────────────────────────────────────────

/**
 * Draw a procedural face at (x, y) with given scale and config.
 * Pass a `FaceCacheEntry` to use offscreen bitmap caching for the stable head silhouette.
 */
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

  if (cache) {
    if (cache.needsRebake(distort, seed, g, face.id)) {
      const size = cache.canvas.width
      const half = size / 2
      cache.ctx.clearRect(0, 0, size, size)
      drawFaceCore(cache.ctx, half, half, size * 0.46, distort, seed, g, face)
      cache.markClean(distort, seed, g, face.id)
    }
    const d = scale * 2.15
    ctx.drawImage(cache.canvas as CanvasImageSource, x - scale * 1.05, y - scale * 1.05, d, d)
  } else {
    drawFaceCore(ctx, x, y, scale, distort, seed, g, face)
  }

  drawFaceEyes(ctx, x, y, scale, trackX, trackY, distort, seed, talkLevel, eyes)
  drawFaceMouth(ctx, x, y, scale, talkLevel, distort, seed, mouth)

  // Fragment scatter on dissolve
  if (state === 'dissolving' && fragmentLevel > 0.05) {
    ctx.globalAlpha = 1
    drawFragments(ctx, x, y, scale, fragmentLevel, seed)
  }

  ctx.restore()
}

// ── Breathing idle curve ──────────────────────────────────────────────────────

/** Returns an idle scale pulse [0.96, 1.04] on a breathing sine. */
export function idleBreath(timeMs: number, seed: number): number {
  const period = 3200 + h(seed, 99) * 1200
  return 1 + Math.sin((timeMs / period) * Math.PI * 2) * 0.04
}

/** Returns eye-track values for a watching face that drifts toward screen center. */
export function watchingGaze(timeMs: number, seed: number): { trackX: number; trackY: number } {
  const tx = Math.sin(timeMs / (4100 + h(seed, 60) * 2000)) * 0.6
  const ty = Math.sin(timeMs / (5300 + h(seed, 61) * 1800)) * 0.35
  return { trackX: tx, trackY: ty }
}

/** Advance dissolveAlpha and fragmentLevel from a tick delta. Returns updated values. */
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

import type { EyesPresetDef } from './character/libraries/eyes'
import { EYES_PRESETS } from './character/libraries/eyes'
import type { FacePresetDef } from './character/libraries/face'
import { FACE_PRESETS } from './character/libraries/face'
import type { MouthPresetDef } from './character/libraries/mouth'
import { MOUTH_PRESETS } from './character/libraries/mouth'
import { blinkOpen, saccadeJitter } from './character/faceLive'
import type { HairStyle } from './fashion'
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

type FaceColors = {
  fill: string
  line: string
  shadow: string
  blush: string
  sclera: string
  iris: string
  pupil: string
  lip: string
  tooth: string
}

function faceColors(seed: number, talk: number, distort: number): FaceColors {
  // Full-spectrum studio palette: not skin, more like printed inks and gels.
  const hue = (h(seed, 201) * 360 + h(seed, 202) * distort * 90) % 360
  const sat = 55 + h(seed, 203) * 35
  const lit = 42 + h(seed, 204) * 18
  const shadowHue = (hue + 220 + h(seed, 205) * 40) % 360
  const irisHue = (hue + 140 + h(seed, 206) * 180) % 360
  const blushHue = (hue + 30 + h(seed, 207) * 80) % 360
  const lipHue = (hue + 320 + h(seed, 208) * 80) % 360

  const talkBoost = clamp(talk, 0, 1)
  return {
    fill: `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${lit.toFixed(1)}%)`,
    line: `hsl(${shadowHue.toFixed(1)} 35% 18%)`,
    // Keep shadows/blush subtle so faces read "designed", not bruised.
    shadow: `hsla(${shadowHue.toFixed(1)} 55% 18% ${0.10 + distort * 0.10})`,
    blush: `hsla(${blushHue.toFixed(1)} 70% 58% ${0.05 + distort * 0.06})`,
    sclera: `hsla(${(hue + 40).toFixed(1)} 25% 92% ${0.92})`,
    iris: `hsla(${irisHue.toFixed(1)} 70% 55% ${0.9})`,
    pupil: `hsla(${(shadowHue + 10).toFixed(1)} 30% 8% ${0.95})`,
    lip: `hsla(${lipHue.toFixed(1)} 70% ${40 + talkBoost * 18}% ${0.85})`,
    tooth: `hsla(${(hue + 20).toFixed(1)} 20% 92% ${0.75})`,
  }
}

/** Upper hair mass with a flat hairline at `hairlineY` (no rounded oval under the face). */
function pathHairCap(
  ctx: CanvasRenderingContext2D | CacheCtx,
  cx: number,
  capCy: number,
  w: number,
  h: number,
  hairlineY: number,
) {
  ctx.beginPath()
  ctx.moveTo(cx - w, hairlineY)
  ctx.ellipse(cx, capCy, w, h, 0, Math.PI, 0)
  ctx.closePath()
}

function drawHair(
  ctx: CanvasRenderingContext2D | CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  seed: number,
  style: HairStyle,
  base: string,
  hi: string,
) {
  const s = scale
  const w = s * 0.62
  const h0 = s * 0.48
  const topY = cy - s * 0.62
  const hairlineY = cy - s * 0.08
  const swing = (h(seed, 260) - 0.5) * 0.14

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(swing)
  ctx.translate(-cx, -cy)

  ctx.fillStyle = base

  if (style === 'buzz') {
    pathHairCap(ctx, cx, topY + h0 * 0.42, w * 0.92, h0 * 0.52, hairlineY)
    ctx.fill()
    ctx.globalAlpha *= 0.7
    ctx.fillStyle = hi
    pathHairCap(ctx, cx - w * 0.08, topY + h0 * 0.38, w * 0.55, h0 * 0.32, hairlineY)
    ctx.fill()
  } else if (style === 'crop') {
    pathHairCap(ctx, cx, topY + h0 * 0.48, w, h0 * 0.72, hairlineY)
    ctx.fill()
    ctx.fillStyle = hi
    ctx.globalAlpha *= 0.75
    pathHairCap(ctx, cx - w * 0.12, topY + h0 * 0.42, w * 0.58, h0 * 0.34, hairlineY)
    ctx.fill()
  } else if (style === 'spiky' || style === 'mohawk') {
    const spikes = style === 'mohawk' ? 6 : 9
    for (let i = 0; i < spikes; i++) {
      const t = spikes <= 1 ? 0.5 : i / (spikes - 1)
      const px = cx - w + t * w * 2
      const len = h0 * (0.65 + h(seed, 270 + i) * 0.85)
      ctx.beginPath()
      ctx.moveTo(px - w * 0.12, topY + h0 * 0.95)
      ctx.lineTo(px, topY + h0 * 0.95 - len)
      ctx.lineTo(px + w * 0.12, topY + h0 * 0.95)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha *= 0.65
    ctx.fillStyle = hi
    pathHairCap(ctx, cx, topY + h0 * 0.48, w * 0.55, h0 * 0.3, hairlineY)
    ctx.fill()
  } else if (style === 'bob') {
    pathHairCap(ctx, cx, topY + h0 * 0.55, w * 1.05, h0 * 0.95, hairlineY)
    ctx.fill()
    ctx.fillRect(cx - w * 1.08, hairlineY, w * 0.35, h0 * 1.15)
    ctx.fillRect(cx + w * 0.73, hairlineY, w * 0.35, h0 * 1.15)
    ctx.globalAlpha *= 0.75
    ctx.fillStyle = hi
    pathHairCap(ctx, cx - w * 0.08, topY + h0 * 0.5, w * 0.62, h0 * 0.42, hairlineY)
    ctx.fill()
  } else if (style === 'long' || style === 'bun') {
    pathHairCap(ctx, cx, topY + h0 * 0.52, w, h0 * 0.88, hairlineY)
    ctx.fill()
    ctx.fillRect(cx - w * 0.65, hairlineY, w * 0.45, h0 * 2.2)
    ctx.fillRect(cx + w * 0.2, hairlineY, w * 0.45, h0 * 2.2)
    if (style === 'bun') {
      ctx.beginPath()
      ctx.ellipse(cx + w * 0.4, topY + h0 * 0.25, w * 0.35, h0 * 0.35, 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha *= 0.75
    ctx.fillStyle = hi
    pathHairCap(ctx, cx - w * 0.1, topY + h0 * 0.48, w * 0.52, h0 * 0.36, hairlineY)
    ctx.fill()
  }

  ctx.restore()
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
  const col = faceColors(seed, 0, distort)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tiltAngle)

  // Head silhouette
  ctx.fillStyle = col.fill
  ctx.beginPath()
  // Caricature skull: crown, cheeks, jaw, and chin are deliberate curves.
  const hw = s * (0.54 + h(seed, 71) * 0.06) * wStretch
  const hh = s * (0.64 + h(seed, 72) * 0.06) * hStretch
  const chin = (0.16 + h(seed, 73) * 0.18) * (0.7 + distort * 0.6)
  const jaw = (0.62 + h(seed, 74) * 0.22) * (0.9 + (1 - distort) * 0.1)
  ctx.moveTo(0, -hh)
  ctx.bezierCurveTo(hw * 0.92, -hh * 0.86, hw * 1.06, -hh * 0.12, hw * jaw, hh * 0.52)
  ctx.bezierCurveTo(hw * 0.40, hh * (0.95 + chin), -hw * 0.40, hh * (0.95 + chin), -hw * jaw, hh * 0.52)
  ctx.bezierCurveTo(-hw * 1.06, -hh * 0.12, -hw * 0.92, -hh * 0.86, 0, -hh)
  ctx.fill()

  // Cheek and under-eye shadow planes.
  ctx.fillStyle = col.shadow
  for (const side of [-1, 1]) {
    const cheekX = side * hw * (0.32 + h(seed, 75 + (side > 0 ? 1 : 0)) * 0.08)
    const cheekY = hh * (0.16 + h(seed, 76) * 0.08)
    ctx.beginPath()
    ctx.ellipse(cheekX, cheekY, hw * 0.18, hh * 0.14, side * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = col.blush
  for (const side of [-1, 1]) {
    const blushX = side * hw * 0.34
    const blushY = hh * 0.22
    ctx.beginPath()
    ctx.ellipse(blushX, blushY, hw * (0.12 + face.cheekDepth * 0.12), hh * 0.09, side * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }

  // Nose — filled wedge, not a stroke.
  const nx = (h(seed, 79) - 0.5) * hw * distort * 0.18
  const ny = -hh * 0.02
  const noseW = hw * (0.08 + h(seed, 80) * 0.05)
  const noseH = hh * (0.12 + h(seed, 81) * 0.08)
  ctx.fillStyle = col.shadow
  ctx.beginPath()
  ctx.moveTo(nx, ny - noseH * 0.45)
  ctx.quadraticCurveTo(nx + noseW * 0.55, ny + noseH * 0.15, nx + noseW * 0.2, ny + noseH * 0.95)
  ctx.quadraticCurveTo(nx - noseW * 0.05, ny + noseH * 1.05, nx - noseW * 0.18, ny + noseH * 0.75)
  ctx.quadraticCurveTo(nx - noseW * 0.25, ny + noseH * 0.1, nx, ny - noseH * 0.45)
  ctx.fill()

  drawBrows(ctx, hw, hh, seed, face, gender)

  ctx.restore()
}

function drawBrows(
  ctx: CacheCtx,
  hw: number,
  hh: number,
  seed: number,
  face: FacePresetDef,
  gender: FaceGender,
) {
  const bw = face.browWeight * (gender === 'female' ? 0.9 : 1)
  const y = -hh * 0.42
  const col = faceColors(seed, 0, face.distort)
  ctx.fillStyle = col.line
  for (const side of [-1, 1]) {
    const lift = side === 1 ? (h(seed, 16) - 0.5) * hh * 0.04 : 0
    const bx = side * hw * 0.3
    ctx.beginPath()
    ctx.ellipse(bx, y + lift, hw * 0.13 * bw, hh * 0.035 * bw, side * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }
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
  timeMs: number,
) {
  const s = scale
  const col = faceColors(seed, talkLevel, distort)
  const blink = blinkOpen(timeMs, seed)
  const sac = saccadeJitter(timeMs, seed)
  const tx = trackX + sac.x
  const ty = trackY + sac.y
  const eyeSpread = s * 0.28 * eyes.spreadMul
  const eyeRise = s * 0.12
  const tilt = eyes.lidTilt * 0.4

  for (let side = -1; side <= 1; side += 2) {
    const ex = cx + side * eyeSpread + tx * s * 0.08
    const ey = cy - eyeRise + ty * s * 0.06
    const ew = s * 0.15 * eyes.sizeMul
    const eh = s * (0.09 + talkLevel * 0.008) * eyes.sizeMul * blink

    if (blink < 0.2) {
      ctx.fillStyle = col.line
      ctx.beginPath()
      ctx.ellipse(ex, ey, ew, eh * 0.2, tilt, 0, Math.PI * 2)
      ctx.fill()
      continue
    }

    ctx.fillStyle = col.sclera
    ctx.beginPath()
    ctx.ellipse(ex, ey, ew, eh, tilt, 0, Math.PI * 2)
    ctx.fill()

    const pr = s * 0.048 * eyes.pupilMul
    const ix = tx * pr * 2.2
    const iy = ty * pr * 1.8
    const px = ex + ix
    const py = ey + iy

    ctx.fillStyle = col.iris
    ctx.beginPath()
    ctx.ellipse(px, py, pr * 1.1, pr * 1.1, tilt, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = col.pupil
    ctx.beginPath()
    ctx.arc(px, py, pr * 0.58, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.beginPath()
    ctx.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.24, 0, Math.PI * 2)
    ctx.fill()

    // Upper lid — filled cap over sclera, not a scribble stroke.
    const lidDrop = (1 - blink) * eh * 0.55
    if (lidDrop > 0.4) {
      ctx.fillStyle = col.fill
      ctx.beginPath()
      ctx.ellipse(ex, ey - eh * 0.55, ew * 1.05, lidDrop, tilt, 0, Math.PI * 2)
      ctx.fill()
    }

    // Lower lid — thin filled band along the bottom edge.
    ctx.fillStyle = col.shadow
    ctx.beginPath()
    ctx.ellipse(ex, ey + eh * 0.72, ew * 0.9, eh * 0.14, tilt, 0, Math.PI * 2)
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
  const col = faceColors(seed, talkLevel, distort)
  const mw = s * (0.22 + (h(seed, 12) - 0.5) * distort * 0.1) * mouth.widthMul
  const mh = s * (0.04 + talkLevel * 0.16) * mouth.heightMul
  const mx = cx + (h(seed, 13) - 0.5) * distort * s * 0.08
  const my = cy + s * (0.24 + (h(seed, 14) - 0.5) * distort * 0.06 + mouth.yBias)

  const smile = (h(seed, 15) - 0.5) * 0.35 + (talkLevel - 0.2) * 0.15
  const lipTilt = smile * 0.12

  ctx.fillStyle = col.lip
  ctx.beginPath()
  ctx.ellipse(mx, my + mh * 0.08, mw * 0.98, Math.max(1.5, mh * (0.55 + talkLevel * 0.3)), lipTilt, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = col.shadow
  ctx.beginPath()
  ctx.ellipse(mx, my + mh * 0.22, mw * 0.72, Math.max(1, mh * 0.28), lipTilt, 0, Math.PI * 2)
  ctx.fill()

  if (talkLevel > 0.4) {
    ctx.fillStyle = col.tooth
    ctx.beginPath()
    ctx.roundRect(mx - mw * 0.55, my - mh * 0.05, mw * 1.1, Math.min(mh * 0.32, s * 0.045), 1)
    ctx.fill()
    ctx.fillStyle = `hsla(${(h(seed, 209) * 360).toFixed(1)} 70% 52% 0.4)`
    ctx.beginPath()
    ctx.ellipse(mx, my + mh * 0.32, mw * 0.32, mh * 0.34, 0, 0, Math.PI * 2)
    ctx.fill()
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

  if (hairStyle && hairBase && hairHi) {
    // Hair should belong to the face layer so characters don't read bald when face overlays the body.
    drawHair(ctx, x, y, scale, seed, hairStyle, hairBase, hairHi)
  }

  drawFaceEyes(ctx, x, y, scale, trackX, trackY, distort, seed, talkLevel, eyes, timeMs)
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

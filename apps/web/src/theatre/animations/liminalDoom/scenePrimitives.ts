import { palette } from './palette'
import type { FigurePose } from './types'
import { clamp } from './types'

export type { FigurePose } from './types'

export type PrimitiveOptions = {
  mirror?: boolean
  tint?: string
  alpha?: number
  faceOnCone?: boolean
  eyeTrackX?: number
  eyeTrackY?: number
}

type Ctx = CanvasRenderingContext2D

function applyAlpha(ctx: Ctx, alpha: number | undefined) {
  if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha
}

function resetAlpha(ctx: Ctx, alpha: number | undefined) {
  if (alpha !== undefined && alpha < 1) ctx.globalAlpha = 1
}

export function drawSpeaker(
  ctx: Ctx, x: number, y: number, w: number, h: number, bassLevel: number,
  options: PrimitiveOptions = {},
) {
  const push = bassLevel * 8
  const bw = w + push
  const bh = h + push * 0.4
  const bx = x - push * 0.5
  const by = y - push * 0.3
  applyAlpha(ctx, options.alpha)
  ctx.fillStyle = options.tint ?? palette.speaker
  ctx.fillRect(bx, by, bw, bh * 0.72)
  ctx.fillStyle = palette.speakerCone
  const coneR = Math.min(bw, bh) * 0.22
  const cx = bx + bw * 0.5
  const cy = by + bh * 0.38
  ctx.beginPath()
  ctx.arc(cx, cy, coneR, 0, Math.PI * 2)
  ctx.fill()
  if (options.faceOnCone) {
    drawFaceMask(ctx, cx, cy, coneR * 1.6, 0, options.eyeTrackX ?? 0, options.eyeTrackY ?? 0, options)
  }
  ctx.strokeStyle = palette.figureEdge
  ctx.lineWidth = 1
  ctx.strokeRect(bx, by, bw, bh * 0.72)
  resetAlpha(ctx, options.alpha)
}

export function drawDrumKit(
  ctx: Ctx, x: number, y: number, scale: number, beatLevel: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  const kick = 28 * scale + beatLevel * 6
  ctx.fillStyle = palette.figure
  ctx.beginPath()
  ctx.ellipse(x, y + 8 * scale, kick, kick * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x - 40 * scale, y - 30 * scale, 14 * scale, 36 * scale)
  ctx.fillRect(x + 26 * scale, y - 26 * scale, 12 * scale, 32 * scale)
  ctx.beginPath()
  ctx.arc(x - 34 * scale, y - 32 * scale, 16 * scale, 0, Math.PI * 2)
  ctx.arc(x + 32 * scale, y - 28 * scale, 14 * scale, 0, Math.PI * 2)
  ctx.fill()
  resetAlpha(ctx, options.alpha)
}

export function drawFigure(
  ctx: Ctx, x: number, y: number, scale: number, pose: FigurePose, energy: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  const s = scale * (1 + energy * 0.08)
  ctx.fillStyle = options.tint ?? palette.figure
  const headR = 10 * s
  const bodyH = 38 * s
  let lean = 0
  if (pose === 'lean' || pose === 'bartender') lean = 6 * s
  if (pose === 'guitar') lean = -4 * s
  const hx = x + lean
  const hy = y - bodyH - headR
  ctx.beginPath()
  ctx.ellipse(hx, hy, headR, headR * 1.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(hx - 8 * s, y - bodyH, 16 * s, bodyH)
  if (pose === 'drum') {
    ctx.fillRect(hx - 22 * s, y - bodyH * 0.5, 44 * s, 8 * s)
  }
  if (pose === 'guitar') {
    drawGuitarNeck(ctx, hx + 10 * s, y - bodyH * 0.6, 34 * s, -0.5, energy, options)
  }
  if (pose === 'bartender') {
    drawFaceMask(ctx, hx, hy, headR * 2.2, energy, options.eyeTrackX ?? 0, options.eyeTrackY ?? 0, options)
  }
  resetAlpha(ctx, options.alpha)
}

export function drawGuitarNeck(
  ctx: Ctx, x: number, y: number, length: number, angle: number, energy: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = palette.amberDim
  ctx.fillRect(0, -2, length, 4 + energy * 2)
  ctx.fillRect(length - 14, -10, 16, 20)
  ctx.restore()
  resetAlpha(ctx, options.alpha)
}

export function drawBarCounter(
  ctx: Ctx, x: number, y: number, w: number, h: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  ctx.fillStyle = options.tint ?? palette.stage
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = palette.stageLight
  ctx.fillRect(x, y, w, h * 0.12)
  ctx.strokeStyle = palette.figureEdge
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, h)
  resetAlpha(ctx, options.alpha)
}

export function drawBottle(
  ctx: Ctx, x: number, y: number, scale: number, highLevel: number,
  options: PrimitiveOptions = {},
) {
  const jitter = highLevel * 3
  const bx = x + (options.mirror ? jitter : -jitter)
  applyAlpha(ctx, options.alpha)
  const w = 6 * scale
  const h = 22 * scale
  ctx.fillStyle = palette.bottle
  ctx.beginPath()
  ctx.moveTo(bx - w * 0.4, y)
  ctx.lineTo(bx + w * 0.4, y)
  ctx.lineTo(bx + w * 0.55, y - h * 0.75)
  ctx.lineTo(bx + w * 0.25, y - h)
  ctx.lineTo(bx - w * 0.25, y - h)
  ctx.lineTo(bx - w * 0.55, y - h * 0.75)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = palette.bottleHighlight
  ctx.fillRect(bx - w * 0.15, y - h * 0.55, w * 0.2, h * 0.35)
  resetAlpha(ctx, options.alpha)
}

export function drawStool(
  ctx: Ctx, x: number, y: number, scale: number, tapLevel: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  const bounce = tapLevel * 4
  ctx.fillStyle = palette.figure
  ctx.fillRect(x - 14 * scale, y - bounce, 28 * scale, 4 * scale)
  ctx.fillRect(x - 2 * scale, y - 18 * scale - bounce, 4 * scale, 18 * scale)
  resetAlpha(ctx, options.alpha)
}

export function drawDanceBody(
  ctx: Ctx, x: number, y: number, scale: number, pose: number, strobeLevel: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  const flash = strobeLevel > 0.65 ? palette.strobe : palette.figure
  ctx.fillStyle = options.tint ?? flash
  const s = scale
  const variant = pose % 4
  if (variant === 0) {
    ctx.beginPath()
    ctx.ellipse(x, y - 14 * s, 9 * s, 14 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x - 5 * s, y - 14 * s, 10 * s, 28 * s)
  } else if (variant === 1) {
    ctx.fillRect(x - 12 * s, y - 32 * s, 24 * s, 32 * s)
    ctx.beginPath()
    ctx.moveTo(x - 14 * s, y - 20 * s)
    ctx.lineTo(x + 16 * s, y - 36 * s)
    ctx.lineTo(x + 8 * s, y - 10 * s)
    ctx.closePath()
    ctx.fill()
  } else if (variant === 2) {
    ctx.beginPath()
    ctx.ellipse(x, y - 10 * s, 11 * s, 8 * s, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x - 4 * s, y - 10 * s, 8 * s, 30 * s)
  } else {
    ctx.beginPath()
    ctx.moveTo(x, y - 36 * s)
    ctx.lineTo(x + 14 * s, y)
    ctx.lineTo(x - 14 * s, y)
    ctx.closePath()
    ctx.fill()
  }
  resetAlpha(ctx, options.alpha)
}

export function drawDoorFrame(
  ctx: Ctx, x: number, y: number, w: number, h: number, bendLevel: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  const skew = bendLevel * 0.04 * w
  ctx.fillStyle = palette.doorFrame
  ctx.beginPath()
  ctx.moveTo(x - 6, y)
  ctx.lineTo(x + w + 6 + skew, y)
  ctx.lineTo(x + w + 4 + skew, y + h)
  ctx.lineTo(x - 4, y + h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = palette.door
  ctx.fillRect(x, y + 4, w, h - 8)
  if (bendLevel > 0.2) {
    ctx.strokeStyle = palette.doorGlow
    ctx.lineWidth = 2
    ctx.strokeRect(x + 2, y + 6, w - 4, h - 12)
  }
  resetAlpha(ctx, options.alpha)
}

export type SmokeQuad = { x: number; y: number; w: number; h: number }

export function drawSmokeQuad(
  ctx: Ctx, quad: SmokeQuad, alpha: number,
  options: PrimitiveOptions = {},
) {
  const a = (options.alpha ?? 1) * alpha
  applyAlpha(ctx, a)
  ctx.fillStyle = palette.smoke
  ctx.fillRect(quad.x, quad.y, quad.w, quad.h)
  resetAlpha(ctx, a)
}

export function drawPosterShard(
  ctx: Ctx, x: number, y: number, w: number, h: number, peelLevel: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  const peel = peelLevel * 6
  ctx.fillStyle = options.tint ?? palette.amberDim
  ctx.save()
  ctx.translate(x + peel, y)
  ctx.rotate(peelLevel * 0.08)
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = palette.magenta
  ctx.fillRect(w * 0.1, h * 0.2, w * 0.8, h * 0.15)
  ctx.restore()
  resetAlpha(ctx, options.alpha)
}

export function drawPhraseShard(
  ctx: Ctx, phrase: string, x: number, y: number, w: number, revealLevel: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha ?? clamp(revealLevel, 0.15, 1))
  const bubbleH = 36
  ctx.fillStyle = 'rgba(20,16,24,0.75)'
  ctx.beginPath()
  ctx.roundRect(x, y - bubbleH, w, bubbleH, 4)
  ctx.fill()
  ctx.fillStyle = palette.phrase
  ctx.font = `bold ${Math.max(11, w * 0.045)}px system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const visible = Math.floor(phrase.length * revealLevel)
  ctx.fillText(phrase.slice(0, visible), x + 10, y - bubbleH * 0.5, w - 16)
  resetAlpha(ctx, options.alpha)
}

export function drawFaceMask(
  ctx: Ctx, x: number, y: number, scale: number, talkLevel: number,
  trackX: number, trackY: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  const s = scale
  ctx.fillStyle = palette.faceFill
  ctx.strokeStyle = palette.faceLine
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(x, y, s * 0.9, s * 1.05, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  const eyeY = y - s * 0.15
  const eyeOff = s * 0.28
  const pupil = s * 0.06 + talkLevel * 0.02
  for (const side of [-1, 1]) {
    const ex = x + side * eyeOff + trackX * s * 0.08
    const ey = eyeY + trackY * s * 0.06
    ctx.fillStyle = palette.strobe
    ctx.beginPath()
    ctx.ellipse(ex, ey, s * 0.12, s * 0.08, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = palette.figure
    ctx.beginPath()
    ctx.arc(ex + trackX * pupil, ey + trackY * pupil, pupil, 0, Math.PI * 2)
    ctx.fill()
  }
  const mouthH = s * 0.08 + talkLevel * s * 0.12
  ctx.fillStyle = palette.magenta
  ctx.fillRect(x - s * 0.2, y + s * 0.25, s * 0.4, mouthH)
  resetAlpha(ctx, options.alpha)
}

export function drawStageLight(
  ctx: Ctx, x: number, y: number, w: number, pulse: number,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha ?? clamp(0.25 + pulse * 0.5, 0, 0.85))
  const g = ctx.createRadialGradient(x, y, 0, x, y, w)
  g.addColorStop(0, `rgba(200,120,80,${0.35 + pulse * 0.4})`)
  g.addColorStop(1, 'rgba(80,40,60,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - w, y - w * 0.5, w * 2, w)
  resetAlpha(ctx, options.alpha)
}

export function drawShellQuad(
  ctx: Ctx,
  points: [number, number][],
  fill: string,
  options: PrimitiveOptions = {},
) {
  applyAlpha(ctx, options.alpha)
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
  ctx.fill()
  resetAlpha(ctx, options.alpha)
}

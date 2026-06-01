import { palette } from './palette'
import { clamp, hash01 } from './types'

export type BodyGender = 'male' | 'female'
export type BodyStyle = 'punk' | 'neon' | 'classic' | 'thrift' | 'street' | 'formal'
export type CastActivity =
  | 'hangOut'
  | 'stand'
  | 'look'
  | 'wander'
  | 'dance'
  | 'drink'
  | 'smoke'
  | 'playDrums'
  | 'playGuitar'
  | 'playBass'
  | 'bartend'

export type BodyLook = {
  gender: BodyGender
  style: BodyStyle
  activity: CastActivity
  seed: number
}

type Outfit = { skin: string; top: string; bottom: string; accent: string; hair: string }

const STYLES: BodyStyle[] = ['punk', 'neon', 'classic', 'thrift', 'street', 'formal']

export function resolveBodyStyle(seed: number, salt: number): BodyStyle {
  return STYLES[Math.floor(hash01(seed, salt) * STYLES.length)]
}

export function resolveGender(seed: number, salt: number): BodyGender {
  return hash01(seed, salt) > 0.52 ? 'female' : 'male'
}

function outfit(style: BodyStyle): Outfit {
  switch (style) {
    case 'punk':
      return { skin: '#3a2830', top: '#1a1020', bottom: '#241018', accent: '#a03878', hair: '#180810' }
    case 'neon':
      return { skin: '#2e2838', top: '#102838', bottom: '#181830', accent: '#3a7888', hair: '#0c1028' }
    case 'classic':
      return { skin: '#3a3438', top: '#282230', bottom: '#1c1824', accent: palette.amberDim, hair: '#141018' }
    case 'thrift':
      return { skin: '#403530', top: '#4a3830', bottom: '#342820', accent: '#6a5040', hair: '#281c14' }
    case 'street':
      return { skin: '#36303a', top: '#403850', bottom: '#282430', accent: '#c48a3a', hair: '#141018' }
    case 'formal':
      return { skin: '#343038', top: '#1a1828', bottom: '#141020', accent: '#9080b0', hair: '#0c0a14' }
    default:
      return { skin: '#3a3038', top: palette.figure, bottom: '#1a1820', accent: palette.magenta, hair: '#100c14' }
  }
}

/** Feet on ground at (x, y). scale ≈ stage.width/400. */
export function drawStyledBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  look: BodyLook,
  energy: number,
  timeMs: number,
  wanderAmp = 0,
  alpha = 1,
) {
  if (alpha <= 0.01) return
  const wx = look.activity === 'wander'
    ? Math.sin(timeMs / 2200 + look.seed) * wanderAmp * scale
    : 0
  const fx = x + wx
  const o = outfit(look.style)
  const female = look.gender === 'female'
  const s = scale
  const bounce = look.activity === 'dance' ? Math.sin(timeMs / 280 + look.seed) * 5 * s * energy : 0
  const fy = y + bounce

  const sh = female ? 10 * s : 13 * s
  const hip = female ? 15 * s : 11 * s
  const torsoH = 26 * s
  const legH = 32 * s
  const headR = (female ? 9 : 10) * s
  const lean = activityLean(look.activity, energy, timeMs, look.seed) * s

  const cx = fx + lean
  const headY = fy - legH - torsoH - headR * 1.1
  const shoulderY = fy - legH - torsoH

  ctx.save()
  ctx.globalAlpha = alpha

  drawLegs(ctx, cx, fy, hip, legH, o, look.activity, energy, timeMs, look.seed)
  drawTorso(ctx, cx, shoulderY, sh, hip, torsoH, o, female)
  drawArms(ctx, cx, shoulderY, sh, torsoH, o, look, energy, timeMs)
  drawHead(ctx, cx, headY, headR, o.hair, look.activity)
  drawActivityProp(ctx, cx, shoulderY, s, look, energy, timeMs)

  ctx.restore()
}

function activityLean(act: CastActivity, energy: number, timeMs: number, seed: number): number {
  if (act === 'bartend' || act === 'drink') return 5 + energy * 3
  if (act === 'playGuitar' || act === 'playBass') return -6
  if (act === 'hangOut') return 3 + Math.sin(timeMs / 3000 + seed) * 2
  if (act === 'smoke') return 4
  if (act === 'look') return Math.sin(timeMs / 4000 + seed) * 2
  return 0
}

function drawLegs(
  ctx: CanvasRenderingContext2D, cx: number, fy: number, hip: number, legH: number,
  o: Outfit, act: CastActivity, energy: number, timeMs: number, seed: number,
) {
  const spread = hip * 0.35
  let lOff = 0
  let rOff = 0
  if (act === 'dance') {
    lOff = Math.sin(timeMs / 260 + seed) * 8 * energy
    rOff = Math.sin(timeMs / 260 + seed + 1.2) * -8 * energy
  }
  ctx.fillStyle = o.bottom
  ctx.fillRect(cx - spread + lOff, fy - legH, hip * 0.42, legH)
  ctx.fillRect(cx + spread - hip * 0.42 + rOff, fy - legH, hip * 0.42, legH)
  ctx.strokeStyle = o.accent
  ctx.lineWidth = 1
  ctx.strokeRect(cx - spread + lOff, fy - legH, hip * 0.42, legH)
  ctx.strokeRect(cx + spread - hip * 0.42 + rOff, fy - legH, hip * 0.42, legH)
}

function drawTorso(
  ctx: CanvasRenderingContext2D, cx: number, y: number, sh: number, hip: number, h: number,
  o: Outfit, female: boolean,
) {
  ctx.fillStyle = o.top
  ctx.beginPath()
  ctx.moveTo(cx - sh, y)
  ctx.lineTo(cx + sh, y)
  ctx.lineTo(cx + hip, y + h)
  ctx.lineTo(cx - hip, y + h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = o.accent
  ctx.lineWidth = 1.2
  ctx.stroke()
  if (female) {
    ctx.fillStyle = o.accent
    ctx.fillRect(cx - hip * 0.85, y + h * 0.55, hip * 1.7, h * 0.12)
  }
}

function drawArms(
  ctx: CanvasRenderingContext2D, cx: number, y: number, sh: number, torsoH: number,
  o: Outfit, look: BodyLook, energy: number, timeMs: number,
) {
  const armW = 4 * (look.gender === 'female' ? 0.9 : 1.1)
  const armH = 22 * (look.gender === 'female' ? 0.92 : 1)
  ctx.fillStyle = o.skin
  const act = look.activity
  let lAngle = -0.35
  let rAngle = 0.35
  if (act === 'drink' || act === 'smoke') rAngle = -1.2
  if (act === 'playGuitar') { lAngle = -0.9; rAngle = 0.5 }
  if (act === 'playDrums') { lAngle = -0.5; rAngle = 0.5 }
  if (act === 'dance') {
    lAngle = -0.6 + Math.sin(timeMs / 300 + look.seed) * 0.4 * energy
    rAngle = 0.6 + Math.sin(timeMs / 280 + look.seed) * 0.4 * energy
  }
  if (act === 'hangOut') {
    lAngle = -0.15 + Math.sin(timeMs / 2500 + look.seed) * 0.1
    rAngle = 0.2
  }
  drawArm(ctx, cx - sh, y + torsoH * 0.15, armW, armH, lAngle)
  drawArm(ctx, cx + sh, y + torsoH * 0.15, armW, armH, rAngle)
}

function drawArm(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillRect(-w * 0.5, 0, w, h)
  ctx.restore()
}

function drawHead(
  ctx: CanvasRenderingContext2D, cx: number, y: number, r: number, hair: string, act: CastActivity,
) {
  ctx.fillStyle = hair
  ctx.beginPath()
  ctx.ellipse(cx, y - r * 0.15, r * 1.05, r * 0.55, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = palette.faceFill
  ctx.beginPath()
  ctx.arc(cx, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = palette.figureEdge
  ctx.lineWidth = 1
  ctx.stroke()
  if (act === 'look') {
    ctx.fillStyle = palette.strobe
    ctx.fillRect(cx - r * 0.35, y - r * 0.1, r * 0.22, r * 0.08)
    ctx.fillRect(cx + r * 0.13, y - r * 0.1, r * 0.22, r * 0.08)
  }
}

function drawActivityProp(
  ctx: CanvasRenderingContext2D, cx: number, shoulderY: number, s: number,
  look: BodyLook, energy: number, timeMs: number,
) {
  const act = look.activity
  if (act === 'drink') {
    ctx.fillStyle = palette.bottle
    ctx.fillRect(cx + 14 * s, shoulderY - 8 * s, 5 * s, 16 * s)
    ctx.fillStyle = palette.bottleHighlight
    ctx.fillRect(cx + 15 * s, shoulderY - 4 * s, 2 * s, 6 * s)
  }
  if (act === 'smoke') {
    const puff = clamp(0.4 + Math.sin(timeMs / 400 + look.seed) * 0.3, 0, 1)
    ctx.fillStyle = `rgba(140,130,150,${puff * 0.35})`
    ctx.beginPath()
    ctx.ellipse(cx + 16 * s, shoulderY - 20 * s, 8 * s, 12 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = palette.amberDim
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx + 12 * s, shoulderY - 4 * s)
    ctx.lineTo(cx + 18 * s, shoulderY - 14 * s)
    ctx.stroke()
  }
  if (act === 'playGuitar' || act === 'playBass') {
    ctx.strokeStyle = palette.amber
    ctx.lineWidth = 3 * s
    ctx.beginPath()
    ctx.moveTo(cx - 8 * s, shoulderY + 10 * s)
    ctx.lineTo(cx + 28 * s, shoulderY - 6 * s)
    ctx.stroke()
    ctx.fillStyle = palette.amberDim
    ctx.fillRect(cx + 24 * s, shoulderY - 14 * s, 10 * s, 14 * s)
  }
  if (act === 'playDrums' && energy > 0.3) {
    ctx.fillStyle = `rgba(200,140,60,${(energy - 0.3) * 0.5})`
    ctx.beginPath()
    ctx.arc(cx - 20 * s, shoulderY + 20 * s, 6 * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function headAnchor(x: number, y: number, scale: number, look: BodyLook) {
  const s = scale
  const legH = 32 * s
  const torsoH = 26 * s
  const headR = (look.gender === 'female' ? 9 : 10) * s
  return { x, y: y - legH - torsoH - headR * 1.15, headR }
}

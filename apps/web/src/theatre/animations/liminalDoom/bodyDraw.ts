import { palette } from './palette'
import { clamp, hash01 } from './types'
import type { FashionSet, HairStyle } from './fashion'
import type { BodyLook, CastActivity } from './bodies'
import type { BodyPresetDef } from './character/libraries/body'

type Ctx = CanvasRenderingContext2D

type BodyMetrics = {
  cx: number
  fy: number
  s: number
  sh: number
  hip: number
  torsoH: number
  legH: number
  headR: number
  headY: number
  shoulderY: number
  neckY: number
}

export function drawStyledBodyDetailed(
  ctx: Ctx,
  x: number,
  y: number,
  scale: number,
  look: BodyLook,
  fashion: FashionSet,
  energy: number,
  timeMs: number,
  wanderAmp: number,
  alpha: number,
  simpleHead: boolean,
  bodyPreset?: BodyPresetDef,
) {
  if (alpha <= 0.01) return
  const wx = look.activity === 'wander' ? Math.sin(timeMs / 2200 + look.seed) * wanderAmp * scale : 0
  const female = look.gender === 'female'
  const s = scale
  const bounce = look.activity === 'dance' ? Math.sin(timeMs / 280 + look.seed) * 6 * s * energy : 0
  const lean = activityLean(look.activity, energy, timeMs, look.seed) * s
  const cx = x + wx + lean
  const fy = y + bounce

  const m = buildMetrics(cx, fy, s, female, bodyPreset)
  const f = fashion

  ctx.save()
  ctx.globalAlpha = alpha

  drawGroundShadow(ctx, m.cx, m.fy, m.hip, s)
  drawLegsDetailed(ctx, m, f, look, energy, timeMs)
  drawTorsoDetailed(ctx, m, f, female)
  drawArmsDetailed(ctx, m, f, look, energy, timeMs)
  drawNeck(ctx, m, f)
  drawHair(ctx, m.cx, m.headY, m.headR, f.hairStyle, f.hair, f.hairHi, look.seed)
  if (simpleHead) drawHeadDetailed(ctx, m, f, look.activity, timeMs)
  drawActivityPropDetailed(ctx, m, f, look, energy, timeMs, s)

  ctx.restore()
}

function buildMetrics(cx: number, fy: number, s: number, female: boolean, body?: BodyPresetDef): BodyMetrics {
  const b = body ?? { shoulderMul: 1, hipMul: 1, torsoMul: 1, legMul: 1, headMul: 1 }
  const sh = (female ? 11 : 14) * s * b.shoulderMul
  const hip = (female ? 16 : 12) * s * b.hipMul
  const torsoH = 28 * s * b.torsoMul
  const legH = (female ? 36 : 32) * s * b.legMul
  const headR = (female ? 10 : 11) * s * b.headMul
  const headY = fy - legH - torsoH - headR * 1.05
  const shoulderY = fy - legH - torsoH
  const neckY = shoulderY - headR * 0.35
  return { cx, fy, s, sh, hip, torsoH, legH, headR, headY, shoulderY, neckY }
}

function drawGroundShadow(ctx: Ctx, cx: number, fy: number, hip: number, s: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(cx, fy + 3 * s, hip * 1.1, 5 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawLegsDetailed(
  ctx: Ctx, m: BodyMetrics, f: FashionSet, look: BodyLook, energy: number, timeMs: number,
) {
  const spread = m.hip * 0.38
  let lOff = 0
  let rOff = 0
  if (look.activity === 'dance') {
    lOff = Math.sin(timeMs / 260 + look.seed) * 10 * energy
    rOff = Math.sin(timeMs / 260 + look.seed + 1.2) * -10 * energy
  }
  const thighH = m.legH * 0.55
  const calfH = m.legH - thighH
  for (const side of [-1, 1]) {
    const off = side < 0 ? lOff : rOff
    const lx = m.cx + side * spread + off
    const tw = m.hip * 0.48
    const cw = tw * 0.72
    ctx.fillStyle = f.bottom
    ctx.beginPath()
    ctx.moveTo(lx - tw * 0.5, m.fy - m.legH)
    ctx.lineTo(lx + tw * 0.5, m.fy - m.legH)
    ctx.lineTo(lx + cw * 0.5, m.fy - calfH)
    ctx.lineTo(lx - cw * 0.5, m.fy - calfH)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = f.rim
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = f.bottomLight
    ctx.fillRect(lx - tw * 0.15, m.fy - thighH, tw * 0.25, thighH * 0.35)
    drawShoe(ctx, lx, m.fy, cw, m.s * 1.1, f)
  }
}

function drawShoe(ctx: Ctx, cx: number, fy: number, w: number, s: number, f: FashionSet) {
  const sh = f.shoeStyle
  const h = sh === 'heel' ? 5 * s : 4 * s
  ctx.fillStyle = f.shoe
  if (sh === 'heel') {
    ctx.beginPath()
    ctx.moveTo(cx - w * 0.45, fy - h)
    ctx.lineTo(cx + w * 0.5, fy - h)
    ctx.lineTo(cx + w * 0.35, fy)
    ctx.lineTo(cx - w * 0.35, fy)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(cx + w * 0.1, fy, 2 * s, 6 * s)
  } else if (sh === 'boot') {
    ctx.fillRect(cx - w * 0.5, fy - h * 1.4, w, h * 1.4)
    ctx.fillStyle = f.shoeSole
    ctx.fillRect(cx - w * 0.55, fy - 2 * s, w * 1.1, 3 * s)
  } else {
    ctx.beginPath()
    ctx.ellipse(cx, fy - h * 0.5, w * 0.55, h * 0.85, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = f.shoeSole
    ctx.fillRect(cx - w * 0.5, fy - 2 * s, w, 2.5 * s)
  }
}

function drawTorsoDetailed(ctx: Ctx, m: BodyMetrics, f: FashionSet, female: boolean) {
  const { cx, shoulderY: y, sh, hip, torsoH: h } = m
  ctx.fillStyle = f.top
  ctx.beginPath()
  ctx.moveTo(cx - sh, y)
  ctx.lineTo(cx + sh, y)
  ctx.lineTo(cx + hip * 0.95, y + h)
  ctx.lineTo(cx - hip * 0.95, y + h)
  ctx.closePath()
  ctx.fill()
  if (f.hasJacket) {
    ctx.save()
    ctx.globalAlpha = 0.45
    ctx.fillStyle = f.topLight
    ctx.fillRect(cx - sh * 1.05, y, sh * 0.35, h * 0.85)
    ctx.fillRect(cx + sh * 0.7, y, sh * 0.35, h * 0.85)
    ctx.restore()
  }
  if (f.hasCollar) {
    ctx.fillStyle = f.accentBright
    ctx.beginPath()
    ctx.moveTo(cx - sh * 0.35, y)
    ctx.lineTo(cx, y + h * 0.12)
    ctx.lineTo(cx + sh * 0.35, y)
    ctx.closePath()
    ctx.fill()
  }
  if (female) {
    ctx.fillStyle = f.accent
    ctx.beginPath()
    ctx.moveTo(cx - hip, y + h * 0.5)
    ctx.lineTo(cx + hip, y + h * 0.5)
    ctx.lineTo(cx + hip * 0.7, y + h)
    ctx.lineTo(cx - hip * 0.7, y + h)
    ctx.closePath()
    ctx.fill()
  }
  if (f.hasBelt) {
    ctx.fillStyle = f.accent
    ctx.fillRect(cx - hip * 0.9, y + h * 0.88, hip * 1.8, h * 0.08)
    ctx.fillStyle = f.accentBright
    ctx.fillRect(cx - hip * 0.25, y + h * 0.86, hip * 0.5, h * 0.04)
  }
  ctx.strokeStyle = f.rim
  ctx.lineWidth = 1.4
  ctx.stroke()
}

function drawArmsDetailed(
  ctx: Ctx, m: BodyMetrics, f: FashionSet, look: BodyLook, energy: number, timeMs: number,
) {
  const angles = armAngles(look.activity, energy, timeMs, look.seed)
  const uw = 5 * m.s
  const lw = 4.2 * m.s
  const upper = 12 * m.s
  const lower = 11 * m.s
  drawLimbChain(ctx, m.cx - m.sh, m.shoulderY + m.torsoH * 0.12, uw, lw, upper, lower, angles.left, f)
  drawLimbChain(ctx, m.cx + m.sh, m.shoulderY + m.torsoH * 0.12, uw, lw, upper, lower, angles.right, f)
}

function drawLimbChain(
  ctx: Ctx, x: number, y: number, uw: number, lw: number, upper: number, lower: number,
  angle: number, f: FashionSet,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = f.topLight
  ctx.fillRect(-uw * 0.5, 0, uw, upper)
  ctx.fillStyle = f.skin
  ctx.fillRect(-lw * 0.5, upper, lw, lower)
  ctx.strokeStyle = f.rim
  ctx.lineWidth = 0.8
  ctx.strokeRect(-uw * 0.5, 0, uw, upper)
  ctx.restore()
}

function drawNeck(ctx: Ctx, m: BodyMetrics, f: FashionSet) {
  const w = m.headR * 0.55
  ctx.fillStyle = f.skin
  ctx.fillRect(m.cx - w * 0.5, m.neckY, w, m.headY - m.neckY + m.headR * 0.2)
  ctx.fillStyle = f.skinShadow
  ctx.fillRect(m.cx - w * 0.35, m.neckY, w * 0.3, m.headY - m.neckY)
}

function drawHair(
  ctx: Ctx, cx: number, headY: number, r: number, style: HairStyle, base: string, hi: string, seed: number,
) {
  ctx.fillStyle = base
  switch (style) {
    case 'buzz':
      ctx.beginPath()
      ctx.arc(cx, headY, r * 0.92, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'bob':
      ctx.beginPath()
      ctx.ellipse(cx, headY - r * 0.1, r * 1.05, r * 1.0, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(cx - r * 1.1, headY, r * 0.35, r * 0.9)
      ctx.fillRect(cx + r * 0.75, headY, r * 0.35, r * 0.9)
      break
    case 'long':
      ctx.beginPath()
      ctx.ellipse(cx, headY - r * 0.15, r * 1.0, r * 0.9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(cx - r * 0.5, headY - r * 0.2, r * 0.35, r * 1.8)
      ctx.fillRect(cx + r * 0.15, headY - r * 0.2, r * 0.35, r * 1.8)
      break
    case 'spiky':
    case 'mohawk':
      for (let i = 0; i < 7; i++) {
        const a = -0.8 + (i / 6) * 1.6
        const len = r * (0.5 + hash01(seed, i) * 0.5)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r * 0.3, headY + Math.sin(a) * r * 0.2)
        ctx.lineTo(cx + Math.cos(a) * (r + len), headY + Math.sin(a) * (r + len) - r * 0.5)
        ctx.lineTo(cx + Math.cos(a + 0.15) * r * 0.35, headY + Math.sin(a + 0.15) * r * 0.25)
        ctx.closePath()
        ctx.fill()
      }
      break
    case 'bun':
      ctx.beginPath()
      ctx.arc(cx, headY, r * 0.95, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + r * 0.55, headY - r * 0.5, r * 0.45, 0, Math.PI * 2)
      ctx.fill()
      break
    default:
      ctx.beginPath()
      ctx.ellipse(cx, headY - r * 0.12, r * 1.02, r * 0.75, 0, 0, Math.PI * 2)
      ctx.fill()
  }
  ctx.fillStyle = hi
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.25, headY - r * 0.35, r * 0.35, r * 0.2, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawHeadDetailed(
  ctx: Ctx, m: BodyMetrics, f: FashionSet, act: CastActivity, timeMs: number,
) {
  const { cx, headY: y, headR: r } = m
  ctx.fillStyle = f.skin
  ctx.beginPath()
  ctx.ellipse(cx, y, r * 0.95, r * 1.05, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = f.skinShadow
  ctx.beginPath()
  ctx.ellipse(cx + r * 0.12, y + r * 0.08, r * 0.35, r * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  const blink = Math.sin(timeMs / 3200) > 0.92 ? 0.15 : 1
  for (const side of [-1, 1]) {
    const ex = cx + side * r * 0.32
    const ey = y - r * 0.08
    ctx.fillStyle = palette.strobe
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.14, r * 0.08 * blink, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = palette.figure
    ctx.beginPath()
    ctx.arc(ex + side * r * 0.04, ey, r * 0.05, 0, Math.PI * 2)
    ctx.fill()
  }
  if (act === 'look') {
    ctx.strokeStyle = f.rim
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(cx - r * 0.5, y + r * 0.15)
    ctx.quadraticCurveTo(cx, y + r * 0.35, cx + r * 0.5, y + r * 0.15)
    ctx.stroke()
  }
  ctx.strokeStyle = f.rim
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(cx, y, r, 0, Math.PI * 2)
  ctx.stroke()
}

function drawActivityPropDetailed(
  ctx: Ctx, m: BodyMetrics, f: FashionSet, look: BodyLook, energy: number, timeMs: number, s: number,
) {
  const act = look.activity
  const { cx, shoulderY: sy } = m
  if (act === 'drink') {
    const gx = cx + 16 * s
    const gy = sy - 6 * s
    ctx.fillStyle = palette.bottle
    ctx.beginPath()
    ctx.moveTo(gx - 3 * s, gy)
    ctx.lineTo(gx + 3 * s, gy)
    ctx.lineTo(gx + 2 * s, gy - 18 * s)
    ctx.lineTo(gx - 2 * s, gy - 18 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(180,220,240,0.35)'
    ctx.fillRect(gx - 1.5 * s, gy - 14 * s, 3 * s, 6 * s)
  }
  if (act === 'smoke') {
    const puff = clamp(0.35 + Math.sin(timeMs / 380 + look.seed) * 0.35, 0, 1)
    ctx.strokeStyle = palette.amberDim
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx + 14 * s, sy - 2 * s)
    ctx.lineTo(cx + 20 * s, sy - 16 * s)
    ctx.stroke()
    ctx.fillStyle = `rgba(200,180,200,${puff * 0.4})`
    ctx.beginPath()
    ctx.ellipse(cx + 22 * s, sy - 22 * s, 10 * s, 14 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(255,180,80,${puff * 0.5})`
    ctx.beginPath()
    ctx.arc(cx + 20 * s, sy - 14 * s, 2 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  if (act === 'playGuitar' || act === 'playBass') {
    const bodyW = act === 'playBass' ? 14 * s : 12 * s
    ctx.fillStyle = palette.amberDim
    ctx.beginPath()
    ctx.ellipse(cx + 22 * s, sy - 4 * s, bodyW, 16 * s, -0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = palette.amber
    ctx.lineWidth = 2.5 * s
    ctx.beginPath()
    ctx.moveTo(cx - 6 * s, sy + 8 * s)
    ctx.lineTo(cx + 30 * s, sy - 10 * s)
    ctx.stroke()
  }
  if (act === 'playDrums') {
    ctx.strokeStyle = f.accentBright
    ctx.lineWidth = 2 * s
    const hit = energy > 0.4
    ctx.beginPath()
    ctx.moveTo(cx - 18 * s, sy + 6 * s)
    ctx.lineTo(cx - 28 * s, sy + 18 * s)
    ctx.moveTo(cx + 8 * s, sy + 4 * s)
    ctx.lineTo(cx + 12 * s, sy + 16 * s)
    ctx.stroke()
    if (hit) {
      ctx.fillStyle = `rgba(232,176,80,${(energy - 0.4) * 0.6})`
      ctx.beginPath()
      ctx.arc(cx - 28 * s, sy + 18 * s, 5 * s, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function armAngles(act: CastActivity, energy: number, timeMs: number, seed: number) {
  let left = -0.4
  let right = 0.35
  if (act === 'drink' || act === 'smoke') { right = -1.15; left = -0.25 }
  if (act === 'playGuitar') { left = -1.0; right = 0.55 }
  if (act === 'playBass') { left = -0.5; right = -0.9 }
  if (act === 'playDrums') { left = -0.55; right = 0.45 }
  if (act === 'dance') {
    left = -0.7 + Math.sin(timeMs / 300 + seed) * 0.5 * energy
    right = 0.65 + Math.sin(timeMs / 280 + seed) * 0.5 * energy
  }
  if (act === 'hangOut' || act === 'bartend') {
    left = -0.2 + Math.sin(timeMs / 2800 + seed) * 0.08
    right = 0.15
  }
  if (act === 'look') left = -0.35; right = 0.3
  return { left, right }
}

function activityLean(act: CastActivity, energy: number, timeMs: number, seed: number): number {
  if (act === 'bartend' || act === 'drink') return 6 + energy * 4
  if (act === 'playGuitar' || act === 'playBass') return -7
  if (act === 'hangOut') return 4 + Math.sin(timeMs / 3000 + seed) * 2
  if (act === 'smoke') return 5
  if (act === 'look') return Math.sin(timeMs / 4000 + seed) * 2.5
  return 0
}

export function headAnchorDetailed(
  cx: number, fy: number, scale: number, female: boolean, body?: BodyPresetDef,
) {
  const m = buildMetrics(cx, fy, scale, female, body)
  return { x: m.cx, y: m.headY, headR: m.headR }
}

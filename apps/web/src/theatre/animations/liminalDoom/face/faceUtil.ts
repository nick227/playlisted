import { clamp } from '../types'
import { pathSquircle } from './faceShapes'

export type FaceGender = 'male' | 'female'
export type CacheCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

export function faceHash(seed: number, salt: number): number {
  let v = (seed ^ ((salt + 0x9e3779b9) | 0)) >>> 0
  v ^= v >>> 16
  v = Math.imul(v, 0x7feb352d) >>> 0
  v ^= v >>> 15
  v = Math.imul(v, 0x846ca68b) >>> 0
  v ^= v >>> 16
  return (v >>> 0) / 0xffffffff
}

export type FaceColors = {
  fill: string
  fillHi: string
  fillEdge: string
  line: string
  shadow: string
  blush: string
  socket: string
  sclera: string
  iris: string
  irisHi: string
  irisRing: string
  pupil: string
  brow: string
  lip: string
  lipHi: string
  mouthInner: string
  tooth: string
  tongue: string
}

export function faceColors(seed: number, talk: number, distort: number): FaceColors {
  const h = faceHash
  const hue = (h(seed, 201) * 360 + h(seed, 202) * distort * 60) % 360
  const sat = 48 + h(seed, 203) * 32
  const lit = 44 + h(seed, 204) * 16
  const shadowHue = (hue + 220 + h(seed, 205) * 40) % 360
  const irisHue = (hue + 130 + h(seed, 206) * 120) % 360
  const blushHue = (hue + 28 + h(seed, 207) * 70) % 360
  const lipHue = (hue + 310 + h(seed, 208) * 70) % 360
  const talkBoost = clamp(talk, 0, 1)

  return {
    fill: `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${lit.toFixed(1)}%)`,
    fillHi: `hsl(${hue.toFixed(1)} ${(sat * 0.65).toFixed(1)}% ${(lit + 16).toFixed(1)}%)`,
    fillEdge: `hsl(${shadowHue.toFixed(1)} 35% ${(lit - 14).toFixed(1)}%)`,
    line: `hsl(${shadowHue.toFixed(1)} 40% 16%)`,
    shadow: `hsla(${shadowHue.toFixed(1)} 45% 24% ${0.28 + distort * 0.06})`,
    blush: `hsla(${blushHue.toFixed(1)} 60% 55% ${0.14 + distort * 0.04})`,
    socket: `hsl(${(hue + 38).toFixed(1)} 28% 90%)`,
    sclera: `hsl(${(hue + 32).toFixed(1)} 16% 97%)`,
    iris: `hsl(${irisHue.toFixed(1)} 58% 46%)`,
    irisHi: `hsl(${irisHue.toFixed(1)} 50% 58%)`,
    irisRing: `hsl(${irisHue.toFixed(1)} 62% 34%)`,
    pupil: `hsl(${shadowHue.toFixed(1)} 32% 11%)`,
    brow: `hsl(${(hue + 18).toFixed(1)} 42% 32%)`,
    lip: `hsl(${lipHue.toFixed(1)} 58% ${36 + talkBoost * 14}%)`,
    lipHi: `hsl(${lipHue.toFixed(1)} 50% ${50 + talkBoost * 10}%)`,
    mouthInner: `hsla(${shadowHue.toFixed(1)} 42% 10% 0.94)`,
    tooth: `hsl(${(hue + 15).toFixed(1)} 12% 93%)`,
    tongue: `hsla(${lipHue.toFixed(1)} 65% 48% 0.9)`,
  }
}

/** Body radial gloss + edge depth (toy-face plate look, toned down). */
export function paintSquircleBody(
  ctx: CacheCtx,
  col: FaceColors,
  hw: number,
  hh: number,
  seed: number,
) {
  const h = faceHash
  const ox = hw * 0.04
  const oy = hh * 0.05
  ctx.fillStyle = col.fillEdge
  ctx.beginPath()
  pathSquircle(ctx, hw + ox, hh + oy, 0.4)
  ctx.fill()

  const g = ctx.createRadialGradient(0, -hh * 0.12, 0, 0, 0, Math.max(hw, hh) * 1.15)
  g.addColorStop(0, col.fillHi)
  g.addColorStop(0.55, col.fill)
  g.addColorStop(1, col.fillEdge)
  ctx.fillStyle = g
  ctx.beginPath()
  pathSquircle(ctx, hw, hh, 0.4)
  ctx.fill()

  ctx.fillStyle = `hsla(255 80% 98% / ${0.12 + h(seed, 411) * 0.1})`
  ctx.beginPath()
  ctx.ellipse(-hw * 0.2, -hh * 0.38, hw * 0.22, hh * 0.14, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(hw * 0.08, -hh * 0.42, hw * 0.16, hh * 0.11, 0.15, 0, Math.PI * 2)
  ctx.fill()
}

/** Subtle outer rim — use sparingly (seed-gated). */
export function strokeRim(ctx: CacheCtx, col: FaceColors, lw: number, draw: () => void) {
  ctx.strokeStyle = col.line
  ctx.globalAlpha *= 0.55
  ctx.lineWidth = lw
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw()
  ctx.globalAlpha /= 0.55
}

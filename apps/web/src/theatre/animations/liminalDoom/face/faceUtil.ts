import { clamp } from '../types'

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
  line: string
  shadow: string
  blush: string
  sclera: string
  iris: string
  irisRing: string
  pupil: string
  lip: string
  lipHi: string
  mouthInner: string
  tooth: string
}

export function faceColors(seed: number, talk: number, distort: number): FaceColors {
  const h = faceHash
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
    fillHi: `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${(lit + 12).toFixed(1)}%)`,
    line: `hsl(${shadowHue.toFixed(1)} 38% 14%)`,
    shadow: `hsla(${shadowHue.toFixed(1)} 50% 22% ${0.22 + distort * 0.08})`,
    blush: `hsla(${blushHue.toFixed(1)} 65% 58% ${0.12 + distort * 0.05})`,
    sclera: `hsl(${(hue + 35).toFixed(1)} 18% 96%)`,
    iris: `hsl(${irisHue.toFixed(1)} 62% 48%)`,
    irisRing: `hsl(${irisHue.toFixed(1)} 70% 32%)`,
    pupil: `hsl(${shadowHue.toFixed(1)} 35% 10%)`,
    lip: `hsl(${lipHue.toFixed(1)} 65% ${38 + talkBoost * 16}%)`,
    lipHi: `hsl(${lipHue.toFixed(1)} 55% ${52 + talkBoost * 12}%)`,
    mouthInner: `hsla(${shadowHue.toFixed(1)} 40% 12% 0.88)`,
    tooth: `hsl(${(hue + 18).toFixed(1)} 15% 94%)`,
  }
}

export function strokeInk(
  ctx: CacheCtx,
  col: FaceColors,
  lineW: number,
  draw: () => void,
) {
  ctx.strokeStyle = col.line
  ctx.lineWidth = lineW
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw()
}

import { resolveFashion } from './fashion'
import { drawStyledBodyDetailed, headAnchorDetailed } from './bodyDraw'
import { hash01 } from './types'

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

const STYLES: BodyStyle[] = ['punk', 'neon', 'classic', 'thrift', 'street', 'formal']

export function resolveBodyStyle(seed: number, salt: number): BodyStyle {
  return STYLES[Math.floor(hash01(seed, salt) * STYLES.length)]
}

export function resolveGender(seed: number, salt: number): BodyGender {
  return hash01(seed, salt) > 0.52 ? 'female' : 'male'
}

/** Feet at (x, y). scale ≈ stage.width/400. */
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
  simpleHead = true,
) {
  const fashion = resolveFashion(look.style, look.gender, look.seed)
  drawStyledBodyDetailed(ctx, x, y, scale, look, fashion, energy, timeMs, wanderAmp, alpha, simpleHead)
}

export function headAnchor(x: number, y: number, scale: number, look: BodyLook) {
  return headAnchorDetailed(x, y, scale, look.gender === 'female')
}

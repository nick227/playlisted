import type { BodyLook } from '../bodies'
import { drawStyledBodyDetailed, headAnchorDetailed } from '../bodyDraw'
import { drawFace } from '../faces'
import type { FaceConfig, FaceCacheEntry } from '../faces'
import type { ResolvedCharacter } from './types'

export function toBodyLook(c: ResolvedCharacter): BodyLook {
  return {
    gender: c.gender,
    style: c.style,
    activity: c.activity,
    seed: c.seed,
  }
}

export function drawCharacterBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  c: ResolvedCharacter,
  energy: number,
  timeMs: number,
  wanderAmp: number,
  alpha: number,
  simpleHead: boolean,
) {
  const look = toBodyLook(c)
  const bodyScale = scale * (1 + (c.modifiers.scaleBias ?? 0))
  drawStyledBodyDetailed(
    ctx, x, y, bodyScale, look, c.fashion, energy, timeMs, wanderAmp, alpha, simpleHead, c.body,
  )
}

export function characterHeadAnchor(x: number, y: number, scale: number, c: ResolvedCharacter) {
  const bodyScale = scale * (1 + (c.modifiers.scaleBias ?? 0))
  return headAnchorDetailed(x, y, bodyScale, c.gender === 'female', c.body)
}

export function drawCharacterFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  config: FaceConfig,
  c: ResolvedCharacter,
  cache?: FaceCacheEntry,
) {
  drawFace(ctx, x, y, scale, config, cache, c.face, c.eyes, c.mouth)
}

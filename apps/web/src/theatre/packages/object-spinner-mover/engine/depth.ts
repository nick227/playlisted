import type { TheatreObject } from './types'

export type DepthBandConfig = { scale: number; speed: number; alpha: number; blur: number }

const BAND_CONFIGS: DepthBandConfig[] = [
  { scale: 0.85, speed: 0.65, alpha: 0.65, blur: 0 },
  { scale: 1.15, speed: 1.0, alpha: 0.9, blur: 0 },
  { scale: 1.45, speed: 1.2, alpha: 1.0, blur: 0 },
]

export function getDepthConfig(zBand: number, bandCount: number): DepthBandConfig {
  const idx = Math.min(bandCount - 1, Math.max(0, zBand))
  if (bandCount === 3) return BAND_CONFIGS[idx]!
  const t = idx / Math.max(1, bandCount - 1)
  return {
    scale: 0.5 + t * 0.85,
    speed: 0.6 + t * 0.7,
    alpha: 0.5 + t * 0.5,
    blur: t > 0.66 ? 0 : 0,
  }
}

export function assignDepthBand(index: number, bandCount: number): number {
  return index % bandCount
}

export function applyDepthToMotion(obj: TheatreObject, bandCount: number) {
  const cfg = getDepthConfig(obj.zBand, bandCount)
  obj.vx *= cfg.speed
  obj.vy *= cfg.speed
  obj.rotSpeed *= cfg.speed
}

export function objectRenderScale(obj: TheatreObject, bandCount: number): number {
  const cfg = getDepthConfig(obj.zBand, bandCount)
  return obj.baseScale * cfg.scale * obj.scalePulse
}

export function objectRenderAlpha(obj: TheatreObject, bandCount: number): number {
  return getDepthConfig(obj.zBand, bandCount).alpha
}

export function objectRenderBlur(obj: TheatreObject, bandCount: number): number {
  return getDepthConfig(obj.zBand, bandCount).blur
}

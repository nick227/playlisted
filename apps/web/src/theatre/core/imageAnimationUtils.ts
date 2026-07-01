import type { AnimationContext } from './IAnimation'

export const IMAGE_FALLBACK_GRADIENT =
  'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(48,48,72,0.55) 0%, rgba(12,12,18,1) 70%)'

export function resolveImageUrl(context: AnimationContext): string | null {
  const fromOptions = context.options?.imageUrl
  if (typeof fromOptions === 'string' && fromOptions.trim().length > 0) {
    return fromOptions.trim()
  }
  const artwork = context.artworkUrl
  if (typeof artwork === 'string' && artwork.trim().length > 0) {
    return artwork.trim()
  }
  return null
}

export type ImageFrameTransform = {
  scale: number
  translateXPercent: number
  translateYPercent: number
  brightness: number
}

export function computeImageFrameTransform(input: {
  elapsedMs: number
  reducedMotion: boolean
  lowPower: boolean
  energy: number
  beatEdge: boolean
}): ImageFrameTransform {
  if (input.reducedMotion || input.lowPower) {
    return { scale: 1, translateXPercent: 0, translateYPercent: 0, brightness: 1 }
  }

  const t = input.elapsedMs / 1000
  const baseScale = 1.05
  const driftScale = Math.sin(t / 24) * 0.018
  const translateXPercent = Math.sin(t / 32) * 1.6
  const translateYPercent = Math.cos(t / 28) * 1.3
  let scale = baseScale + driftScale
  if (input.beatEdge) {
    scale += input.energy * 0.014
  } else {
    scale += input.energy * 0.006
  }
  const brightness = 1 + Math.min(0.12, input.energy * 0.1)
  return { scale, translateXPercent, translateYPercent, brightness }
}

export function formatImageTransform(transform: ImageFrameTransform): string {
  const { scale, translateXPercent, translateYPercent } = transform
  return `translate(${translateXPercent}%, ${translateYPercent}%) scale(${scale})`
}

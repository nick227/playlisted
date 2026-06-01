export function isReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function quantize(value: number, step: number): number {
  if (step <= 0) return value
  return Math.floor(value / step) * step
}

export function stepped(value: number, steps: number): number {
  if (steps <= 1) return value
  return Math.round(value * (steps - 1)) / (steps - 1)
}

export const frameHold = quantize

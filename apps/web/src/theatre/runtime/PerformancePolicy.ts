export type PerformancePolicy = {
  maxLayers: number
  dprClamp: number
  particleScale: number
  lowPower: boolean
}

const FULL: PerformancePolicy = { maxLayers: 3, dprClamp: 2,   particleScale: 1,    lowPower: false }
const LITE: PerformancePolicy = { maxLayers: 2, dprClamp: 1.5, particleScale: 0.5,  lowPower: false }
const LOW:  PerformancePolicy = { maxLayers: 1, dprClamp: 1,   particleScale: 0.25, lowPower: true  }
const CALM: PerformancePolicy = { maxLayers: 1, dprClamp: 1.5, particleScale: 0,    lowPower: false }

export function detectPolicy(reducedMotion = false): PerformancePolicy {
  if (reducedMotion) return CALM

  try {
    const conn = (navigator as any).connection
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
      return LOW
    }
    if (conn?.effectiveType === '3g') return LITE
  } catch { /* navigator.connection unavailable */ }

  // Small-screen / low-DPR heuristic for low-end devices
  if ((window.screen.width * window.screen.height) < 600 * 400) return LOW

  return FULL
}

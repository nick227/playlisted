import type { Features } from './AudioFeatureExtractor'

export type TriggerFrame = {
  bassHit: boolean
  midsHit: boolean
  highsHit: boolean
  beat: boolean
  chaosHit: boolean
  energy: number
  brightness: number
}

type Preset = { bassFlux: number; midsFlux: number; highsFlux: number; env: number; multiplier: number }

const PRESETS: Record<string, Preset> = {
  tame: { bassFlux: 0.06, midsFlux: 0.06, highsFlux: 0.06, env: 0.05, multiplier: 0.8 },
  vivid: { bassFlux: 0.035, midsFlux: 0.035, highsFlux: 0.035, env: 0.03, multiplier: 1.0 },
  chaos: { bassFlux: 0.02, midsFlux: 0.02, highsFlux: 0.02, env: 0.02, multiplier: 1.6 },
  nightmare: { bassFlux: 0.01, midsFlux: 0.01, highsFlux: 0.01, env: 0.01, multiplier: 2.4 },
}

export function getVisualTriggers(features?: Features | any, presetName = 'vivid'): TriggerFrame {
  const preset = PRESETS[presetName] || PRESETS.vivid
  if (!features) {
    // fallback: gentle oscillation
    const t = Date.now()
    const energy = (Math.abs(Math.sin(t / 500)) + 0.1) * 0.5
    return {
      bassHit: Math.random() < 0.02,
      midsHit: Math.random() < 0.02,
      highsHit: Math.random() < 0.02,
      beat: Math.random() < 0.01,
      chaosHit: Math.random() < 0.002,
      energy,
      brightness: 0.5,
    }
  }

  const env = features.env || features.rms || 0
  const flux = (features.flux && features.flux.overall) || 0
  const bassFlux = (features.flux && features.flux.bass) || 0
  const midsFlux = (features.flux && features.flux.mids) || 0
  const highsFlux = (features.flux && features.flux.highs) || 0
  const bands = features.bands || { bass: 0, mids: 0, highs: 0 }

  const energy = Math.min(1, env * 1.4 + flux * 2.0)

  const bassHit = bassFlux > preset.bassFlux || bands.bass > preset.env * 1.8
  const midsHit = midsFlux > preset.midsFlux || bands.mids > preset.env * 1.6
  const highsHit = highsFlux > preset.highsFlux || bands.highs > preset.env * 1.4
  const beat = bassFlux > preset.bassFlux * 2.2 || flux > 0.12 * preset.multiplier
  const chaosHit = flux > 0.18 * preset.multiplier || env > 0.22 * preset.multiplier

  const brightness = features.centroid || 0

  return { bassHit, midsHit, highsHit, beat, chaosHit, energy, brightness }
}

export default getVisualTriggers

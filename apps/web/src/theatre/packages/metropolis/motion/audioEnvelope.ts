import { expSmooth } from './expSmooth'
import type { MetropolisAudio } from '../world/types'

export type AudioEnvelope = {
  bass: number
  mids: number
  highs: number
  energy: number
}

export function createAudioEnvelope(): AudioEnvelope {
  return { bass: 0, mids: 0, highs: 0, energy: 0 }
}

export function updateAudioEnvelope(
  env: AudioEnvelope,
  target: MetropolisAudio,
  deltaMs: number,
): AudioEnvelope {
  return {
    bass: expSmooth(env.bass, target.bass, deltaMs, 90),
    mids: expSmooth(env.mids, target.mids, deltaMs, 100),
    highs: expSmooth(env.highs, target.highs, deltaMs, 75),
    energy: expSmooth(env.energy, target.energy, deltaMs, 140),
  }
}

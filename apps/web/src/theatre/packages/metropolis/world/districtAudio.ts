import type { DistrictId } from './types'
import type { MetropolisAudio } from './types'

export type DistrictAudioWeights = {
  bass: number
  mids: number
  highs: number
  energy: number
  chaos: number
}

export const DISTRICT_AUDIO_WEIGHTS: Record<DistrictId, DistrictAudioWeights> = {
  clubRow: { bass: 1.45, mids: 1.15, highs: 0.85, energy: 1.2, chaos: 0.65 },
  strip: { bass: 1.25, mids: 1.0, highs: 1.15, energy: 1.25, chaos: 0.75 },
  theatre: { bass: 0.95, mids: 1.1, highs: 0.9, energy: 1.05, chaos: 0.5 },
  venue: { bass: 1.2, mids: 1.05, highs: 0.95, energy: 1.15, chaos: 0.6 },
  horror: { bass: 0.55, mids: 0.65, highs: 0.5, energy: 0.65, chaos: 1.55 },
  haze: { bass: 0.7, mids: 0.85, highs: 0.75, energy: 0.8, chaos: 1.2 },
  projects: { bass: 0.85, mids: 0.75, highs: 0.6, energy: 0.75, chaos: 1.1 },
  industrial: { bass: 1.05, mids: 0.8, highs: 0.55, energy: 0.85, chaos: 0.7 },
  rust: { bass: 0.75, mids: 0.7, highs: 0.65, energy: 0.7, chaos: 0.85 },
  waterfront: { bass: 0.65, mids: 0.75, highs: 1.25, energy: 0.9, chaos: 0.55 },
  core: { bass: 0.9, mids: 0.95, highs: 0.85, energy: 1.1, chaos: 0.6 },
  park: { bass: 0.35, mids: 0.4, highs: 0.45, energy: 0.35, chaos: 0.3 },
}

const NIGHTLIFE: DistrictId[] = ['strip', 'clubRow', 'theatre', 'venue']
const HORROR_ZONE: DistrictId[] = ['horror', 'haze']
const WATERFRONT_ZONE: DistrictId[] = ['waterfront']

export function isNightlifeDistrict(district: DistrictId): boolean {
  return NIGHTLIFE.includes(district)
}

export function isHorrorDistrict(district: DistrictId): boolean {
  return HORROR_ZONE.includes(district)
}

export function isWaterfrontDistrict(district: DistrictId): boolean {
  return WATERFRONT_ZONE.includes(district)
}

export function districtAudioPulse(
  district: DistrictId,
  audio: Pick<MetropolisAudio, 'bass' | 'mids' | 'highs' | 'energy'>,
): number {
  const w = DISTRICT_AUDIO_WEIGHTS[district]
  return 0.38
    + audio.bass * w.bass * 0.32
    + audio.mids * w.mids * 0.18
    + audio.highs * w.highs * 0.14
    + audio.energy * w.energy * 0.22
}

export function districtNeonBoost(district: DistrictId, neonSurge: number): number {
  if (neonSurge <= 0) return 1
  const w = DISTRICT_AUDIO_WEIGHTS[district]
  if (isNightlifeDistrict(district)) return 1 + neonSurge * 0.95 * w.highs
  if (isWaterfrontDistrict(district)) return 1 + neonSurge * 0.35 * w.highs
  return 1 + neonSurge * 0.12
}

export function districtChaosFlicker(district: DistrictId, chaos: boolean): number {
  if (!chaos) return 1
  return 1 + DISTRICT_AUDIO_WEIGHTS[district].chaos * 0.35
}

export function districtHorrorIntensity(district: DistrictId, horror: number): number {
  if (horror <= 0 || !isHorrorDistrict(district)) return 0
  return horror * DISTRICT_AUDIO_WEIGHTS[district].chaos
}

export function districtStrobeIntensity(district: DistrictId, strobe: number): number {
  if (strobe <= 0 || !isNightlifeDistrict(district)) return 0
  return strobe * DISTRICT_AUDIO_WEIGHTS[district].bass
}

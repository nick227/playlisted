import { describe, expect, it } from 'vitest'

import {
  districtAudioPulse,
  districtNeonBoost,
  districtStrobeIntensity,
  isNightlifeDistrict,
} from '../packages/metropolis/world/districtAudio'

describe('metropolis district audio', () => {
  it('clubRow pulses stronger on bass than park', () => {
    const audio = { bass: 1, mids: 0, highs: 0, energy: 0 }
    expect(districtAudioPulse('clubRow', audio)).toBeGreaterThan(districtAudioPulse('park', audio))
  })

  it('neon surge boosts nightlife districts most', () => {
    expect(districtNeonBoost('strip', 1)).toBeGreaterThan(districtNeonBoost('industrial', 1))
  })

  it('strobe intensity targets nightlife only', () => {
    expect(districtStrobeIntensity('clubRow', 1)).toBeGreaterThan(0)
    expect(districtStrobeIntensity('park', 1)).toBe(0)
    expect(isNightlifeDistrict('theatre')).toBe(true)
  })
})

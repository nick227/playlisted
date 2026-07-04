import { describe, expect, it } from 'vitest'

import { expSmooth } from '../packages/metropolis/motion/expSmooth'
import { updateAudioEnvelope, createAudioEnvelope } from '../packages/metropolis/motion/audioEnvelope'

describe('metropolis motion smooth', () => {
  it('expSmooth approaches target over time', () => {
    let v = 0
    for (let i = 0; i < 20; i++) v = expSmooth(v, 1, 16, 80)
    expect(v).toBeGreaterThan(0.85)
    expect(v).toBeLessThan(1)
  })

  it('audio envelope lags sharp input', () => {
    let env = createAudioEnvelope()
    env = updateAudioEnvelope(env, { bass: 1, mids: 0, highs: 0, energy: 1, beat: false, chaos: false }, 16)
    expect(env.bass).toBeGreaterThan(0)
    expect(env.bass).toBeLessThan(1)
  })
})

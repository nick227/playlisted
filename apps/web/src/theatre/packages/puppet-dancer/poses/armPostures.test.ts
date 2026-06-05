import { describe, expect, it } from 'vitest'

import { ARM_POSTURE_IDS, ARM_POSTURES, pickArmPosture } from './armPostures'

describe('puppet arm postures', () => {
  it('defines distinct arm configurations for each posture id', () => {
    for (const id of ARM_POSTURE_IDS) {
      const posture = ARM_POSTURES[id]
      expect(posture.leftShoulder).toBeTypeOf('number')
      expect(posture.rightShoulder).toBeTypeOf('number')
    }

    expect(ARM_POSTURES.leftUpRightDown.leftShoulder).toBeGreaterThan(ARM_POSTURES.leftUpRightDown.rightShoulder)
    expect(ARM_POSTURES.rightUpLeftDown.rightShoulder).toBeGreaterThan(ARM_POSTURES.rightUpLeftDown.leftShoulder)
    expect(ARM_POSTURES.bothUp.leftShoulder).toBeGreaterThan(ARM_POSTURES.bothDown.leftShoulder)
    expect(ARM_POSTURES.bothUp.rightShoulder).toBeLessThan(ARM_POSTURES.bothDown.rightShoulder)
  })

  it('can pick music-biased postures without throwing', () => {
    const highsUp = pickArmPosture({ highs: 0.9 })
    const bassDown = pickArmPosture({ bass: 0.9 })
    expect(ARM_POSTURE_IDS).toContain(highsUp)
    expect(ARM_POSTURE_IDS).toContain(bassDown)
  })
})

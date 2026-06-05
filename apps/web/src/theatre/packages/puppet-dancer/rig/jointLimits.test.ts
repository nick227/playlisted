import { describe, expect, it } from 'vitest'

import { JOINT_LIMITS, clampJointAngle } from './jointLimits'

describe('puppet joint limits', () => {
  it('allows full 360 rotation on shoulders and elbows', () => {
    for (const joint of ['leftShoulder', 'leftElbow', 'rightShoulder', 'rightElbow'] as const) {
      expect(JOINT_LIMITS[joint]).toEqual({ min: -360, max: 360 })
      expect(clampJointAngle(joint, -270)).toBe(-270)
      expect(clampJointAngle(joint, 315)).toBe(315)
    }
  })

  it('expands hip and knee ranges beyond the old procedural clamps', () => {
    expect(clampJointAngle('leftHip', 12)).toBe(12)
    expect(clampJointAngle('leftHip', 228)).toBe(228)
    expect(clampJointAngle('leftKnee', -28)).toBe(-28)
    expect(clampJointAngle('leftKnee', 205)).toBe(205)
    expect(clampJointAngle('rightHip', -72)).toBe(-72)
    expect(clampJointAngle('rightKnee', -42)).toBe(-42)
  })
})

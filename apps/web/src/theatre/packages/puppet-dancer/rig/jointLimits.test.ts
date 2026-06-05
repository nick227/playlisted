import { describe, expect, it } from 'vitest'

import { LEFT_ATTACH, RIGHT_ATTACH } from './armAttach'
import { JOINT_LIMITS, SHOULDER_LATERAL_SPREAD, clampJointAngle } from './jointLimits'

describe('puppet joint limits', () => {
  it('keeps shoulders near their lateral attach points', () => {
    expect(JOINT_LIMITS.leftShoulder).toEqual({
      min: LEFT_ATTACH - SHOULDER_LATERAL_SPREAD,
      max: LEFT_ATTACH + SHOULDER_LATERAL_SPREAD,
    })
    expect(JOINT_LIMITS.rightShoulder?.min).toBe(RIGHT_ATTACH - 80)
    expect(JOINT_LIMITS.rightShoulder?.max).toBe(RIGHT_ATTACH + SHOULDER_LATERAL_SPREAD)

    expect(clampJointAngle('leftShoulder', 90)).toBe(LEFT_ATTACH - SHOULDER_LATERAL_SPREAD)
    expect(clampJointAngle('leftShoulder', 250)).toBe(LEFT_ATTACH + SHOULDER_LATERAL_SPREAD)
    expect(clampJointAngle('rightShoulder', -120)).toBe(RIGHT_ATTACH - 80)
    expect(clampJointAngle('rightShoulder', 80)).toBe(RIGHT_ATTACH + SHOULDER_LATERAL_SPREAD)
  })

  it('blocks extreme elbow folds while keeping authored arm postures valid', () => {
    expect(clampJointAngle('leftElbow', -56)).toBe(-56)
    expect(clampJointAngle('leftElbow', 124)).toBe(124)
    expect(clampJointAngle('rightElbow', -168)).toBe(-168)
    expect(clampJointAngle('leftElbow', 220)).toBe(168)
    expect(clampJointAngle('rightElbow', -220)).toBe(-182)
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

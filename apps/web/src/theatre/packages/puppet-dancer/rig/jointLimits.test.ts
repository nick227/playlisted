import { describe, expect, it } from 'vitest'

import {
  LEFT_SHOULDER_FORWARD_MAX,
  LEFT_SHOULDER_FORWARD_MIN,
  RIGHT_SHOULDER_FORWARD_MAX,
  RIGHT_SHOULDER_FORWARD_MIN,
} from './armAttach'
import {
  JOINT_LIMITS,
  LEFT_ELBOW_MAX,
  LEFT_ELBOW_MIN,
  LEFT_WRIST_MAX,
  RIGHT_ELBOW_MAX,
  RIGHT_ELBOW_MIN,
  RIGHT_WRIST_MIN,
  clampJointAngle,
  lerpJointAngle,
} from './jointLimits'

describe('puppet joint limits', () => {
  it('allows wide shoulder rotation arcs', () => {
    expect(JOINT_LIMITS.leftShoulder).toEqual({
      min: LEFT_SHOULDER_FORWARD_MIN,
      max: LEFT_SHOULDER_FORWARD_MAX,
    })
    expect(JOINT_LIMITS.rightShoulder).toEqual({
      min: RIGHT_SHOULDER_FORWARD_MIN,
      max: RIGHT_SHOULDER_FORWARD_MAX,
    })

    expect(clampJointAngle('leftShoulder', 40)).toBe(40)
    expect(clampJointAngle('leftShoulder', 250)).toBe(250)
    expect(clampJointAngle('rightShoulder', -90)).toBe(-90)
    expect(clampJointAngle('rightShoulder', 140)).toBe(140)
    expect(clampJointAngle('leftShoulder', -20)).toBe(LEFT_SHOULDER_FORWARD_MIN)
    expect(clampJointAngle('leftShoulder', 330)).toBe(LEFT_SHOULDER_FORWARD_MAX)
    expect(clampJointAngle('rightShoulder', -140)).toBe(RIGHT_SHOULDER_FORWARD_MIN)
    expect(clampJointAngle('rightShoulder', 220)).toBe(RIGHT_SHOULDER_FORWARD_MAX)
  })

  it('keeps arm segment directions on their own side of the body', () => {
    expect(clampJointAngle('leftElbow', 130)).toBe(130)
    expect(clampJointAngle('leftElbow', 235)).toBe(235)
    expect(clampJointAngle('leftElbow', 285)).toBe(285)
    expect(clampJointAngle('rightElbow', 50)).toBe(50)
    expect(clampJointAngle('rightElbow', -55)).toBe(-55)
    expect(clampJointAngle('rightElbow', -105)).toBe(-105)
    expect(clampJointAngle('leftElbow', -56)).toBe(LEFT_ELBOW_MIN)
    expect(clampJointAngle('rightElbow', 140)).toBe(RIGHT_ELBOW_MAX)
    expect(clampJointAngle('leftElbow', 320)).toBe(LEFT_ELBOW_MAX)
    expect(clampJointAngle('rightElbow', -220)).toBe(RIGHT_ELBOW_MIN)
    expect(clampJointAngle('leftWrist', 320)).toBe(LEFT_WRIST_MAX)
    expect(clampJointAngle('rightWrist', -220)).toBe(RIGHT_WRIST_MIN)
  })

  it('lerps shoulders inside the wide arc without wrapping through the body', () => {
    expect(lerpJointAngle('leftShoulder', 250, 94, 0.5)).toBe(172)
    expect(lerpJointAngle('rightShoulder', -90, 42, 0.5)).toBe(-24)
    expect(lerpJointAngle('leftShoulder', 250, 94, 0.5)).toBeGreaterThanOrEqual(LEFT_SHOULDER_FORWARD_MIN)
    expect(lerpJointAngle('leftShoulder', 250, 94, 0.5)).toBeLessThanOrEqual(LEFT_SHOULDER_FORWARD_MAX)
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

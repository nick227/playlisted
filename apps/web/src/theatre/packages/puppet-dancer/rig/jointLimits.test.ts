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
  RIGHT_ELBOW_MAX,
  RIGHT_ELBOW_MIN,
  clampJointAngle,
  lerpJointAngle,
} from './jointLimits'

describe('puppet joint limits', () => {
  it('keeps shoulders in the forward arc away from the body', () => {
    expect(JOINT_LIMITS.leftShoulder).toEqual({
      min: LEFT_SHOULDER_FORWARD_MIN,
      max: LEFT_SHOULDER_FORWARD_MAX,
    })
    expect(JOINT_LIMITS.rightShoulder).toEqual({
      min: RIGHT_SHOULDER_FORWARD_MIN,
      max: RIGHT_SHOULDER_FORWARD_MAX,
    })

    expect(clampJointAngle('leftShoulder', 40)).toBe(LEFT_SHOULDER_FORWARD_MIN)
    expect(clampJointAngle('leftShoulder', 250)).toBe(LEFT_SHOULDER_FORWARD_MAX)
    expect(clampJointAngle('rightShoulder', -90)).toBe(RIGHT_SHOULDER_FORWARD_MIN)
    expect(clampJointAngle('rightShoulder', 140)).toBe(RIGHT_SHOULDER_FORWARD_MAX)
  })

  it('blocks elbow folds that pull the forearm across the torso', () => {
    expect(clampJointAngle('leftElbow', -56)).toBe(-56)
    expect(clampJointAngle('leftElbow', 100)).toBe(100)
    expect(clampJointAngle('rightElbow', -88)).toBe(-88)
    expect(clampJointAngle('leftElbow', 124)).toBe(LEFT_ELBOW_MAX)
    expect(clampJointAngle('rightElbow', -168)).toBe(RIGHT_ELBOW_MIN)
    expect(clampJointAngle('leftElbow', 220)).toBe(LEFT_ELBOW_MAX)
    expect(clampJointAngle('rightElbow', -220)).toBe(RIGHT_ELBOW_MIN)
  })

  it('lerps shoulders inside the forward arc without wrapping through the body', () => {
    expect(lerpJointAngle('leftShoulder', 250, 94, 0.5)).toBe(142)
    expect(lerpJointAngle('rightShoulder', -90, 42, 0.5)).toBe(16)
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

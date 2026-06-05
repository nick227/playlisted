import {
  LEFT_SHOULDER_FORWARD_MAX,
  LEFT_SHOULDER_FORWARD_MIN,
  RIGHT_SHOULDER_FORWARD_MAX,
  RIGHT_SHOULDER_FORWARD_MIN,
} from './armAttach'
import type { PuppetJointId } from './rigTypes'

export type JointLimit = {
  min: number
  max: number
}

/** Arm joints are absolute segment directions in canvas space, not anatomical bend deltas. */
export const LEFT_ELBOW_MIN = 65
export const LEFT_ELBOW_MAX = 295
export const RIGHT_ELBOW_MIN = -115
export const RIGHT_ELBOW_MAX = 125
export const LEFT_WRIST_MIN = 55
export const LEFT_WRIST_MAX = 305
export const RIGHT_WRIST_MIN = -125
export const RIGHT_WRIST_MAX = 135

/** Authoritative rotation ranges for pose solving and procedural generation. */
export const JOINT_LIMITS: Partial<Record<PuppetJointId, JointLimit>> = {
  leftShoulder: { min: LEFT_SHOULDER_FORWARD_MIN, max: LEFT_SHOULDER_FORWARD_MAX },
  rightShoulder: { min: RIGHT_SHOULDER_FORWARD_MIN, max: RIGHT_SHOULDER_FORWARD_MAX },
  leftElbow: { min: LEFT_ELBOW_MIN, max: LEFT_ELBOW_MAX },
  rightElbow: { min: RIGHT_ELBOW_MIN, max: RIGHT_ELBOW_MAX },
  leftWrist: { min: LEFT_WRIST_MIN, max: LEFT_WRIST_MAX },
  rightWrist: { min: RIGHT_WRIST_MIN, max: RIGHT_WRIST_MAX },
  leftHip: { min: 0, max: 240 },
  leftKnee: { min: -40, max: 220 },
  rightHip: { min: -90, max: 170 },
  rightKnee: { min: -50, max: 210 },
}

export function clampJointAngle(id: PuppetJointId, angle: number): number {
  const limit = JOINT_LIMITS[id]
  if (!limit) return angle
  return Math.max(limit.min, Math.min(limit.max, angle))
}

export function clampJointAngles(angles: Partial<Record<PuppetJointId, number>>): Partial<Record<PuppetJointId, number>> {
  const out: Partial<Record<PuppetJointId, number>> = {}
  for (const [id, angle] of Object.entries(angles)) {
    if (angle === undefined) continue
    out[id as PuppetJointId] = clampJointAngle(id as PuppetJointId, angle)
  }
  return out
}

function lerpAngle(from: number, to: number, t: number) {
  const delta = ((((to - from) % 360) + 540) % 360) - 180
  return from + delta * t
}

/** Clamp endpoints first; limited joints interpolate linearly inside their arc (no wrap through the body). */
export function lerpJointAngle(id: PuppetJointId, from: number, to: number, t: number): number {
  const start = clampJointAngle(id, from)
  const end = clampJointAngle(id, to)
  if (JOINT_LIMITS[id]) return start + (end - start) * t
  return lerpAngle(start, end, t)
}

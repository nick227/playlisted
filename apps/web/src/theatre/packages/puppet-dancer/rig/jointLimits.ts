import { LEFT_ATTACH, RIGHT_ATTACH } from './armAttach'
import type { PuppetJointId } from './rigTypes'

export type JointLimit = {
  min: number
  max: number
}

/** Keep the upper arm on its side of the chest — prevents inward/double-folded shoulders. */
export const SHOULDER_LATERAL_SPREAD = 52

/** Authoritative rotation ranges for pose solving and procedural generation. */
export const JOINT_LIMITS: Partial<Record<PuppetJointId, JointLimit>> = {
  leftShoulder: {
    min: LEFT_ATTACH - SHOULDER_LATERAL_SPREAD,
    max: LEFT_ATTACH + SHOULDER_LATERAL_SPREAD,
  },
  rightShoulder: {
    min: RIGHT_ATTACH - 80,
    max: RIGHT_ATTACH + SHOULDER_LATERAL_SPREAD,
  },
  leftElbow: { min: -142, max: 168 },
  rightElbow: { min: -182, max: 152 },
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

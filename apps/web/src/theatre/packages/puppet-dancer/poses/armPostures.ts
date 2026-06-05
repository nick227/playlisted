import { LEFT_ATTACH, RIGHT_ATTACH } from '../rig/armAttach'
import { clampJointAngle } from '../rig/jointLimits'
import type { PuppetJointId } from '../rig/rigTypes'

export type ArmPostureId = 'leftUpRightDown' | 'rightUpLeftDown' | 'bothUp' | 'bothDown' | 'balanced'

export type ArmRotations = Pick<
  Record<PuppetJointId, number>,
  'leftShoulder' | 'leftElbow' | 'leftWrist' | 'rightShoulder' | 'rightElbow' | 'rightWrist'
>

/**
 * The rig solver uses absolute canvas angles (y grows downward).
 * Shoulders stay near 190° / -10° to attach on the correct side of the chest.
 * Negative elbow + wrist angles raise the hand; positive angles lower it.
 */
export { LEFT_ATTACH, RIGHT_ATTACH } from '../rig/armAttach'

export const ARM_POSTURE_IDS: ArmPostureId[] = [
  'leftUpRightDown',
  'rightUpLeftDown',
  'bothUp',
  'bothDown',
  'balanced',
]

/** Visual left raised, right lowered. */
export const ARM_POSTURES: Record<ArmPostureId, ArmRotations> = {
  leftUpRightDown: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: -56,
    leftWrist: -88,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: 124,
    rightWrist: 88,
  },
  rightUpLeftDown: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: 124,
    leftWrist: 88,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: -56,
    rightWrist: -88,
  },
  bothUp: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: -56,
    leftWrist: -88,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: -56,
    rightWrist: -88,
  },
  bothDown: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: 124,
    leftWrist: 88,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: 124,
    rightWrist: 88,
  },
  balanced: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: -12,
    leftWrist: -24,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: -168,
    rightWrist: -156,
  },
}

export function pickArmPosture(audio: { bass?: number; highs?: number; energy?: number } = {}): ArmPostureId {
  const bass = audio.bass ?? 0
  const highs = audio.highs ?? 0
  const roll = Math.random()

  if (highs > 0.42 && roll < 0.42) return 'bothUp'
  if (bass > 0.4 && roll < 0.36) return 'bothDown'
  if (roll < 0.2) return 'leftUpRightDown'
  if (roll < 0.4) return 'balanced'
  if (roll < 0.58) return 'bothUp'
  if (roll < 0.74) return 'bothDown'
  if (roll < 0.87) return 'rightUpLeftDown'
  return 'leftUpRightDown'
}

export function jitterArmPosture(
  posture: ArmRotations,
  wildness: number,
  amount = 10,
): ArmRotations {
  const spread = amount * wildness
  const jitter = (value: number) => value + (Math.random() * 2 - 1) * spread
  return {
    leftShoulder: clampJointAngle('leftShoulder', jitter(posture.leftShoulder)),
    leftElbow: clampJointAngle('leftElbow', jitter(posture.leftElbow)),
    leftWrist: jitter(posture.leftWrist),
    rightShoulder: clampJointAngle('rightShoulder', jitter(posture.rightShoulder)),
    rightElbow: clampJointAngle('rightElbow', jitter(posture.rightElbow)),
    rightWrist: jitter(posture.rightWrist),
  }
}

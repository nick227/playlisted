import type { PuppetJointId } from '../rig/rigTypes'

export type ArmPostureId = 'leftUpRightDown' | 'rightUpLeftDown' | 'bothUp' | 'bothDown' | 'balanced'

export type ArmRotations = Pick<
  Record<PuppetJointId, number>,
  'leftShoulder' | 'leftElbow' | 'leftWrist' | 'rightShoulder' | 'rightElbow' | 'rightWrist'
>

export const ARM_POSTURE_IDS: ArmPostureId[] = [
  'leftUpRightDown',
  'rightUpLeftDown',
  'bothUp',
  'bothDown',
  'balanced',
]

/** Canonical arm configurations — angle values match the rig's left-high / right-low convention. */
export const ARM_POSTURES: Record<ArmPostureId, ArmRotations> = {
  leftUpRightDown: {
    leftShoulder: 188,
    leftElbow: 124,
    leftWrist: 88,
    rightShoulder: -8,
    rightElbow: -56,
    rightWrist: -88,
  },
  rightUpLeftDown: {
    leftShoulder: 34,
    leftElbow: -42,
    leftWrist: -62,
    rightShoulder: 214,
    rightElbow: 148,
    rightWrist: 112,
  },
  bothUp: {
    leftShoulder: 228,
    leftElbow: 156,
    leftWrist: 122,
    rightShoulder: -92,
    rightElbow: -88,
    rightWrist: -68,
  },
  bothDown: {
    leftShoulder: 54,
    leftElbow: 98,
    leftWrist: 74,
    rightShoulder: -54,
    rightElbow: -98,
    rightWrist: -74,
  },
  balanced: {
    leftShoulder: 162,
    leftElbow: 108,
    leftWrist: 76,
    rightShoulder: 18,
    rightElbow: -40,
    rightWrist: -66,
  },
}

export function pickArmPosture(audio: { bass?: number; highs?: number; energy?: number } = {}): ArmPostureId {
  const bass = audio.bass ?? 0
  const highs = audio.highs ?? 0
  const roll = Math.random()

  if (highs > 0.42 && roll < 0.42) return 'bothUp'
  if (bass > 0.4 && roll < 0.36) return 'bothDown'
  if (roll < 0.18) return 'rightUpLeftDown'
  if (roll < 0.38) return 'balanced'
  if (roll < 0.56) return 'bothUp'
  if (roll < 0.72) return 'bothDown'
  if (roll < 0.86) return 'leftUpRightDown'
  return 'rightUpLeftDown'
}

export function jitterArmPosture(
  posture: ArmRotations,
  wildness: number,
  amount = 10,
): ArmRotations {
  const spread = amount * wildness
  const jitter = (value: number) => value + (Math.random() * 2 - 1) * spread
  return {
    leftShoulder: jitter(posture.leftShoulder),
    leftElbow: jitter(posture.leftElbow),
    leftWrist: jitter(posture.leftWrist),
    rightShoulder: jitter(posture.rightShoulder),
    rightElbow: jitter(posture.rightElbow),
    rightWrist: jitter(posture.rightWrist),
  }
}

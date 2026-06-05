import { LEFT_ATTACH, RIGHT_ATTACH } from '../rig/armAttach'
import { clampJointAngle } from '../rig/jointLimits'
import type { PuppetJointId } from '../rig/rigTypes'

export type ArmPostureId =
  | 'leftUpRightDown'
  | 'rightUpLeftDown'
  | 'bothUp'
  | 'bothDown'
  | 'balanced'
  | 'leftTopRightOut'
  | 'leftBottomRightOut'
  | 'rightTopLeftOut'
  | 'rightBottomLeftOut'

export type ArmRotations = Pick<
  Record<PuppetJointId, number>,
  'leftShoulder' | 'leftElbow' | 'leftWrist' | 'rightShoulder' | 'rightElbow' | 'rightWrist'
>

/**
 * The rig solver uses absolute canvas angles (y grows downward).
 * `leftElbow`/`rightElbow` and wrists are segment directions, not anatomical bend deltas.
 */
export { LEFT_ATTACH, RIGHT_ATTACH } from '../rig/armAttach'

export const ARM_POSTURE_IDS: ArmPostureId[] = [
  'leftUpRightDown',
  'rightUpLeftDown',
  'bothUp',
  'bothDown',
  'balanced',
  'leftTopRightOut',
  'leftBottomRightOut',
  'rightTopLeftOut',
  'rightBottomLeftOut',
]

export const ARM_DIRECTIONS = {
  leftTop: { elbow: 258, wrist: 270 },
  leftUp: { elbow: 228, wrist: 244 },
  leftOut: { elbow: 180, wrist: 178 },
  leftDown: { elbow: 132, wrist: 112 },
  leftBottom: { elbow: 104, wrist: 86 },
  rightTop: { elbow: -78, wrist: -90 },
  rightUp: { elbow: -48, wrist: -64 },
  rightOut: { elbow: 0, wrist: 2 },
  rightDown: { elbow: 48, wrist: 64 },
  rightBottom: { elbow: 76, wrist: 94 },
} as const

/** Visual left raised, right lowered. */
export const ARM_POSTURES: Record<ArmPostureId, ArmRotations> = {
  leftUpRightDown: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftUp.elbow,
    leftWrist: ARM_DIRECTIONS.leftUp.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightDown.elbow,
    rightWrist: ARM_DIRECTIONS.rightDown.wrist,
  },
  rightUpLeftDown: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftDown.elbow,
    leftWrist: ARM_DIRECTIONS.leftDown.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightUp.elbow,
    rightWrist: ARM_DIRECTIONS.rightUp.wrist,
  },
  bothUp: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftTop.elbow,
    leftWrist: ARM_DIRECTIONS.leftTop.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightTop.elbow,
    rightWrist: ARM_DIRECTIONS.rightTop.wrist,
  },
  bothDown: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftBottom.elbow,
    leftWrist: ARM_DIRECTIONS.leftBottom.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightBottom.elbow,
    rightWrist: ARM_DIRECTIONS.rightBottom.wrist,
  },
  balanced: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftOut.elbow,
    leftWrist: ARM_DIRECTIONS.leftOut.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightOut.elbow,
    rightWrist: ARM_DIRECTIONS.rightOut.wrist,
  },
  leftTopRightOut: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftTop.elbow,
    leftWrist: ARM_DIRECTIONS.leftTop.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightOut.elbow,
    rightWrist: ARM_DIRECTIONS.rightOut.wrist,
  },
  leftBottomRightOut: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftBottom.elbow,
    leftWrist: ARM_DIRECTIONS.leftBottom.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightOut.elbow,
    rightWrist: ARM_DIRECTIONS.rightOut.wrist,
  },
  rightTopLeftOut: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftOut.elbow,
    leftWrist: ARM_DIRECTIONS.leftOut.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightTop.elbow,
    rightWrist: ARM_DIRECTIONS.rightTop.wrist,
  },
  rightBottomLeftOut: {
    leftShoulder: LEFT_ATTACH,
    leftElbow: ARM_DIRECTIONS.leftOut.elbow,
    leftWrist: ARM_DIRECTIONS.leftOut.wrist,
    rightShoulder: RIGHT_ATTACH,
    rightElbow: ARM_DIRECTIONS.rightBottom.elbow,
    rightWrist: ARM_DIRECTIONS.rightBottom.wrist,
  },
}

export function pickArmPosture(audio: { bass?: number; highs?: number; energy?: number } = {}): ArmPostureId {
  const bass = audio.bass ?? 0
  const highs = audio.highs ?? 0
  const roll = Math.random()

  if (highs > 0.42 && roll < 0.42) return 'bothUp'
  if (bass > 0.4 && roll < 0.36) return 'bothDown'
  if (roll < 0.14) return 'leftUpRightDown'
  if (roll < 0.28) return 'rightUpLeftDown'
  if (roll < 0.42) return 'balanced'
  if (roll < 0.52) return 'leftTopRightOut'
  if (roll < 0.62) return 'rightTopLeftOut'
  if (roll < 0.72) return 'bothUp'
  if (roll < 0.82) return 'bothDown'
  if (roll < 0.9) return 'leftBottomRightOut'
  if (roll < 0.96) return 'rightBottomLeftOut'
  return 'leftUpRightDown'
}

export function jitterArmPosture(
  posture: ArmRotations,
  wildness: number,
  amount = 10,
): ArmRotations {
  const spread = amount * wildness * 0.65
  const jitter = (value: number) => value + (Math.random() * 2 - 1) * spread
  return {
    leftShoulder: clampJointAngle('leftShoulder', jitter(posture.leftShoulder)),
    leftElbow: clampJointAngle('leftElbow', jitter(posture.leftElbow)),
    leftWrist: clampJointAngle('leftWrist', jitter(posture.leftWrist)),
    rightShoulder: clampJointAngle('rightShoulder', jitter(posture.rightShoulder)),
    rightElbow: clampJointAngle('rightElbow', jitter(posture.rightElbow)),
    rightWrist: clampJointAngle('rightWrist', jitter(posture.rightWrist)),
  }
}

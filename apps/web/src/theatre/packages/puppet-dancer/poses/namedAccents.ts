import type { MotionAccentMap } from './poseTypes'

export const hipBounce: MotionAccentMap = {
  offset: { y: 10 },
  scale: 0.985,
  rotations: {
    hips: 6,
    leftHip: -6,
    rightHip: 6,
  },
}

export const headNod: MotionAccentMap = {
  rotations: {
    neck: -5,
    head: -12,
  },
  face: { mouth: 0.12, brows: 0.1 },
}

export const wristFlick: MotionAccentMap = {
  rotations: {
    leftWrist: 22,
    rightWrist: -22,
  },
  face: { eyes: -0.12, brows: 0.16 },
}

export const kneeDip: MotionAccentMap = {
  offset: { y: 16 },
  scale: 0.97,
  rotations: {
    leftKnee: 20,
    rightKnee: -20,
    leftAnkle: -10,
    rightAnkle: 10,
  },
}

export const shoulderPop: MotionAccentMap = {
  rotations: {
    chest: 5,
    leftShoulder: 9,
    rightShoulder: -9,
    leftElbow: 4,
    rightElbow: -4,
  },
}

export const chaosStretch: MotionAccentMap = {
  offset: { y: 12 },
  scale: 1.08,
  rotations: {
    hips: 14,
    chest: -18,
    head: 24,
    leftShoulder: 10,
    rightShoulder: -10,
    leftElbow: -12,
    rightElbow: 12,
    leftWrist: 28,
    rightWrist: -28,
  },
  face: { mouth: 0.5, brows: 0.45 },
}

export const namedAccents: Record<string, MotionAccentMap> = {
  hipBounce,
  headNod,
  wristFlick,
  kneeDip,
  shoulderPop,
  chaosStretch,
}

export function getNamedAccent(id: string): MotionAccentMap | null {
  return namedAccents[id] ?? null
}

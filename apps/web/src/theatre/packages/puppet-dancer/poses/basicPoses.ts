import type { PuppetPoseMap } from './poseTypes'
import { ARM_POSTURES } from './armPostures'
import { poseVariant } from './poseAuthoring'

export const idlePose: PuppetPoseMap = {
  id: 'idle',
  label: 'Idle',
  rotations: {
    root: -90, hips: 0, spine: -90, chest: -90, neck: -92, head: -88,
    ...ARM_POSTURES.balanced,
    leftHip: 150, leftKnee: 102, leftAnkle: 88,
    rightHip: 30, rightKnee: 78, rightAnkle: 92,
  },
  face: { eyes: 1, mouth: 0.2, brows: 0.35 },
}

export const leftStepPose: PuppetPoseMap = {
  id: 'leftStep',
  label: 'Left Step',
  offset: { x: -12, y: 8 },
  scale: 1.02,
  rotations: {
    hips: -6, spine: -94, chest: -100, neck: -98, head: -104,
    ...ARM_POSTURES.rightUpLeftDown,
    leftHip: 128, leftKnee: 76, leftAnkle: 102,
    rightHip: 48, rightKnee: 102, rightAnkle: 84,
  },
  face: { mouth: 0.55, brows: 0.7 },
}

export const rightStepPose: PuppetPoseMap = {
  id: 'rightStep',
  label: 'Right Step',
  offset: { x: 12, y: 8 },
  scale: 1.02,
  rotations: {
    hips: 6, spine: -86, chest: -80, neck: -82, head: -76,
    ...ARM_POSTURES.leftUpRightDown,
    leftHip: 132, leftKnee: 96, leftAnkle: 88,
    rightHip: 68, rightKnee: 126, rightAnkle: 76,
  },
  face: { mouth: 0.45, brows: 0.55 },
}

export const bouncePose: PuppetPoseMap = {
  id: 'bounce',
  label: 'Bounce',
  offset: { y: 16 },
  scale: 0.98,
  rotations: {
    hips: 0, spine: -88, chest: -92, neck: -90, head: -90,
    ...ARM_POSTURES.bothUp,
    leftHip: 138, leftKnee: 122, leftAnkle: 74,
    rightHip: 42, rightKnee: 58, rightAnkle: 106,
  },
  face: { eyes: 0.85, mouth: 0.7, brows: 0.8 },
}

export const robotPose: PuppetPoseMap = {
  id: 'robot',
  label: 'Robot',
  rotations: {
    hips: 0, spine: -90, chest: -76, neck: -76, head: -76,
    leftShoulder: 180, leftElbow: 105, leftWrist: 90,
    rightShoulder: -10, rightElbow: 0, rightWrist: -90,
    leftHip: 155, leftKnee: 88, leftAnkle: 88,
    rightHip: 25, rightKnee: 92, rightAnkle: 92,
  },
  face: { eyes: 1, mouth: 0.12, brows: 1 },
}

export const noodleLeftPose = poseVariant(leftStepPose, 'noodleLeft', 'Noodle Left', {
  rotations: {
    leftElbow: -24,
    leftWrist: -18,
    rightElbow: 18,
    rightWrist: 14,
    chest: 8,
    head: -7,
  },
  face: { mouth: 0.18, brows: -0.15 },
})

export const noodleRightPose = poseVariant(rightStepPose, 'noodleRight', 'Noodle Right', {
  rotations: {
    leftElbow: -16,
    leftWrist: -12,
    rightElbow: 20,
    rightWrist: 16,
    chest: -8,
    head: 7,
  },
  face: { mouth: 0.16, brows: -0.1 },
})

export const shimmyLeftPose = poseVariant(idlePose, 'shimmyLeft', 'Shimmy Left', {
  offset: { x: -6, y: 2 },
  rotations: {
    chest: -74,
    ...ARM_POSTURES.leftUpRightDown,
    hips: -4,
  },
  face: { mouth: 0.25, brows: 0.25 },
})

export const shimmyRightPose = poseVariant(idlePose, 'shimmyRight', 'Shimmy Right', {
  offset: { x: 6, y: 2 },
  rotations: {
    chest: -106,
    ...ARM_POSTURES.rightUpLeftDown,
    hips: 4,
  },
  face: { mouth: 0.22, brows: 0.2 },
})

export const bothUpPose: PuppetPoseMap = {
  id: 'bothUp',
  label: 'Both Arms Up',
  rotations: {
    ...idlePose.rotations,
    ...ARM_POSTURES.bothUp,
  },
  face: { eyes: 0.95, mouth: 0.55, brows: 0.65 },
}

export const bothDownPose: PuppetPoseMap = {
  id: 'bothDown',
  label: 'Both Arms Down',
  rotations: {
    ...idlePose.rotations,
    ...ARM_POSTURES.bothDown,
  },
  face: { eyes: 0.8, mouth: 0.25, brows: 0.3 },
}

export const balancedArmsPose: PuppetPoseMap = {
  id: 'balancedArms',
  label: 'Balanced Arms',
  rotations: {
    ...idlePose.rotations,
    ...ARM_POSTURES.balanced,
  },
  face: { eyes: 1, mouth: 0.28, brows: 0.4 },
}

export const leftLeadPose: PuppetPoseMap = {
  id: 'leftLead',
  label: 'Left Arm Lead',
  rotations: {
    ...idlePose.rotations,
    ...ARM_POSTURES.leftUpRightDown,
  },
  face: { eyes: 0.9, mouth: 0.42, brows: 0.5 },
}

export const rightLeadPose: PuppetPoseMap = {
  id: 'rightLead',
  label: 'Right Arm Lead',
  rotations: {
    ...idlePose.rotations,
    ...ARM_POSTURES.rightUpLeftDown,
  },
  face: { eyes: 0.9, mouth: 0.42, brows: 0.5 },
}

export const panicLowPose = poseVariant(bouncePose, 'panicLow', 'Knees Too Low', {
  offset: { y: 28 },
  scale: 0.93,
  rotations: {
    hips: 8,
    leftHip: -24,
    rightHip: 24,
    leftKnee: 38,
    rightKnee: -38,
    leftAnkle: -22,
    rightAnkle: 22,
    ...ARM_POSTURES.bothDown,
    head: -18,
  },
  face: { eyes: -0.35, mouth: 0.55, brows: 0.55 },
})

export const basicPoses = [
  idlePose,
  leftStepPose,
  rightStepPose,
  bothUpPose,
  bothDownPose,
  balancedArmsPose,
  leftLeadPose,
  rightLeadPose,
  bouncePose,
  robotPose,
  noodleLeftPose,
  noodleRightPose,
  shimmyLeftPose,
  shimmyRightPose,
  panicLowPose,
]

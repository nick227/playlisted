import type { PuppetJointId } from '../rig/rigTypes'

export type FaceState = {
  /** Compatibility alias: maps to eyeOpen when older maps set `eyes`. */
  eyes: number
  /** Compatibility alias: maps to mouthOpen when older maps set `mouth`. */
  mouth: number
  /** Compatibility alias: maps to brow lift when older maps set `brows`. */
  brows: number
  eyeOpen: number
  pupilX: number
  pupilY: number
  leftBrowLift: number
  rightBrowLift: number
  leftBrowRotate: number
  rightBrowRotate: number
  mouthOpen: number
  mouthSmile: number
  topLipY: number
  bottomLipY: number
  tongue: number
}

export type PuppetPoseMap = {
  id: string
  label: string
  rotations: Partial<Record<PuppetJointId, number>>
  offset?: { x?: number; y?: number }
  scale?: number
  face?: Partial<FaceState>
}

export type ResolvedPose = {
  angles: Record<PuppetJointId, number>
  offset: { x: number; y: number }
  scale: number
  face: FaceState
}

export type MotionAccentMap = {
  offset?: { x?: number; y?: number }
  scale?: number
  face?: Partial<FaceState>
  rotations?: Partial<Record<PuppetJointId, number>>
}

export type PosePatch = MotionAccentMap

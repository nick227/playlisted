import type { MotionAccentMap, PosePatch, PuppetPoseMap } from './poseTypes'
import type { PuppetJointId } from '../rig/rigTypes'

export function clonePose(pose: PuppetPoseMap, id: string, label: string): PuppetPoseMap {
  return {
    id,
    label,
    rotations: { ...pose.rotations },
    offset: pose.offset ? { ...pose.offset } : undefined,
    scale: pose.scale,
    face: pose.face ? { ...pose.face } : undefined,
  }
}

export function applyPosePatch(pose: PuppetPoseMap, patch: PosePatch): PuppetPoseMap {
  if (patch.offset) {
    pose.offset = {
      x: (pose.offset?.x ?? 0) + (patch.offset.x ?? 0),
      y: (pose.offset?.y ?? 0) + (patch.offset.y ?? 0),
    }
  }
  if (patch.scale !== undefined) pose.scale = (pose.scale ?? 1) * patch.scale
  if (patch.face) {
    pose.face = {
      eyes: (pose.face?.eyes ?? 1) + (patch.face.eyes ?? 0),
      mouth: (pose.face?.mouth ?? 0.2) + (patch.face.mouth ?? 0),
      brows: (pose.face?.brows ?? 0.35) + (patch.face.brows ?? 0),
    }
  }
  if (patch.rotations) {
    pose.rotations = { ...pose.rotations }
    for (const [joint, delta] of Object.entries(patch.rotations)) {
      const jointId = joint as PuppetJointId
      pose.rotations[jointId] = (pose.rotations[jointId] ?? 0) + (delta ?? 0)
    }
  }
  return pose
}

export function poseVariant(base: PuppetPoseMap, id: string, label: string, ...patches: PosePatch[]): PuppetPoseMap {
  const next = clonePose(base, id, label)
  patches.forEach(patch => applyPosePatch(next, patch))
  return next
}

export function mergeAccents(...accents: MotionAccentMap[]): MotionAccentMap {
  const out: MotionAccentMap = {}
  for (const accent of accents) {
    if (accent.offset) {
      out.offset = {
        x: (out.offset?.x ?? 0) + (accent.offset.x ?? 0),
        y: (out.offset?.y ?? 0) + (accent.offset.y ?? 0),
      }
    }
    if (accent.scale !== undefined) out.scale = (out.scale ?? 1) * accent.scale
    if (accent.face) {
      out.face = {
        eyes: (out.face?.eyes ?? 0) + (accent.face.eyes ?? 0),
        mouth: (out.face?.mouth ?? 0) + (accent.face.mouth ?? 0),
        brows: (out.face?.brows ?? 0) + (accent.face.brows ?? 0),
      }
    }
    if (accent.rotations) {
      out.rotations = { ...(out.rotations ?? {}) }
      for (const [joint, delta] of Object.entries(accent.rotations)) {
        const jointId = joint as PuppetJointId
        out.rotations[jointId] = (out.rotations[jointId] ?? 0) + (delta ?? 0)
      }
    }
  }
  return out
}

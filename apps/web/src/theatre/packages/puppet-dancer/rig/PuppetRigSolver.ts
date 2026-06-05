import type { ResolvedPose } from '../poses/poseTypes'
import type { PuppetRig, SolvedJoint } from './rigTypes'

function degToRad(value: number) {
  return (value * Math.PI) / 180
}

export class PuppetRigSolver {
  constructor(private rig: PuppetRig) {}

  solve(pose: ResolvedPose, rootX: number, rootY: number, scale: number): Map<string, SolvedJoint> {
    const solved = new Map<string, SolvedJoint>()
    for (const joint of this.rig.joints) {
      const parent = joint.parent ? solved.get(joint.parent) : null
      const originX = parent?.x ?? rootX
      const originY = parent?.y ?? rootY
      const angle = degToRad(pose.angles[joint.id] ?? joint.angle)
      const length = joint.length * scale
      const x = originX + Math.cos(angle) * length
      const y = originY + Math.sin(angle) * length
      solved.set(joint.id, {
        id: joint.id,
        x,
        y,
        angle,
        length,
        radius: (joint.radius ?? 5) * scale,
      })
    }
    return solved
  }
}


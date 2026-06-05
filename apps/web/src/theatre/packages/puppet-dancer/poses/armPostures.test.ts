import { describe, expect, it } from 'vitest'

import { humanRig } from '../rig/humanRig'
import { PuppetRigSolver } from '../rig/PuppetRigSolver'
import type { ResolvedPose } from './poseTypes'
import { ARM_POSTURE_IDS, ARM_POSTURES, pickArmPosture } from './armPostures'

function solveArms(posture: (typeof ARM_POSTURES)[keyof typeof ARM_POSTURES]) {
  const solver = new PuppetRigSolver(humanRig)
  const angles = {} as ResolvedPose['angles']
  for (const joint of humanRig.joints) angles[joint.id] = joint.angle
  Object.assign(angles, posture)

  const joints = solver.solve(
    {
      angles,
      offset: { x: 0, y: 0 },
      scale: 1,
      face: {
        eyes: 1,
        mouth: 0.2,
        brows: 0.35,
        eyeOpen: 1,
        pupilX: 0,
        pupilY: 0,
        leftBrowLift: 0.35,
        rightBrowLift: 0.35,
        leftBrowRotate: 0,
        rightBrowRotate: 0,
        mouthOpen: 0.2,
        mouthSmile: 0.18,
        topLipY: 0,
        bottomLipY: 0,
        tongue: 0,
      },
    },
    200,
    300,
    1,
  )

  const chest = joints.get('chest')!
  const leftWrist = joints.get('leftWrist')!
  const rightWrist = joints.get('rightWrist')!
  return {
    leftRaised: leftWrist.y < chest.y,
    rightRaised: rightWrist.y < chest.y,
    leftOutside: leftWrist.x < chest.x,
    rightOutside: rightWrist.x > chest.x,
  }
}

describe('puppet arm postures', () => {
  it('maps visual left-up/right-down correctly on canvas', () => {
    const pose = solveArms(ARM_POSTURES.leftUpRightDown)
    expect(pose.leftRaised).toBe(true)
    expect(pose.rightRaised).toBe(false)
    expect(pose.leftOutside).toBe(true)
    expect(pose.rightOutside).toBe(true)
  })

  it('maps visual right-up/left-down correctly on canvas', () => {
    const pose = solveArms(ARM_POSTURES.rightUpLeftDown)
    expect(pose.leftRaised).toBe(false)
    expect(pose.rightRaised).toBe(true)
    expect(pose.leftOutside).toBe(true)
    expect(pose.rightOutside).toBe(true)
  })

  it('raises both wrists for bothUp and lowers both for bothDown', () => {
    const up = solveArms(ARM_POSTURES.bothUp)
    const down = solveArms(ARM_POSTURES.bothDown)
    expect(up.leftRaised && up.rightRaised).toBe(true)
    expect(up.leftOutside && up.rightOutside).toBe(true)
    expect(down.leftRaised || down.rightRaised).toBe(false)
    expect(down.leftOutside && down.rightOutside).toBe(true)
  })

  it('supports single-side top and bottom arm directions', () => {
    const leftTop = solveArms(ARM_POSTURES.leftTopRightOut)
    const rightTop = solveArms(ARM_POSTURES.rightTopLeftOut)
    const leftBottom = solveArms(ARM_POSTURES.leftBottomRightOut)
    const rightBottom = solveArms(ARM_POSTURES.rightBottomLeftOut)

    expect(leftTop.leftRaised && leftTop.leftOutside && leftTop.rightOutside).toBe(true)
    expect(rightTop.rightRaised && rightTop.rightOutside && rightTop.leftOutside).toBe(true)
    expect(leftBottom.leftRaised).toBe(false)
    expect(leftBottom.leftOutside && leftBottom.rightOutside).toBe(true)
    expect(rightBottom.rightRaised).toBe(false)
    expect(rightBottom.leftOutside && rightBottom.rightOutside).toBe(true)
  })

  it('can pick music-biased postures without throwing', () => {
    expect(ARM_POSTURE_IDS).toContain(pickArmPosture({ highs: 0.9 }))
    expect(ARM_POSTURE_IDS).toContain(pickArmPosture({ bass: 0.9 }))
  })
})

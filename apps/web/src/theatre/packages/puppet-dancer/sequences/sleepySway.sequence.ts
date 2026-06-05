import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const sleepyLeftPose = poseVariant(leftStepPose, 'sleepyLeft', 'Sleepy Left', {
  offset: { x: -4, y: 4 },
  rotations: { chest: 14, neck: 22, head: 26, leftShoulder: 170, rightShoulder: 20 },
  face: { eyes: -0.6, mouth: -0.1, brows: -0.25 },
})

const sleepyRightPose = poseVariant(rightStepPose, 'sleepyRight', 'Sleepy Right', {
  offset: { x: 4, y: 4 },
  rotations: { chest: -14, neck: -22, head: -26, leftShoulder: 170, rightShoulder: 20 },
  face: { eyes: -0.6, mouth: -0.1, brows: -0.25 },
})

export const sleepySwaySequence: DanceMap = {
  schemaVersion: 1,
  id: 'sleepy-sway',
  label: 'Sleepy Sway',
  description: 'Slow low-intensity sway for calm tracks.',
  loop: true,
  defaultBpm: 72,
  intensity: 0.45,
  loose: 0.9,
  reducedMotion: { intensity: 0.22, disableAccents: true },
  poses: { idle: idlePose, sleepyLeft: sleepyLeftPose, sleepyRight: sleepyRightPose },
  triggerAccents: {
    beat: ['headNod'],
    bassHit: ['hipBounce'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'sleepyLeft', durationMs: 760, holdMs: 160, ease: 'easeInOut' },
    { pose: 'idle', durationMs: 260, holdMs: 80, ease: 'easeInOut' },
    { pose: 'sleepyRight', durationMs: 760, holdMs: 160, ease: 'easeInOut' },
    { pose: 'idle', durationMs: 260, holdMs: 80, ease: 'easeInOut' },
  ],
}


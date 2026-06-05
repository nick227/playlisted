import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const windmillTopPose = poseVariant(leftStepPose, 'windmillTop', 'Windmill Top', {
  rotations: { leftShoulder: 120, leftElbow: -95, leftWrist: -70, rightShoulder: 60, rightElbow: -95, rightWrist: -70, chest: -8 },
})

const windmillBottomPose = poseVariant(rightStepPose, 'windmillBottom', 'Windmill Bottom', {
  rotations: { leftShoulder: 94, leftElbow: 68, leftWrist: 40, rightShoulder: 42, rightElbow: 66, rightWrist: 92, chest: 8 },
})

export const windmillArmsSequence: DanceMap = {
  schemaVersion: 1,
  id: 'windmill-arms',
  label: 'Windmill Arms',
  description: 'Big circular arm sweeps with loose wrists.',
  loop: true,
  defaultBpm: 108,
  intensity: 1,
  loose: 0.95,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.24, disableAccents: true },
  poses: { idle: idlePose, windmillTop: windmillTopPose, windmillBottom: windmillBottomPose },
  triggerAccents: {
    beat: ['hipBounce'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'windmillTop', durationMs: 420, holdMs: 20, ease: 'elasticOut', advanceOn: 'midsHit' },
    { pose: 'windmillBottom', durationMs: 420, holdMs: 20, ease: 'elasticOut', advanceOn: 'highsHit' },
    { pose: 'idle', durationMs: 160, holdMs: 20, ease: 'easeInOut' },
  ],
}


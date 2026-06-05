import { balancedArmsPose, bothUpPose, idlePose, leftLeadPose, leftStepPose, rightLeadPose, rightStepPose } from '../poses/basicPoses'
import type { DanceMap } from './sequenceTypes'

export const twoStepSequence: DanceMap = {
  schemaVersion: 1,
  id: 'two-step',
  label: 'Two Step',
  description: 'Loose, goofy side-to-side beginner dance.',
  loop: true,
  defaultBpm: 104,
  intensity: 0.86,
  loose: 0.82,
  reducedMotion: { intensity: 0.35, disableAccents: true },
  poses: {
    idle: idlePose,
    leftStep: leftStepPose,
    rightStep: rightStepPose,
    bothUp: bothUpPose,
    balanced: balancedArmsPose,
    leftLead: leftLeadPose,
    rightLead: rightLeadPose,
  },
  triggerAccents: {
    beat: ['hipBounce', 'headNod'],
    bassHit: ['hipBounce', 'kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'idle', durationMs: 280, holdMs: 70, ease: 'easeInOut' },
    { pose: 'leftStep', durationMs: 380, holdMs: 90, ease: 'easeInOut', advanceOn: 'beat' },
    { pose: 'bothUp', durationMs: 320, holdMs: 70, ease: 'easeInOut', advanceOn: 'highsHit' },
    { pose: 'balanced', durationMs: 300, holdMs: 60, ease: 'easeInOut' },
    { pose: 'rightStep', durationMs: 380, holdMs: 90, ease: 'easeInOut', advanceOn: 'beat' },
    { pose: 'leftLead', durationMs: 340, holdMs: 80, ease: 'easeInOut', advanceOn: 'midsHit' },
    { pose: 'rightLead', durationMs: 340, holdMs: 80, ease: 'easeInOut', advanceOn: 'highsHit' },
    { pose: 'idle', durationMs: 220, holdMs: 50, ease: 'easeInOut' },
  ],
}

import type { Script } from '../stopMotionScript'

const script: Script = {
  id: 'flowerStorm_v1',
  poseHoldMs: 220,
  stemHoldMs: 180,
  states: [
    { id: 'bud', poses: [{}, {}], durationMs: 2800, next: 'blooming' },
    { id: 'blooming', poses: [{}, {}, {}, {}], durationMs: 5200, next: 'fullBloom' },
    { id: 'fullBloom', poses: [{}, {}, {}, {}, {}, {}], durationMs: 6000, next: ({ triggers }) => (triggers.chaosHit ? 'stormStrain' : 'fullBloom') },
    { id: 'stormStrain', poses: [{}, {}, {}, {}], durationMs: 2200, next: 'collapse' },
    { id: 'collapse', poses: [{}, {}, {}], durationMs: 1800, next: 'aftermath' },
    { id: 'aftermath', poses: [{}, {}], durationMs: 5000, next: 'fullBloom' },
  ],
}

export default script

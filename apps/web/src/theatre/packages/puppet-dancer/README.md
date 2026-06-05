Puppet Dancer
=============

First formal theatre animation package. It separates rig, skin, poses, timed dance sequences, dance playback, and the canvas scene.

The scene is forward-kinematics driven rather than inverse-kinematics driven. It reads `context.shared.time`, `context.shared.features`, and `context.shared.getTriggers(...)`, then maps beat and onset events to pose accents. Reduced-motion users get a slow idle sway through the `quietPulse` fallback preset and the scene's internal reduced-motion branch.

Motion Model
============

Movement is authored as numeric maps:

- `poses/basicPoses.ts`: joint `rotations`, body `offset`, `scale`, and numeric `face` controls.
- `poses/namedAccents.ts`: reusable trigger accents such as `hipBounce`, `headNod`, `wristFlick`, and `kneeDip`.
- `poses/poseAuthoring.ts`: helpers for cloning, patching, and combining pose/accent maps numerically.
- `sequences/*.sequence.ts`: `DanceMap v1` files with local `poses`, ordered steps, timing, holds, easing, loop behavior, reduced-motion metadata, and optional trigger-based advancement.
- `DanceMap.triggerAccents`: trigger-to-named-accent maps for `beat`, `bassHit`, `midsHit`, `highsHit`, and `chaosHit`.
- `MotionStep.accents`: step-local named accent IDs.

Adding a dance should mean adding another sequence file and registering it in `sequences/index.ts`. The renderer does not need to know which dance is playing. `chickenWalk.sequence.ts` is intentionally included as the vetting example for this rule.

DanceMap v1 Lock
================

Every dance map declares `schemaVersion: 1` and uses this shape:

```ts
type DanceMap = {
  schemaVersion: 1
  id: string
  label: string
  description?: string
  author?: string
  loop: boolean
  defaultBpm?: number
  intensity?: number
  reducedMotion?: {
    sequence?: string
    intensity?: number
    disableAccents?: boolean
  }
  poses: Record<string, MotionPose>
  triggerAccents?: Partial<Record<DanceTrigger, string[]>>
  steps: MotionStep[]
}
```

Dance maps do not contain callbacks. Audio events select named numeric accents; they do not mutate renderer or scene code.

Runtime Layers
==============

- `DancePlayer` interpolates pose maps and applies trigger accents.
- `DancePlayer` also owns overshoot/settle easing and per-joint lag so choreography quality stays in the motion layer.
- `PuppetRigSolver` turns the resolved pose into joint positions.
- `PuppetRenderer` draws clean lines, joint dots, head, eyes, mouth, and brows.
- `PuppetDancerScene` stays thin: it reads theatre context, chooses a sequence, asks the player/solver/renderer to do the work, and never creates an analyser or private RAF loop.

Debug Authoring
===============

Set the layer option `debug: true` to show joint names, current sequence and pose, live trigger hits, and a compact resolved pose snapshot. The lab preset currently enables this for fast choreography tuning.

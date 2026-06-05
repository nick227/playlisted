import { idlePose } from '../poses/basicPoses'
import { ARM_POSTURES, jitterArmPosture, pickArmPosture } from '../poses/armPostures'
import type { PuppetPoseMap } from '../poses/poseTypes'
import { clampJointAngle } from '../rig/jointLimits'
import type { PuppetJointId } from '../rig/rigTypes'
import type { DanceMap, DanceEase, MotionStep } from './sequenceTypes'

export const dynamicRandomSequenceId = 'dynamicRandom'

export type DynamicDanceAttributes = {
  energy?: number
  bass?: number
  highs?: number
  centroid?: number
  flux?: number
  bassFlux?: number
  highsFlux?: number
}

const leftLeg: PuppetJointId[] = ['leftHip', 'leftKnee', 'leftAnkle']
const rightLeg: PuppetJointId[] = ['rightHip', 'rightKnee', 'rightAnkle']
const body: PuppetJointId[] = ['hips', 'spine', 'chest', 'neck', 'head']
const eases: DanceEase[] = ['easeInOut', 'easeOutBack', 'elasticOut', 'snap']
const accents = ['hipBounce', 'headNod', 'wristFlick', 'kneeDip', 'shoulderPop', 'chaosStretch']

let dynamicDanceCounter = 0

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function maybe(chance: number) {
  return Math.random() < chance
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function sample<T>(items: T[], count: number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

function spread(value: number, amount: number, wildness: number) {
  return value + rand(-amount, amount) * wildness
}

function mirroredRandomPose(prefix: string, index: number, wildness: number, attributes: DynamicDanceAttributes): PuppetPoseMap {
  const bass = attributes.bass ?? 0
  const highs = attributes.highs ?? 0
  const crouch = rand(0, 1) < 0.24 + bass * 0.45
  const airy = rand(0, 1) < 0.2 + highs * 0.5
  const side = maybe(0.5) ? -1 : 1
  const legSwing = rand(16, crouch ? 62 : 42) * wildness
  const armPosture = pickArmPosture({ bass, highs, energy: attributes.energy })
  const arms = jitterArmPosture(ARM_POSTURES[armPosture], wildness, airy ? 14 : 10)

  const rotations: Partial<Record<PuppetJointId, number>> = {
    root: -90,
    hips: spread(side * rand(2, 18), 10, wildness),
    spine: spread(-90 - side * rand(0, 20), 18, wildness),
    chest: spread(-90 + side * rand(8, 32), 24, wildness),
    neck: spread(-90 - side * rand(0, 18), 16, wildness),
    head: spread(-90 + side * rand(8, 36), 28, wildness),

    leftShoulder: clampJointAngle('leftShoulder', arms.leftShoulder),
    leftElbow: clampJointAngle('leftElbow', arms.leftElbow),
    leftWrist: clamp(arms.leftWrist, -20, 190),
    rightShoulder: clampJointAngle('rightShoulder', arms.rightShoulder),
    rightElbow: clampJointAngle('rightElbow', arms.rightElbow),
    rightWrist: clamp(arms.rightWrist, -200, 26),

    leftHip: clampJointAngle('leftHip', (crouch ? 126 : 150) - side * legSwing + rand(-16, 16)),
    leftKnee: clampJointAngle('leftKnee', (crouch ? 132 : 102) + rand(-36, 44) * wildness),
    leftAnkle: clamp(88 + side * rand(-32, 36) * wildness, 42, 136),
    rightHip: clampJointAngle('rightHip', (crouch ? 54 : 30) - side * legSwing * 0.8 + rand(-16, 16)),
    rightKnee: clampJointAngle('rightKnee', (crouch ? 54 : 78) + rand(-42, 38) * wildness),
    rightAnkle: clamp(92 + side * rand(-36, 32) * wildness, 44, 138),
  }

  if (maybe(0.18)) {
    for (const joint of sample([...leftLeg, ...rightLeg, ...body], rand(1, 3))) {
      const next = (rotations[joint] ?? 0) + rand(-18, 18) * wildness
      rotations[joint] = clampJointAngle(joint, next)
    }
  }

  return {
    id: `${prefix}Pose${index}`,
    label: `Random ${index + 1}`,
    offset: {
      x: side * rand(2, 28) * wildness,
      y: (crouch ? rand(10, 34) : rand(-8, 18)) * clamp(wildness, 0.75, 1.4),
    },
    scale: clamp(rand(0.94, 1.06) + (airy ? 0.035 : 0) - (crouch ? 0.045 : 0), 0.88, 1.12),
    rotations,
    face: {
      eyeOpen: clamp(rand(0.34, 1.08), 0, 1),
      pupilX: rand(-0.72, 0.72),
      pupilY: rand(-0.36, 0.36),
      leftBrowLift: rand(-0.1, 0.95),
      rightBrowLift: rand(-0.1, 0.95),
      leftBrowRotate: rand(-0.42, 0.42),
      rightBrowRotate: rand(-0.42, 0.42),
      mouthOpen: clamp(rand(0.05, 0.86) + (bass * 0.25), 0, 1),
      mouthSmile: rand(-0.45, 0.82),
      topLipY: rand(-0.35, 0.22),
      bottomLipY: rand(-0.16, 0.42),
      tongue: maybe(0.1) ? rand(0.16, 0.48) : 0,
    },
  }
}

function createStep(pose: string, index: number, wildness: number, attributes: DynamicDanceAttributes): MotionStep {
  const flux = attributes.flux ?? 0
  const bass = attributes.bass ?? 0
  const fast = flux > 0.12 || (attributes.highsFlux && attributes.highsFlux > 0.08)
  const durationBase = fast ? rand(240, 360) : rand(360, 560)
  return {
    pose,
    durationMs: Math.round(clamp(durationBase / clamp(wildness, 0.9, 1.45), 220, 680)),
    holdMs: maybe(0.42) ? Math.round(rand(50, 160)) : 0,
    ease: index % 5 === 0 && wildness > 1.2 ? pick(eases) : 'easeInOut',
    intensity: clamp(rand(0.72, 1.02) + bass * 0.14, 0.58, 1.15),
    accents: sample(accents, maybe(0.22) ? 2 : 1),
    advanceOn: maybe(0.22) ? 'beat' : undefined,
    beatSnap: maybe(0.28),
  }
}

export function createDynamicRandomSequence(attributes: DynamicDanceAttributes = {}): DanceMap {
  dynamicDanceCounter += 1
  const posePrefix = `random${dynamicDanceCounter}`
  const energy = attributes.energy ?? 0
  const flux = attributes.flux ?? 0
  const bass = attributes.bass ?? 0
  const highs = attributes.highs ?? 0
  const chaos = Math.max(attributes.bassFlux ?? 0, attributes.highsFlux ?? 0)
  const wildness = clamp(0.82 + energy * 1.1 + flux * 1.6 + bass * 0.5 + highs * 0.5 + chaos * 1.8, 0.8, 1.45)
  const poseCount = Math.round(clamp(rand(4, 8) + wildness * 1.4, 5, 10))
  const poses: Record<string, PuppetPoseMap> = { idle: idlePose }
  const steps: MotionStep[] = [
    { pose: 'idle', durationMs: Math.round(rand(180, 280)), holdMs: 40, ease: 'easeInOut' },
  ]

  for (let i = 0; i < poseCount; i += 1) {
    const pose = mirroredRandomPose(posePrefix, i, wildness, attributes)
    poses[pose.id] = pose
    steps.push(createStep(pose.id, i, wildness, attributes))
    if (maybe(0.22)) steps.push(createStep('idle', i, wildness * 0.8, attributes))
  }

  return {
    schemaVersion: 1,
    id: `dynamic-random-${dynamicDanceCounter}`,
    label: 'Random',
    description: 'Fresh numeric choreography generated every time this dance is activated.',
    author: 'Playlisted dynamic map generator',
    loop: true,
    defaultBpm: Math.round(clamp(96 + wildness * 32 + flux * 180, 92, 168)),
    intensity: clamp(0.82 + wildness * 0.18, 0.8, 1.28),
    loose: clamp(0.86 + wildness * 0.08, 0.84, 0.96),
    reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.25, disableAccents: true },
    poses,
    triggerAccents: {
      beat: ['hipBounce', 'headNod'],
      bassHit: ['hipBounce', 'kneeDip'],
      midsHit: ['shoulderPop'],
      highsHit: ['wristFlick', 'headNod'],
      chaosHit: ['chaosStretch', 'wristFlick'],
    },
    steps,
  }
}

export const dynamicRandomSequence = createDynamicRandomSequence()

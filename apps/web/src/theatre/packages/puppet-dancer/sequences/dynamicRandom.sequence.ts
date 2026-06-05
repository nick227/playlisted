import { idlePose } from '../poses/basicPoses'
import { ARM_POSTURES, jitterArmPosture, pickArmPosture, type ArmPostureId } from '../poses/armPostures'
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

export type DanceStyleVector = {
  bounce: number
  sway: number
  stiffness: number
  asymmetry: number
  limbChaos: number
  faceDrama: number
  grounded: number
  tempo: number
}

export type MotionFamily = 'stomp' | 'float' | 'robot' | 'panic' | 'disco' | 'noodle' | 'shuffle' | 'tiny'

type PhraseEnvelopeShape = 'riseFall' | 'doublePeak' | 'lateSpike' | 'sawRamp' | 'sinePulse'

type PhraseEnvelope = {
  shape: PhraseEnvelopeShape
  attack: number
  release: number
  pulse: number
}

type FamilyConfig = {
  label: string
  armPostures: ArmPostureId[]
  poseCountBias: number
  rootTravel: number
  crouchBias: number
  verticalBias: number
  durationBias: number
  holdBias: number
  snapBias: number
  silhouette: number
}

const familyConfigs: Record<MotionFamily, FamilyConfig> = {
  stomp: {
    label: 'Stomp',
    armPostures: ['bothDown', 'balanced', 'leftUpRightDown'],
    poseCountBias: -1,
    rootTravel: 0.6,
    crouchBias: 0.48,
    verticalBias: 1.35,
    durationBias: 0.92,
    holdBias: 0.34,
    snapBias: 0.1,
    silhouette: 0.8,
  },
  float: {
    label: 'Float',
    armPostures: ['bothUp', 'balanced', 'leftUpRightDown', 'rightUpLeftDown'],
    poseCountBias: -1,
    rootTravel: 1.1,
    crouchBias: -0.2,
    verticalBias: -0.5,
    durationBias: 1.32,
    holdBias: 0.2,
    snapBias: -0.22,
    silhouette: 1.1,
  },
  robot: {
    label: 'Robot',
    armPostures: ['balanced', 'bothUp', 'bothDown'],
    poseCountBias: 0,
    rootTravel: 0.34,
    crouchBias: 0.08,
    verticalBias: 0.3,
    durationBias: 1.02,
    holdBias: 0.64,
    snapBias: 0.68,
    silhouette: 0.48,
  },
  panic: {
    label: 'Panic',
    armPostures: ['bothUp', 'leftUpRightDown', 'rightUpLeftDown', 'balanced'],
    poseCountBias: 2,
    rootTravel: 1.18,
    crouchBias: 0.44,
    verticalBias: 1.1,
    durationBias: 0.7,
    holdBias: 0.12,
    snapBias: 0.3,
    silhouette: 1.25,
  },
  disco: {
    label: 'Disco',
    armPostures: ['leftUpRightDown', 'rightUpLeftDown', 'bothUp'],
    poseCountBias: 0,
    rootTravel: 0.78,
    crouchBias: -0.02,
    verticalBias: 0.22,
    durationBias: 0.96,
    holdBias: 0.4,
    snapBias: 0.2,
    silhouette: 1.15,
  },
  noodle: {
    label: 'Noodle',
    armPostures: ['balanced', 'bothUp', 'leftUpRightDown', 'rightUpLeftDown'],
    poseCountBias: 1,
    rootTravel: 0.82,
    crouchBias: -0.08,
    verticalBias: 0.12,
    durationBias: 1.1,
    holdBias: 0.12,
    snapBias: -0.3,
    silhouette: 1.35,
  },
  shuffle: {
    label: 'Shuffle',
    armPostures: ['bothDown', 'balanced', 'rightUpLeftDown'],
    poseCountBias: 1,
    rootTravel: 1.38,
    crouchBias: 0.12,
    verticalBias: 0.1,
    durationBias: 0.82,
    holdBias: 0.18,
    snapBias: -0.04,
    silhouette: 0.7,
  },
  tiny: {
    label: 'Tiny',
    armPostures: ['bothDown', 'balanced'],
    poseCountBias: 2,
    rootTravel: 0.26,
    crouchBias: -0.08,
    verticalBias: 0,
    durationBias: 0.68,
    holdBias: 0.26,
    snapBias: 0.24,
    silhouette: 0.3,
  },
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

function lerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount
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

function smoothstep(value: number) {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

function triangle(value: number) {
  const t = value - Math.floor(value)
  return 1 - Math.abs(t * 2 - 1)
}

function createStyleVector(attributes: DynamicDanceAttributes): DanceStyleVector {
  const energy = attributes.energy ?? 0
  const bass = attributes.bass ?? 0
  const highs = attributes.highs ?? 0
  const flux = attributes.flux ?? 0
  const chaos = Math.max(attributes.bassFlux ?? 0, attributes.highsFlux ?? 0)
  const styleLean = rand(0, 1)
  return {
    bounce: clamp(rand(0.22, 0.8) + bass * 0.85 + energy * 0.25, 0, 1),
    sway: clamp(rand(0.22, 0.9) + (styleLean < 0.33 ? 0.22 : 0) + flux * 0.45, 0, 1),
    stiffness: clamp(rand(0.04, 0.46) + (styleLean > 0.78 ? 0.38 : 0) - flux * 0.16, 0, 1),
    asymmetry: clamp(rand(0.12, 0.78) + chaos * 1.3, 0, 1),
    limbChaos: clamp(rand(0.18, 0.76) + highs * 0.85 + chaos * 1.1, 0, 1),
    faceDrama: clamp(rand(0.24, 0.9) + highs * 0.55 + energy * 0.25, 0, 1),
    grounded: clamp(rand(0.2, 0.84) + bass * 0.55 - highs * 0.18, 0, 1),
    tempo: clamp(rand(0.28, 0.88) + flux * 1.7 + energy * 0.45, 0, 1),
  }
}

function pickMotionFamily(attributes: DynamicDanceAttributes): MotionFamily {
  const bass = attributes.bass ?? 0
  const highs = attributes.highs ?? 0
  const flux = attributes.flux ?? 0
  const chaos = Math.max(attributes.bassFlux ?? 0, attributes.highsFlux ?? 0)
  const roll = Math.random()
  if (chaos > 0.1 && roll < 0.42) return 'panic'
  if (bass > 0.42 && roll < 0.46) return 'stomp'
  if (highs > 0.36 && roll < 0.42) return 'disco'
  if (flux > 0.12 && roll < 0.36) return 'shuffle'
  if (roll < 0.13) return 'float'
  if (roll < 0.26) return 'robot'
  if (roll < 0.4) return 'noodle'
  if (roll < 0.54) return 'tiny'
  if (roll < 0.68) return 'stomp'
  if (roll < 0.82) return 'disco'
  return 'shuffle'
}

function applyFamilyStyle(style: DanceStyleVector, family: MotionFamily): DanceStyleVector {
  if (family === 'stomp') {
    return {
      ...style,
      bounce: clamp(style.bounce + 0.32, 0, 1),
      grounded: clamp(style.grounded + 0.42, 0, 1),
      sway: clamp(style.sway - 0.18, 0, 1),
      limbChaos: clamp(style.limbChaos - 0.16, 0, 1),
    }
  }
  if (family === 'float') {
    return {
      ...style,
      bounce: clamp(style.bounce - 0.28, 0, 1),
      grounded: clamp(style.grounded - 0.42, 0, 1),
      sway: clamp(style.sway + 0.28, 0, 1),
      stiffness: clamp(style.stiffness - 0.22, 0, 1),
      tempo: clamp(style.tempo - 0.24, 0, 1),
    }
  }
  if (family === 'robot') {
    return {
      ...style,
      stiffness: clamp(style.stiffness + 0.58, 0, 1),
      limbChaos: clamp(style.limbChaos - 0.24, 0, 1),
      sway: clamp(style.sway - 0.28, 0, 1),
      faceDrama: clamp(style.faceDrama - 0.28, 0, 1),
    }
  }
  if (family === 'panic') {
    return {
      ...style,
      bounce: clamp(style.bounce + 0.24, 0, 1),
      asymmetry: clamp(style.asymmetry + 0.38, 0, 1),
      limbChaos: clamp(style.limbChaos + 0.36, 0, 1),
      faceDrama: clamp(style.faceDrama + 0.34, 0, 1),
      tempo: clamp(style.tempo + 0.28, 0, 1),
    }
  }
  if (family === 'disco') {
    return {
      ...style,
      faceDrama: clamp(style.faceDrama + 0.18, 0, 1),
      sway: clamp(style.sway + 0.18, 0, 1),
      stiffness: clamp(style.stiffness + 0.1, 0, 1),
    }
  }
  if (family === 'noodle') {
    return {
      ...style,
      limbChaos: clamp(style.limbChaos + 0.3, 0, 1),
      stiffness: clamp(style.stiffness - 0.34, 0, 1),
      bounce: clamp(style.bounce - 0.12, 0, 1),
      sway: clamp(style.sway + 0.2, 0, 1),
    }
  }
  if (family === 'shuffle') {
    return {
      ...style,
      sway: clamp(style.sway + 0.28, 0, 1),
      bounce: clamp(style.bounce + 0.14, 0, 1),
      tempo: clamp(style.tempo + 0.18, 0, 1),
      grounded: clamp(style.grounded + 0.12, 0, 1),
    }
  }
  return {
    ...style,
    bounce: clamp(style.bounce - 0.18, 0, 1),
    sway: clamp(style.sway - 0.28, 0, 1),
    limbChaos: clamp(style.limbChaos - 0.18, 0, 1),
    tempo: clamp(style.tempo + 0.34, 0, 1),
  }
}

function pickFamilyArmPosture(family: MotionFamily, index: number): ArmPostureId {
  const config = familyConfigs[family]
  if (family === 'disco') return index % 2 === 0 ? 'leftUpRightDown' : 'rightUpLeftDown'
  if (family === 'robot') return index % 2 === 0 ? 'balanced' : 'bothDown'
  if (family === 'stomp' && index % 3 === 0) return 'bothDown'
  return pick(config.armPostures)
}

function createPhraseEnvelope(style: DanceStyleVector): PhraseEnvelope {
  const shapes: PhraseEnvelopeShape[] = ['riseFall', 'doublePeak', 'lateSpike', 'sawRamp', 'sinePulse']
  const shape = style.bounce > 0.72 && maybe(0.45)
    ? 'sawRamp'
    : style.limbChaos > 0.72 && maybe(0.5)
      ? 'doublePeak'
      : pick(shapes)
  return {
    shape,
    attack: rand(0.18, 0.42),
    release: rand(0.2, 0.52),
    pulse: rand(1.4, 3.8),
  }
}

function envelopeValue(envelope: PhraseEnvelope, t: number) {
  const x = clamp(t, 0, 1)
  if (envelope.shape === 'doublePeak') {
    const first = Math.exp(-Math.pow((x - 0.28) / 0.18, 2))
    const second = Math.exp(-Math.pow((x - 0.72) / 0.16, 2))
    return clamp(Math.max(first, second) * 0.92 + triangle(x * envelope.pulse) * 0.18, 0, 1)
  }
  if (envelope.shape === 'lateSpike') {
    return clamp(smoothstep((x - 0.42) / Math.max(0.08, envelope.attack)) * (1 - smoothstep((x - 0.88) / Math.max(0.08, envelope.release))), 0, 1)
  }
  if (envelope.shape === 'sawRamp') {
    return clamp(0.18 + x * 0.82 + triangle(x * envelope.pulse) * 0.24, 0, 1)
  }
  if (envelope.shape === 'sinePulse') {
    return clamp(0.28 + Math.sin(x * Math.PI) * 0.5 + triangle(x * envelope.pulse) * 0.28, 0, 1)
  }
  return clamp(smoothstep(x / envelope.attack) * (1 - smoothstep((x - (1 - envelope.release)) / envelope.release)), 0, 1)
}

function mirroredRandomPose(
  prefix: string,
  index: number,
  poseCount: number,
  wildness: number,
  family: MotionFamily,
  style: DanceStyleVector,
  envelope: PhraseEnvelope,
  phrasePhase: number,
  attributes: DynamicDanceAttributes,
): PuppetPoseMap {
  const config = familyConfigs[family]
  const bass = attributes.bass ?? 0
  const highs = attributes.highs ?? 0
  const t = poseCount <= 1 ? 0 : index / (poseCount - 1)
  const envelopeEnergy = envelopeValue(envelope, t)
  const phrase = phrasePhase + t * Math.PI * 2
  const motion = clamp(0.18 + envelopeEnergy * 0.92, 0.18, 1.12)
  const side = maybe(style.asymmetry * 0.28) ? (maybe(0.5) ? -1 : 1) : (index % 2 === 0 ? -1 : 1)
  const counter = Math.sin(phrase)
  const bounceWave = triangle(t * (1.1 + style.bounce * 2.6))
  const crouch = rand(0, 1) < clamp(0.14 + bass * 0.36 + style.bounce * 0.28 + envelopeEnergy * 0.18 + config.crouchBias, 0.02, 0.92)
  const airy = rand(0, 1) < clamp(0.12 + highs * 0.45 + style.limbChaos * 0.22 - style.grounded * 0.12 - config.crouchBias * 0.3, 0.02, 0.88)
  const legSwing = lerp(10, crouch ? 64 : 46, motion * (0.35 + style.bounce * 0.85)) * wildness * lerp(0.45, 1.35, config.silhouette)
  const armPosture = maybe(0.78) ? pickFamilyArmPosture(family, index) : pickArmPosture({ bass, highs, energy: attributes.energy })
  const arms = jitterArmPosture(
    ARM_POSTURES[armPosture],
    wildness * lerp(0.32, 1.35, motion * (0.4 + style.limbChaos * 0.8)),
    lerp(3, airy ? 30 : 18, (1 - style.stiffness) * lerp(0.42, 1.35, config.silhouette)),
  )
  const swayRange = lerp(3, 28, style.sway) * motion * lerp(0.45, 1.28, config.rootTravel)
  const torsoCounter = lerp(0.55, 1.45, 1 - style.stiffness)
  const bounceDrop = bounceWave * lerp(2, 24, style.bounce) * motion * config.verticalBias
  const tinyScale = family === 'tiny' ? 0.42 : 1
  const robotSnap = family === 'robot' ? (index % 2 === 0 ? 1 : -1) : 0

  const rotations: Partial<Record<PuppetJointId, number>> = {
    root: -90,
    hips: spread(side * swayRange * 0.55 + counter * swayRange * 0.4 + robotSnap * 8, 6, wildness * motion * tinyScale),
    spine: spread(-90 - side * swayRange * 0.5, 9, wildness * motion * tinyScale),
    chest: spread(-90 + side * swayRange * torsoCounter + robotSnap * 14, 12, wildness * motion * tinyScale),
    neck: spread(-90 - side * swayRange * 0.44, 8, wildness * motion),
    head: spread(-90 + side * swayRange * lerp(0.7, 1.35, style.faceDrama), 15, wildness * motion),

    leftShoulder: clampJointAngle('leftShoulder', arms.leftShoulder),
    leftElbow: clampJointAngle('leftElbow', arms.leftElbow),
    leftWrist: clamp(arms.leftWrist, -20, 190),
    rightShoulder: clampJointAngle('rightShoulder', arms.rightShoulder),
    rightElbow: clampJointAngle('rightElbow', arms.rightElbow),
    rightWrist: clamp(arms.rightWrist, -200, 26),

    leftHip: clampJointAngle('leftHip', (crouch ? 126 : 150) - side * legSwing + rand(-10, 10) * (1 - style.stiffness) * tinyScale),
    leftKnee: clampJointAngle('leftKnee', (crouch ? 128 : 98) + bounceDrop + rand(-24, 34) * wildness * motion * tinyScale),
    leftAnkle: clamp(88 + side * rand(-24, 32) * wildness * motion - bounceDrop * 0.35, 42, 136),
    rightHip: clampJointAngle('rightHip', (crouch ? 54 : 30) - side * legSwing * 0.82 + rand(-10, 10) * (1 - style.stiffness) * tinyScale),
    rightKnee: clampJointAngle('rightKnee', (crouch ? 54 : 78) - bounceDrop * 0.4 + rand(-30, 28) * wildness * motion * tinyScale),
    rightAnkle: clamp(92 + side * rand(-32, 24) * wildness * motion + bounceDrop * 0.28, 44, 138),
  }

  if (family === 'float') {
    rotations.leftKnee = clampJointAngle('leftKnee', (rotations.leftKnee ?? 98) - 18 * motion)
    rotations.rightKnee = clampJointAngle('rightKnee', (rotations.rightKnee ?? 78) + 12 * motion)
    rotations.head = (rotations.head ?? -90) + Math.cos(phrase) * 22
  } else if (family === 'disco') {
    rotations.head = (rotations.head ?? -90) + side * 20
    rotations.chest = (rotations.chest ?? -90) + side * 18
  } else if (family === 'noodle') {
    rotations.leftElbow = clampJointAngle('leftElbow', (rotations.leftElbow ?? 0) + Math.sin(phrase * 1.7) * 72 * motion)
    rotations.rightElbow = clampJointAngle('rightElbow', (rotations.rightElbow ?? 0) - Math.cos(phrase * 1.6) * 72 * motion)
    rotations.leftWrist = clamp((rotations.leftWrist ?? 0) + Math.cos(phrase * 2.4) * 70 * motion, -20, 190)
    rotations.rightWrist = clamp((rotations.rightWrist ?? 0) - Math.sin(phrase * 2.2) * 70 * motion, -200, 26)
  }

  if (maybe(0.08 + style.limbChaos * 0.24 + envelopeEnergy * 0.14)) {
    for (const joint of sample([...leftLeg, ...rightLeg, ...body], rand(1, 3))) {
      const next = (rotations[joint] ?? 0) + rand(-18, 18) * wildness * motion * (0.45 + style.limbChaos)
      rotations[joint] = clampJointAngle(joint, next)
    }
  }

  return {
    id: `${prefix}Pose${index}`,
    label: `Random ${index + 1}`,
    offset: {
      x: (side * lerp(2, 28, style.sway) * motion + counter * lerp(0, 12, style.asymmetry)) * config.rootTravel,
      y: (crouch ? rand(8, 24) : rand(-6, 12)) * clamp(wildness, 0.75, 1.35) + bounceDrop + config.verticalBias * 2,
    },
    scale: clamp(rand(0.94, 1.06) + (airy ? 0.035 : 0) - (crouch ? 0.045 : 0) + (family === 'float' ? 0.04 : 0) - (family === 'stomp' ? 0.04 : 0), 0.88, 1.12),
    rotations,
    face: {
      eyeOpen: clamp(lerp(0.84, 0.22, envelopeEnergy * style.faceDrama * 0.8) + rand(-0.12, 0.2), 0, 1),
      pupilX: clamp(counter * style.faceDrama + rand(-0.22, 0.22), -1, 1),
      pupilY: clamp(Math.cos(phrase * 0.7) * style.faceDrama * 0.32 + rand(-0.12, 0.12), -1, 1),
      leftBrowLift: clamp(rand(-0.08, 0.35) + envelopeEnergy * style.faceDrama, -0.2, 1.1),
      rightBrowLift: clamp(rand(-0.08, 0.35) + envelopeEnergy * style.faceDrama * lerp(0.5, 1.2, style.asymmetry), -0.2, 1.1),
      leftBrowRotate: rand(-0.18, 0.18) + counter * 0.22 * style.faceDrama,
      rightBrowRotate: rand(-0.18, 0.18) - counter * 0.22 * style.faceDrama,
      mouthOpen: clamp(lerp(0.04, 0.88, envelopeEnergy * style.faceDrama) + bass * 0.22 + rand(-0.08, 0.08), 0, 1),
      mouthSmile: clamp(lerp(-0.32, 0.82, style.faceDrama) + rand(-0.22, 0.22), -0.8, 1),
      topLipY: rand(-0.16, 0.12) - envelopeEnergy * style.faceDrama * 0.18,
      bottomLipY: rand(-0.08, 0.2) + envelopeEnergy * style.faceDrama * 0.28,
      tongue: maybe(0.035 + envelopeEnergy * style.limbChaos * 0.11) ? rand(0.12, 0.5) : 0,
    },
  }
}

function createStep(
  pose: string,
  index: number,
  poseCount: number,
  wildness: number,
  family: MotionFamily,
  style: DanceStyleVector,
  envelope: PhraseEnvelope,
  attributes: DynamicDanceAttributes,
): MotionStep {
  const config = familyConfigs[family]
  const flux = attributes.flux ?? 0
  const bass = attributes.bass ?? 0
  const t = poseCount <= 1 ? 0 : index / (poseCount - 1)
  const envelopeEnergy = envelopeValue(envelope, t)
  const fast = flux > 0.12 || (attributes.highsFlux && attributes.highsFlux > 0.08) || style.tempo > 0.74
  const durationBase = fast ? rand(230, 360) : rand(380, 620)
  const durationScale = lerp(1.14, 0.54, envelopeEnergy * style.tempo) * lerp(0.84, 1.2, style.stiffness) * config.durationBias
  const snapChance = clamp(config.snapBias + envelopeEnergy * 0.28 + style.stiffness * 0.25, 0, 0.88)
  const elasticChance = family === 'float' || family === 'noodle' ? 0.34 : 0.08
  const easeKind = maybe(snapChance)
    ? 'snap'
    : maybe(elasticChance)
      ? 'elasticOut'
      : envelopeEnergy > 0.72 && wildness > 1.12
        ? pick(eases)
        : 'easeInOut'
  return {
    pose,
    durationMs: Math.round(clamp(durationBase * durationScale / clamp(wildness, 0.9, 1.45), 150, 720)),
    holdMs: maybe(clamp(lerp(0.18, 0.54, style.stiffness) + config.holdBias, 0, 0.86))
      ? Math.round(rand(40, 180) * lerp(0.7, 1.35, 1 - envelopeEnergy))
      : 0,
    ease: easeKind,
    intensity: clamp(lerp(0.56, 1.24, envelopeEnergy) + bass * 0.14 + rand(-0.08, 0.08), 0.48, 1.35),
    accents: sample(accents, maybe(0.12 + envelopeEnergy * 0.38 + style.limbChaos * 0.18) ? 2 : 1),
    advanceOn: maybe(0.1 + envelopeEnergy * 0.26) ? 'beat' : undefined,
    beatSnap: maybe(0.18 + style.bounce * 0.34 + envelopeEnergy * 0.2),
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
  const family = pickMotionFamily(attributes)
  const familyConfig = familyConfigs[family]
  const style = applyFamilyStyle(createStyleVector(attributes), family)
  const envelope = createPhraseEnvelope(style)
  const phrasePhase = rand(0, Math.PI * 2)
  const poseCount = Math.round(clamp(rand(4, 8) + wildness * 1.4 + familyConfig.poseCountBias, 4, 12))
  const poses: Record<string, PuppetPoseMap> = { idle: idlePose }
  const steps: MotionStep[] = [
    { pose: 'idle', durationMs: Math.round(rand(160, 300) * familyConfig.durationBias), holdMs: Math.round(30 + familyConfig.holdBias * 60), ease: 'easeInOut' },
  ]

  for (let i = 0; i < poseCount; i += 1) {
    const pose = mirroredRandomPose(posePrefix, i, poseCount, wildness, family, style, envelope, phrasePhase, attributes)
    poses[pose.id] = pose
    steps.push(createStep(pose.id, i, poseCount, wildness, family, style, envelope, attributes))
    if (family === 'robot' && i % 2 === 0) steps.push(createStep(pose.id, i, poseCount, wildness * 0.7, family, style, envelope, attributes))
    if (maybe(0.08 + style.stiffness * 0.12 + (family === 'stomp' ? 0.12 : 0))) {
      steps.push(createStep('idle', i, poseCount, wildness * 0.8, family, style, envelope, attributes))
    }
  }

  return {
    schemaVersion: 1,
    id: `dynamic-random-${dynamicDanceCounter}`,
    label: `Random ${familyConfig.label}`,
    description: `Fresh numeric ${familyConfig.label.toLowerCase()} choreography generated every time this dance is activated.`,
    author: 'Playlisted dynamic map generator',
    loop: true,
    defaultBpm: Math.round(clamp((96 + wildness * 32 + flux * 180) / familyConfig.durationBias, 82, 178)),
    intensity: clamp(0.72 + wildness * 0.16 + style.bounce * 0.16 + style.limbChaos * 0.12, 0.72, 1.32),
    loose: clamp(0.78 + (1 - style.stiffness) * 0.18 + style.limbChaos * 0.05, 0.78, 0.98),
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

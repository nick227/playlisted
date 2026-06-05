import type { TriggerFrame } from '../../../audio/VisualTriggers'
import { getNamedAccent } from '../poses/namedAccents'
import type { FaceState, MotionAccentMap, PuppetPoseMap, ResolvedPose } from '../poses/poseTypes'
import { clampJointAngle, lerpJointAngle } from '../rig/jointLimits'
import type { PuppetJointId, PuppetRig } from '../rig/rigTypes'
import type { DanceMap, MotionStep } from './sequenceTypes'

type ActiveAccent = {
  id: string
  map: MotionAccentMap
  amount: number
  decayMs: number
}

const triggerKeys = ['beat', 'bassHit', 'midsHit', 'highsHit', 'chaosHit'] as const
const ARM_JOINTS = new Set<PuppetJointId>([
  'leftShoulder',
  'leftElbow',
  'leftWrist',
  'rightShoulder',
  'rightElbow',
  'rightWrist',
])

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function ease(kind: MotionStep['ease'], value: number) {
  const t = clamp01(value)
  if (kind === 'snap') return t < 0.55 ? 0 : 1
  if (kind === 'linear') return t
  if (kind === 'easeOutBack') {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }
  if (kind === 'elasticOut') {
    if (t === 0 || t === 1) return t
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
  }
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function addFace(base: FaceState, patch: Partial<FaceState> | undefined, amount: number) {
  if (!patch) return
  for (const [key, value] of Object.entries(patch)) {
    const faceKey = key as keyof FaceState
    base[faceKey] += (value ?? 0) * amount
  }
  if (patch.eyes !== undefined) base.eyeOpen += patch.eyes * amount
  if (patch.mouth !== undefined) base.mouthOpen += patch.mouth * amount
  if (patch.brows !== undefined) {
    base.leftBrowLift += patch.brows * amount
    base.rightBrowLift += patch.brows * amount
  }
}

export class DancePlayer {
  private stepIndex = 0
  private stepElapsed = 0
  private activeAccents: ActiveAccent[] = []
  private loosePose: ResolvedPose | null = null
  private lastTriggers: TriggerFrame | null = null

  constructor(private dance: DanceMap, private rig: PuppetRig) {}

  setSequence(dance: DanceMap) {
    if (this.dance.id === dance.id) return
    this.dance = dance
    this.stepIndex = 0
    this.stepElapsed = 0
    this.activeAccents = []
    this.loosePose = null
  }

  update(deltaMs: number, triggers: TriggerFrame, reducedMotion: boolean): ResolvedPose {
    this.lastTriggers = triggers
    const steps = this.dance.steps
    const current = steps[this.stepIndex] ?? steps[0]
    if (!current) return this.resolvePose({ id: 'empty', label: 'Empty', rotations: {} })

    const audioIdle = this.isAudioIdle(triggers)
    if (!reducedMotion && !audioIdle && !this.dance.reducedMotion?.disableAccents) this.captureAccents(triggers, current)
    if (!audioIdle) this.advance(deltaMs, triggers, reducedMotion, current)
    this.decayAccents(deltaMs)

    const fromStep = steps[this.stepIndex] ?? current
    const toStep = steps[(this.stepIndex + 1) % steps.length] ?? fromStep
    const travelMs = Math.max(1, fromStep.durationMs)
    const heldElapsed = Math.max(0, this.stepElapsed - (fromStep.holdMs ?? 0))
    const amount = ease(fromStep.ease, heldElapsed / travelMs)
    const pose = audioIdle
      ? this.resolvePose(this.dance.poses.idle ?? this.poseForStep(fromStep))
      : this.mixPoses(this.poseForStep(fromStep), this.poseForStep(toStep), amount)
    const stepIntensity = fromStep.intensity ?? 1
    const danceIntensity = reducedMotion
      ? (this.dance.reducedMotion?.intensity ?? 0.35)
      : (this.dance.intensity ?? 1)
    const accented = reducedMotion
      ? this.applyReducedMotion(pose, danceIntensity * stepIntensity)
      : this.applyAccents(pose, danceIntensity * stepIntensity)
    return this.finalizePose(this.applyLooseLag(accented, deltaMs, reducedMotion))
  }

  getDebugState() {
    const step = this.dance.steps[this.stepIndex]
    const pose = step ? this.poseForStep(step) : null
    return {
      schemaVersion: this.dance.schemaVersion,
      sequenceId: this.dance.id,
      sequenceLabel: this.dance.label,
      stepIndex: this.stepIndex,
      poseId: step?.pose ?? null,
      poseLabel: pose?.label ?? null,
      stepElapsed: Math.round(this.stepElapsed),
      activeAccents: this.activeAccents.map(accent => accent.id),
      triggers: this.lastTriggers,
      resolvedPose: this.loosePose,
    }
  }

  private captureAccents(triggers: TriggerFrame, current: MotionStep) {
    for (const key of triggerKeys) {
      if (!triggers[key]) continue
      for (const accentId of this.dance.triggerAccents?.[key] ?? []) this.pushAccent(accentId, key === 'chaosHit' ? 1 : 0.75)
    }

    if (current.advanceOn && triggers[current.advanceOn]) {
      this.stepElapsed = Math.max(this.stepElapsed, (current.holdMs ?? 0) + current.durationMs * 0.78)
      for (const accentId of current.accents ?? []) this.pushAccent(accentId, 0.85)
    } else if (current.beatSnap && triggers.beat) {
      this.stepElapsed = Math.max(this.stepElapsed, (current.holdMs ?? 0) + current.durationMs * 0.55)
      for (const accentId of current.accents ?? []) this.pushAccent(accentId, 0.7)
    }
  }

  private pushAccent(id: string, amount: number) {
    const map = getNamedAccent(id)
    if (!map) return
    this.activeAccents.push({
      id,
      map,
      amount,
      decayMs: id === 'chaosStretch' ? 520 : 260,
    })
  }

  private advance(deltaMs: number, triggers: TriggerFrame, reducedMotion: boolean, current: MotionStep) {
    const speed = reducedMotion ? 0.42 : 1
    this.stepElapsed += deltaMs * speed
    const total = current.durationMs + (current.holdMs ?? 0)

    while (this.stepElapsed >= total && total > 0) {
      this.stepElapsed -= total
      if (this.stepIndex < this.dance.steps.length - 1) this.stepIndex += 1
      else if (this.dance.loop) this.stepIndex = 0
      else {
        this.stepIndex = this.dance.steps.length - 1
        this.stepElapsed = total
        break
      }

      const next = this.dance.steps[this.stepIndex]
      if (!next) break
      if (!reducedMotion && next.advanceOn && triggers[next.advanceOn]) {
        this.stepElapsed = Math.max(this.stepElapsed, (next.holdMs ?? 0) * 0.5)
      }
    }
  }

  private decayAccents(deltaMs: number) {
    this.activeAccents = this.activeAccents
      .map(accent => ({ ...accent, amount: Math.max(0, accent.amount - deltaMs / accent.decayMs) }))
      .filter(accent => accent.amount > 0)
  }

  private poseForStep(step: MotionStep): PuppetPoseMap {
    return this.dance.poses[step.pose] ?? this.dance.poses.idle ?? { id: 'missing', label: 'Missing Pose', rotations: {} }
  }

  private mixPoses(from: PuppetPoseMap, to: PuppetPoseMap, amount: number): ResolvedPose {
    const pose = this.resolvePose(from)
    const target = this.resolvePose(to)
    for (const joint of this.rig.joints) {
      pose.angles[joint.id] = this.blendAngle(joint.id, pose.angles[joint.id], target.angles[joint.id], amount)
    }
    pose.offset.x = lerp(pose.offset.x, target.offset.x, amount)
    pose.offset.y = lerp(pose.offset.y, target.offset.y, amount)
    pose.scale = lerp(pose.scale, target.scale, amount)
    pose.face.eyes = lerp(pose.face.eyes, target.face.eyes, amount)
    pose.face.mouth = lerp(pose.face.mouth, target.face.mouth, amount)
    pose.face.brows = lerp(pose.face.brows, target.face.brows, amount)
    pose.face.eyeOpen = lerp(pose.face.eyeOpen, target.face.eyeOpen, amount)
    pose.face.pupilX = lerp(pose.face.pupilX, target.face.pupilX, amount)
    pose.face.pupilY = lerp(pose.face.pupilY, target.face.pupilY, amount)
    pose.face.leftBrowLift = lerp(pose.face.leftBrowLift, target.face.leftBrowLift, amount)
    pose.face.rightBrowLift = lerp(pose.face.rightBrowLift, target.face.rightBrowLift, amount)
    pose.face.leftBrowRotate = lerp(pose.face.leftBrowRotate, target.face.leftBrowRotate, amount)
    pose.face.rightBrowRotate = lerp(pose.face.rightBrowRotate, target.face.rightBrowRotate, amount)
    pose.face.mouthOpen = lerp(pose.face.mouthOpen, target.face.mouthOpen, amount)
    pose.face.mouthSmile = lerp(pose.face.mouthSmile, target.face.mouthSmile, amount)
    pose.face.topLipY = lerp(pose.face.topLipY, target.face.topLipY, amount)
    pose.face.bottomLipY = lerp(pose.face.bottomLipY, target.face.bottomLipY, amount)
    pose.face.tongue = lerp(pose.face.tongue, target.face.tongue, amount)
    return pose
  }

  private resolvePose(map: PuppetPoseMap): ResolvedPose {
    const angles = {} as ResolvedPose['angles']
    for (const joint of this.rig.joints) angles[joint.id] = map.rotations[joint.id] ?? joint.angle
    const mouth = map.face?.mouth ?? 0.2
    const eyes = map.face?.eyes ?? 1
    const brows = map.face?.brows ?? 0.35
    return {
      angles,
      offset: { x: map.offset?.x ?? 0, y: map.offset?.y ?? 0 },
      scale: map.scale ?? 1,
      face: {
        eyes,
        mouth,
        brows,
        eyeOpen: map.face?.eyeOpen ?? eyes,
        pupilX: map.face?.pupilX ?? 0,
        pupilY: map.face?.pupilY ?? 0,
        leftBrowLift: map.face?.leftBrowLift ?? brows,
        rightBrowLift: map.face?.rightBrowLift ?? brows,
        leftBrowRotate: map.face?.leftBrowRotate ?? -0.08,
        rightBrowRotate: map.face?.rightBrowRotate ?? 0.08,
        mouthOpen: map.face?.mouthOpen ?? mouth,
        mouthSmile: map.face?.mouthSmile ?? 0.18,
        topLipY: map.face?.topLipY ?? 0,
        bottomLipY: map.face?.bottomLipY ?? 0,
        tongue: map.face?.tongue ?? 0,
      },
    }
  }

  private applyAccents(pose: ResolvedPose, intensity: number): ResolvedPose {
    for (const accent of this.activeAccents) {
      const amount = accent.amount * intensity
      pose.offset.x += (accent.map.offset?.x ?? 0) * amount
      pose.offset.y += (accent.map.offset?.y ?? 0) * amount
      pose.scale *= 1 + ((accent.map.scale ?? 1) - 1) * amount
      addFace(pose.face, accent.map.face, amount)
      for (const joint of this.rig.joints) pose.angles[joint.id] += (accent.map.rotations?.[joint.id] ?? 0) * amount
    }
    return this.clampFace(this.applyAudioFaceMotion(pose))
  }

  private applyReducedMotion(pose: ResolvedPose, intensity: number): ResolvedPose {
    pose.offset.x *= 0.25 * intensity
    pose.offset.y *= 0.25 * intensity
    pose.scale = 1
    pose.face.mouth = Math.min(pose.face.mouth, 0.35)
    pose.face.mouthOpen = Math.min(pose.face.mouthOpen, 0.35)
    pose.face.tongue = 0
    return this.clampFace(pose)
  }

  private applyLooseLag(target: ResolvedPose, deltaMs: number, reducedMotion: boolean): ResolvedPose {
    if (reducedMotion) {
      this.loosePose = target
      return target
    }
    if (!this.loosePose) {
      this.loosePose = this.cloneResolvedPose(target)
      return target
    }

    const loose = Math.max(0, Math.min(1, this.dance.loose ?? 0.72))
    const base = Math.max(0.04, Math.min(1, deltaMs / 85))
    for (const joint of this.rig.joints) {
      const lag = this.jointLag(joint.id) * loose
      const amount = Math.max(0.06, Math.min(1, base / Math.max(0.25, lag)))
      this.loosePose.angles[joint.id] = this.blendAngle(
        joint.id,
        this.loosePose.angles[joint.id],
        target.angles[joint.id],
        amount,
      )
    }
    this.loosePose.offset.x = lerp(this.loosePose.offset.x, target.offset.x, Math.min(1, base * 1.8))
    this.loosePose.offset.y = lerp(this.loosePose.offset.y, target.offset.y, Math.min(1, base * 1.8))
    this.loosePose.scale = lerp(this.loosePose.scale, target.scale, Math.min(1, base * 1.4))
    this.loosePose.face.eyes = lerp(this.loosePose.face.eyes, target.face.eyes, Math.min(1, base * 2.2))
    this.loosePose.face.mouth = lerp(this.loosePose.face.mouth, target.face.mouth, Math.min(1, base * 2.2))
    this.loosePose.face.brows = lerp(this.loosePose.face.brows, target.face.brows, Math.min(1, base * 2.2))
    this.loosePose.face.eyeOpen = lerp(this.loosePose.face.eyeOpen, target.face.eyeOpen, Math.min(1, base * 2.2))
    this.loosePose.face.pupilX = lerp(this.loosePose.face.pupilX, target.face.pupilX, Math.min(1, base * 2.8))
    this.loosePose.face.pupilY = lerp(this.loosePose.face.pupilY, target.face.pupilY, Math.min(1, base * 2.8))
    this.loosePose.face.leftBrowLift = lerp(this.loosePose.face.leftBrowLift, target.face.leftBrowLift, Math.min(1, base * 2.2))
    this.loosePose.face.rightBrowLift = lerp(this.loosePose.face.rightBrowLift, target.face.rightBrowLift, Math.min(1, base * 2.2))
    this.loosePose.face.leftBrowRotate = lerp(this.loosePose.face.leftBrowRotate, target.face.leftBrowRotate, Math.min(1, base * 2.2))
    this.loosePose.face.rightBrowRotate = lerp(this.loosePose.face.rightBrowRotate, target.face.rightBrowRotate, Math.min(1, base * 2.2))
    this.loosePose.face.mouthOpen = lerp(this.loosePose.face.mouthOpen, target.face.mouthOpen, Math.min(1, base * 2.2))
    this.loosePose.face.mouthSmile = lerp(this.loosePose.face.mouthSmile, target.face.mouthSmile, Math.min(1, base * 2.2))
    this.loosePose.face.topLipY = lerp(this.loosePose.face.topLipY, target.face.topLipY, Math.min(1, base * 2.2))
    this.loosePose.face.bottomLipY = lerp(this.loosePose.face.bottomLipY, target.face.bottomLipY, Math.min(1, base * 2.2))
    this.loosePose.face.tongue = lerp(this.loosePose.face.tongue, target.face.tongue, Math.min(1, base * 1.2))
    return this.cloneResolvedPose(this.loosePose)
  }

  private applyAudioFaceMotion(pose: ResolvedPose): ResolvedPose {
    const triggers = this.lastTriggers
    if (!triggers) return pose
    if (this.isAudioIdle(triggers)) {
      const t = Date.now()
      pose.face.eyeOpen += Math.sin(t / 900) * 0.06
      pose.face.pupilX += Math.sin(t / 700) * 0.22
      pose.face.pupilY += Math.cos(t / 1100) * 0.12
      pose.face.mouthOpen += (Math.sin(t / 1200) + 1) * 0.035
      pose.face.leftBrowRotate += Math.sin(t / 1300) * 0.08
      pose.face.rightBrowRotate += Math.cos(t / 1300) * 0.08
      return pose
    }
    const pulse = triggers.energy
    pose.face.eyeOpen += triggers.beat ? -0.18 : 0
    pose.face.eyeOpen += triggers.highsHit ? 0.12 : 0
    pose.face.pupilX += (triggers.midsHit ? 0.45 : 0) + (triggers.chaosHit ? -0.6 : 0)
    pose.face.pupilY += (triggers.highsHit ? -0.35 : 0) + pulse * 0.14
    pose.face.leftBrowLift += triggers.highsHit ? 0.18 : 0
    pose.face.rightBrowLift += triggers.midsHit ? 0.14 : 0
    pose.face.leftBrowRotate += triggers.chaosHit ? -0.28 : (triggers.highsHit ? -0.1 : 0)
    pose.face.rightBrowRotate += triggers.chaosHit ? 0.28 : (triggers.highsHit ? 0.1 : 0)
    pose.face.mouthOpen += triggers.bassHit ? 0.22 : 0
    pose.face.bottomLipY += triggers.bassHit ? 0.18 : 0
    pose.face.topLipY += triggers.midsHit ? -0.08 : 0
    pose.face.mouthSmile += triggers.highsHit ? 0.12 : 0
    pose.face.tongue += triggers.chaosHit ? 0.42 : 0
    return pose
  }

  private isAudioIdle(triggers: TriggerFrame): boolean {
    return (
      triggers.energy <= 0.012 &&
      triggers.brightness <= 0.012 &&
      !triggers.beat &&
      !triggers.bassHit &&
      !triggers.midsHit &&
      !triggers.highsHit &&
      !triggers.chaosHit
    )
  }

  private clampFace(pose: ResolvedPose): ResolvedPose {
    pose.face.eyes = clamp01(pose.face.eyes)
    pose.face.mouth = clamp01(pose.face.mouth)
    pose.face.brows = clamp01(pose.face.brows)
    pose.face.eyeOpen = clamp(pose.face.eyeOpen, 0, 1)
    pose.face.pupilX = clamp(pose.face.pupilX, -1, 1)
    pose.face.pupilY = clamp(pose.face.pupilY, -1, 1)
    pose.face.leftBrowLift = clamp(pose.face.leftBrowLift, -0.4, 1.2)
    pose.face.rightBrowLift = clamp(pose.face.rightBrowLift, -0.4, 1.2)
    pose.face.leftBrowRotate = clamp(pose.face.leftBrowRotate, -0.75, 0.75)
    pose.face.rightBrowRotate = clamp(pose.face.rightBrowRotate, -0.75, 0.75)
    pose.face.mouthOpen = clamp(pose.face.mouthOpen, 0, 1)
    pose.face.mouthSmile = clamp(pose.face.mouthSmile, -0.8, 1)
    pose.face.topLipY = clamp(pose.face.topLipY, -1, 1)
    pose.face.bottomLipY = clamp(pose.face.bottomLipY, -1, 1)
    pose.face.tongue = clamp(pose.face.tongue, 0, 0.55)
    return pose
  }

  private blendAngle(id: PuppetJointId, from: number, to: number, amount: number): number {
    if (ARM_JOINTS.has(id)) return lerpJointAngle(id, from, to, amount)
    return lerp(from, to, amount)
  }

  private finalizePose(pose: ResolvedPose): ResolvedPose {
    for (const joint of this.rig.joints) {
      pose.angles[joint.id] = clampJointAngle(joint.id, pose.angles[joint.id])
    }
    return pose
  }

  private jointLag(id: PuppetJointId): number {
    if (id.includes('Wrist')) return 3.2
    if (id.includes('Elbow')) return 2.8
    if (id === 'head' || id === 'neck') return 1.5
    if (id.includes('Ankle')) return 1.8
    if (id.includes('Knee')) return 1.35
    if (id.includes('Shoulder')) return 2.4
    if (id === 'chest' || id === 'spine') return 1.1
    return 0.8
  }

  private cloneResolvedPose(pose: ResolvedPose): ResolvedPose {
    return {
      angles: { ...pose.angles },
      offset: { ...pose.offset },
      scale: pose.scale,
      face: { ...pose.face },
    }
  }
}

import { AnimationContext, IAnimation } from '../core/IAnimation'
import type { PublicAnimationContext } from '../author/types'
import CanvasAnimation from '../core/CanvasAnimation'
import { loadAnimationProgress, saveAnimationProgress } from '../controller/animationProgressStorage'
import { ScriptRunner, type ScriptRunnerSnapshot } from '../stopMotion/stopMotionScript'
import flowerScript from '../scripts/stopMotionFlowerStorm.script'

const flowerPoses = [
  { petalSpread: 0.18, petalLift: 0.1,  centerScale: 0.85 },
  { petalSpread: 0.22, petalLift: 0.14, centerScale: 0.95 },
  { petalSpread: 0.28, petalLift: 0.18, centerScale: 1.05 },
  { petalSpread: 0.34, petalLift: 0.24, centerScale: 1.08 },
  { petalSpread: 0.40, petalLift: 0.28, centerScale: 1.1  },
  { petalSpread: 0.46, petalLift: 0.34, centerScale: 1.03 },
  { petalSpread: 0.38, petalLift: 0.22, centerScale: 0.98 },
  { petalSpread: 0.30, petalLift: 0.16, centerScale: 0.92 },
]

const stemBends = [-0.12, -0.08, -0.04, 0, 0.05, 0.12, 0.08, 0.03]

const TWO_PI = Math.PI * 2
const MAX_GARDEN_ELEMENTS = 34
const PROGRESS_ID = 'stopMotionFlowerStorm'
const PROGRESS_VERSION = 1

type GardenSpecies = 'flower' | 'beautyBlossom' | 'grass' | 'seedPod' | 'mushroom' | 'fern' | 'reed' | 'clover'
type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night'
type WeatherCondition = 'clear' | 'softClouds' | 'overcast' | 'mist' | 'drizzle' | 'stormPassing' | 'afterRain'
type Rgb = [number, number, number]

type GardenElement = {
  id: number
  species: GardenSpecies
  xRatio: number
  yOffsetRatio: number
  sizeRatio: number
  bornAt: number
  growMs: number
  lifeMs: number
  seed: number
}

type FlowerEnvironment = {
  timeOfDay: TimeOfDay
  condition: WeatherCondition
}

type FlowerStormProgress = {
  version: 1
  runner: ScriptRunnerSnapshot
  storyElapsed: number
  effectsSeed: number
  skyShift: number
  environment: FlowerEnvironment
  nextEnvironment: FlowerEnvironment
  environmentTransitionElapsed: number
  environmentTransitionMs: number
  lastEnvironmentShiftElapsed: number
  gardenElements: Array<Omit<GardenElement, 'bornAt'> & { age: number }>
  lastGardenElementElapsed: number
  nextGardenElementId: number
}

type EnvironmentVisuals = {
  skyTop: Rgb
  skyMid: Rgb
  skyBottom: Rgb
  sunGlow: Rgb
  celestial: 'sun' | 'moon' | 'starfield'
  celestialColor: Rgb
  celestialGlow: Rgb
  celestialX: number
  celestialY: number
  celestialRadius: number
  celestialAlpha: number
  groundTop: Rgb
  groundBottom: Rgb
  hill: Rgb
  cloud: Rgb
  cloudAlpha: number
  cloudFamily: 'wispy' | 'cotton' | 'sheet' | 'storm'
  cloudSpeed: number
  cloudVariance: number
  cloudThickness: number
  cloudVerticalDrift: number
  cloudShadow: number
  cloudEdge: number
  warmth: number
  darkness: number
  dew: number
  mist: number
  rainBias: number
  starAlpha: number
  starCount: number
  starTwinkle: number
  sunHeight: number
  wind: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ]
}

function rgb([r, g, b]: Rgb, alpha = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function randomSeed(x: number) {
  const s = Math.sin(x) * 10000
  return s - Math.floor(s)
}

export function stopMotionFlowerStormFactory(): IAnimation {
  class FlowerStorm extends CanvasAnimation {
    private runner = new ScriptRunner(flowerScript)
    private skyShift = 0
    private effectsSeed = Math.floor(Math.random() * 10000)
    private storyStartMs = 0
    private gardenElements: GardenElement[] = []
    private lastGardenElementAt = 0
    private nextGardenElementId = 1
    private environment: FlowerEnvironment = { timeOfDay: 'dawn', condition: 'mist' }
    private nextEnvironment: FlowerEnvironment = { timeOfDay: 'morning', condition: 'softClouds' }
    private environmentTransitionStart = 0
    private environmentTransitionMs = 90000
    private lastEnvironmentShiftAt = 0
    private lightningFlashUntil = 0
    private lightningFlashStrength = 0
    private lightningFlashX = 0.5
    private approxBpm = 120
    private lastBeatAt = 0
    private lastBeatAcceptAt = 0
    private restoredProgress: FlowerStormProgress | null = null
    private progressRestored = false

    constructor() {
      super({ defaultOpacity: 0.98, defaultZIndex: 102, defaultBlendMode: 'normal', useEffects: true })
    }

    private updateApproxBpm(now: number, beat: boolean) {
      if (!beat) return
      // Avoid double-counting in case beat stays true for multiple frames.
      if (now - this.lastBeatAcceptAt < 140) return
      this.lastBeatAcceptAt = now

      if (this.lastBeatAt !== 0) {
        const delta = now - this.lastBeatAt
        const bpm = clamp(60000 / Math.max(1, delta), 60, 200)
        this.approxBpm = lerp(this.approxBpm, bpm, 0.12)
      }
      this.lastBeatAt = now
    }

    async init(container: HTMLElement, context: AnimationContext) {
      await super.init(container, context)
      this.restoredProgress = this.loadProgress()
    }

    async stop() {
      this.saveProgress()
      await super.stop()
    }

    destroy() {
      this.saveProgress()
      super.destroy()
    }

    restartStory() {
      this.runner.restart()
      this.storyStartMs = 0
      this.gardenElements = []
      this.lastGardenElementAt = 0
      this.nextGardenElementId = 1
      this.environmentTransitionStart = 0
      this.lastEnvironmentShiftAt = 0
    }

    setScriptOverrides(overrides: Partial<Pick<import('../stopMotion/stopMotionScript').Script, 'poseHoldMs' | 'stemHoldMs'>>) {
      this.runner.setOverrides(overrides)
    }

    getDebugState() {
      return {
        script: 'stopMotionFlowerStorm',
        runner: this.runner.getState(),
      }
    }

    protected draw(context: PublicAnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      const now = context.shared?.time?.elapsed ?? performance.now()
      this.restoreProgress(now)
      if (this.storyStartMs === 0) this.storyStartMs = now
      const reducedMotion = context.shared?.reducedMotion || false
      const features = context.shared?.features
      const triggers = context.shared?.getTriggers?.('chaos') || {
        bassHit: false, midsHit: false, highsHit: false,
        beat: false, chaosHit: false, energy: 0, brightness: 0.5,
      }
      const bands = this.readBands(context)
      const bass   = clamp(bands.bass, 0, 1)
      const mids   = clamp(bands.mids, 0, 1)
      const highs  = clamp(bands.highs, 0, 1)
      const env    = clamp(features?.env || features?.rms || 0, 0, 1)
      const heavyParticles = this.allowsHeavyParticles(context)
      const pScale = this.particleScale(context)
      const energy = clamp(triggers.energy || env * 1.2, 0, 1)
      const chaos  = triggers.chaosHit && energy > 0.65

      this.updateApproxBpm(now, triggers.beat)

      const run = this.runner.update(now, features, triggers, reducedMotion)
      const pose       = flowerPoses[run.poseIndex % flowerPoses.length]
      const bloomLevel = run.progress
      const growthStage = this.resolveGrowthStage(run.state, bloomLevel)
      this.updateEnvironment(now, reducedMotion)
      const bpmFactor = clamp(this.approxBpm / 120, 0.72, 1.38)
      const environmentVisuals = this.resolveEnvironmentVisuals(now)
      environmentVisuals.cloudSpeed *= bpmFactor
      // stormPulse is specific to the stormStrain state — computed here, not in the generic runner
      const stormPulse = run.state === 'stormStrain' ? Math.abs(Math.sin(now / 120)) : 0
      const cloudDark  = clamp((highs * 0.4 + mids * 0.2 + energy * 0.6) * 0.8 + bloomLevel * 0.15, 0, 1)
      this.skyShift    = lerp(this.skyShift, stormPulse * 0.6, reducedMotion ? 0.05 : 0.18)
      this.updateLightningFlash(now, run.state, environmentVisuals, highs, reducedMotion, context.shared?.lowPower || false)

      const sceneSize = clamp(Math.min(w, h), 280, 920)
      const groundY = h * 0.74
      const stemBaseX = w * 0.5
      const stemBaseY = h * 0.81
      const stemTopY  = h * 0.31
      const currentStemTopY = lerp(stemBaseY - sceneSize * 0.06, stemTopY, growthStage.stem)
      const centerX    = stemBaseX
      const centerY    = currentStemTopY - sceneSize * 0.045

      this.drawSky(now, w, h, cloudDark, stormPulse, run.state, environmentVisuals)
      this.drawCloudLayer(now, w, h, cloudDark, stormPulse, reducedMotion, environmentVisuals)
      this.drawCloudLighting(now, w, h, cloudDark, stormPulse, environmentVisuals)
      this.drawDistantHills(w, h, groundY, cloudDark, environmentVisuals)
      this.drawGround(w, h, groundY, cloudDark, stormPulse, run.state, mids, environmentVisuals)
      this.updateGardenElements(now, run.state, growthStage.world, reducedMotion)
      this.drawGardenElements(w, h, groundY, sceneSize, now, run.state, cloudDark, reducedMotion, environmentVisuals)
      this.drawRabbit(now - this.storyStartMs, w, h, groundY, sceneSize, run.state, reducedMotion, stormPulse)

      // stem + leaves
      const stemCurve = (stemBends[run.stemIndex % stemBends.length] ?? 0) * (1 + mids * 0.8)
      this.drawStem(stemBaseX, stemBaseY, currentStemTopY, stemCurve, w, h, sceneSize, cloudDark, growthStage.stem)

      const leafCount = reducedMotion ? 2 : 3
      for (let i = 0; i < leafCount; i++) {
        const y = stemBaseY - (i + 1) * h * 0.15 * growthStage.stem
        const direction = i % 2 === 0 ? 1 : -1
        const leafScale = sceneSize * (i === 0 ? 0.115 : 0.095) * growthStage.leaves
        this.drawLeaf(stemBaseX + direction * sceneSize * 0.025, y, direction, leafScale, mids * 0.9, cloudDark)
      }

      // flower center + petals
      const radius     = sceneSize * 0.12 * (0.84 + bloomLevel * 0.42)
      const petalSpread = pose.petalSpread + bloomLevel * 0.14
      const petalLift   = pose.petalLift   + env * 0.12
      const petalScale  = pose.centerScale * (0.9 + bloomLevel * 0.18)
      const jitter = reducedMotion ? 0 : (
        Math.sin(now / 370 + run.poseIndex) * 0.03 +
        Math.sin(now / 570 + run.poseIndex * 1.4) * 0.03
      )
      const stormCurl = run.state === 'stormStrain' || run.state === 'collapse' ? stormPulse : 0
      this.drawFlowerHead(centerX, centerY, radius, petalSpread, petalLift, petalScale, bloomLevel, growthStage.petals, growthStage.center, jitter, stormCurl, now, run.state)

      // falling petal debris
      const debrisCount = heavyParticles
        ? Math.floor((reducedMotion ? 12 : 24) * pScale)
        : Math.floor(reducedMotion ? 4 : 8)
      for (let i = 0; i < debrisCount; i++) {
        const seedValue = randomSeed(run.noiseSeed + i * 17 + this.effectsSeed)
        const x = (seedValue * 1.4 % 1) * w
        const y = ((seedValue * 3.2 + now / 950) % 1) * h
        const alpha = 0.08 + highs * 0.32 + (run.state === 'collapse' ? 0.2 : 0)
        this.ctx.fillStyle = `rgba(255, ${190 + seedValue * 40}, ${210 + seedValue * 25}, ${alpha})`
        this.ctx.beginPath()
        this.ctx.ellipse(x, y, 3 + seedValue * 4, 1.5 + seedValue * 1.8, seedValue * Math.PI, 0, Math.PI * 2)
        this.ctx.fill()
      }

      // rain layer
      const rainScale = context.shared?.lowPower ? Math.min(0.35, pScale) : pScale
      const rainAmount = Math.floor((reducedMotion ? highs * 12 : highs * 28 + mids * 14 + environmentVisuals.rainBias * 24) * rainScale)
      for (let i = 0; i < rainAmount; i++) {
        const offset = i * 19 + Math.floor(run.noiseSeed * 7)
        const rx = ((offset * 37) % 100) / 100 * w
        const ry = ((offset * 53 + now / 5) % h)
        this.ctx.strokeStyle = `rgba(210, 230, 255, ${0.08 + highs * 0.32})`
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        this.ctx.moveTo(rx, ry)
        this.ctx.lineTo(rx + 3, ry + 16 + highs * 12)
        this.ctx.stroke()
      }
      this.drawRainHighlights(now, w, h, groundY, rainAmount, highs, environmentVisuals, reducedMotion)

      if (!reducedMotion && (run.state === 'stormStrain' || run.state === 'collapse' || run.state === 'aftermath')) {
        this.drawPuddleReflection(centerX, groundY, radius, cloudDark, stormPulse)
      }

      // state accents: lightning during storm/collapse
      if (
        (run.state === 'stormStrain' || run.state === 'collapse') &&
        heavyParticles &&
        !reducedMotion &&
        !context.shared?.lowPower &&
        Math.random() < 0.05
      ) {
        const lx = centerX + (Math.random() - 0.5) * w * 0.5
        const ly = h * 0.1 + Math.random() * h * 0.2
        this.drawLightning(lx, ly, 1 + Math.random() * 0.8, 1.2)
      }

      // micro-effects triggers
      const punchStrength = run.state === 'stormStrain' ? energy * 0.7
        : run.state === 'collapse' ? 0.9
        : energy * 0.2
      const { effects } = this
      if (effects && chaos && !reducedMotion && heavyParticles) {
        effects.triggerRainSurge(18 + Math.floor(highs * 36), 0.9, '220,245,255')
        effects.triggerShockwave(centerX, centerY, 0.7 + (chaos ? 0.6 : 0))
        effects.triggerScreenPunch(punchStrength)
      }
      if (effects && triggers.beat && run.state === 'fullBloom' && heavyParticles) {
        effects.triggerParticleBurst(centerX, centerY, 10 + Math.floor(bass * 18), 0.8, '255,240,220')
      }
      if (effects) effects.update(this.ctx, now, this.pixelRatio)
    }

    private loadProgress(): FlowerStormProgress | null {
      const progress = loadAnimationProgress<FlowerStormProgress>(PROGRESS_ID)
      if (!progress || progress.version !== PROGRESS_VERSION) return null
      if (progress.runner?.scriptId !== flowerScript.id) return null
      return progress
    }

    private restoreProgress(now: number) {
      if (this.progressRestored) return
      this.progressRestored = true

      const progress = this.restoredProgress
      this.restoredProgress = null
      if (!progress) return

      this.runner.restoreSnapshot(progress.runner, now)
      this.effectsSeed = progress.effectsSeed
      this.skyShift = progress.skyShift
      this.storyStartMs = now - Math.max(0, progress.storyElapsed)
      this.environment = progress.environment
      this.nextEnvironment = progress.nextEnvironment
      this.environmentTransitionStart = now - Math.max(0, progress.environmentTransitionElapsed)
      this.environmentTransitionMs = progress.environmentTransitionMs
      this.lastEnvironmentShiftAt = now - Math.max(0, progress.lastEnvironmentShiftElapsed)
      this.gardenElements = progress.gardenElements.map((element) => ({
        ...element,
        bornAt: now - Math.max(0, element.age),
      }))
      this.lastGardenElementAt = now - Math.max(0, progress.lastGardenElementElapsed)
      this.nextGardenElementId = Math.max(1, progress.nextGardenElementId)
    }

    private saveProgress() {
      const now = this.context?.shared?.time?.elapsed ?? performance.now()
      if (this.storyStartMs === 0) return

      saveAnimationProgress(PROGRESS_ID, {
        version: PROGRESS_VERSION,
        runner: this.runner.getSnapshot(now),
        storyElapsed: Math.max(0, now - this.storyStartMs),
        effectsSeed: this.effectsSeed,
        skyShift: this.skyShift,
        environment: this.environment,
        nextEnvironment: this.nextEnvironment,
        environmentTransitionElapsed: Math.max(0, now - this.environmentTransitionStart),
        environmentTransitionMs: this.environmentTransitionMs,
        lastEnvironmentShiftElapsed: Math.max(0, now - this.lastEnvironmentShiftAt),
        gardenElements: this.gardenElements.map(({ bornAt, ...element }) => ({
          ...element,
          age: Math.max(0, now - bornAt),
        })),
        lastGardenElementElapsed: Math.max(0, now - this.lastGardenElementAt),
        nextGardenElementId: this.nextGardenElementId,
      } satisfies FlowerStormProgress)
    }

    private updateEnvironment(now: number, reducedMotion: boolean) {
      const shiftEvery = reducedMotion ? 900000 : 420000 + randomSeed(this.effectsSeed) * 180000
      if (this.lastEnvironmentShiftAt === 0) {
        this.lastEnvironmentShiftAt = now
        this.environmentTransitionStart = now
        this.nextEnvironment = this.pickNextEnvironment(this.environment)
        return
      }

      if (now - this.lastEnvironmentShiftAt < shiftEvery) return

      this.environment = this.nextEnvironment
      this.nextEnvironment = this.pickNextEnvironment(this.environment)
      this.environmentTransitionStart = now
      this.environmentTransitionMs = 75000 + randomSeed(now * 0.001 + this.effectsSeed) * 65000
      this.lastEnvironmentShiftAt = now
    }

    private pickNextEnvironment(current: FlowerEnvironment): FlowerEnvironment {
      const sequence: FlowerEnvironment[] = [
        { timeOfDay: 'dawn', condition: 'mist' },
        { timeOfDay: 'morning', condition: 'softClouds' },
        { timeOfDay: 'afternoon', condition: 'clear' },
        { timeOfDay: 'dusk', condition: 'afterRain' },
        { timeOfDay: 'night', condition: 'overcast' },
        { timeOfDay: 'dawn', condition: 'drizzle' },
        { timeOfDay: 'morning', condition: 'afterRain' },
        { timeOfDay: 'dusk', condition: 'stormPassing' },
      ]
      const currentIndex = sequence.findIndex((item) => item.timeOfDay === current.timeOfDay && item.condition === current.condition)
      return sequence[(currentIndex + 1 + sequence.length) % sequence.length]
    }

    private resolveEnvironmentVisuals(now: number): EnvironmentVisuals {
      const t = smoothstep(0, this.environmentTransitionMs, now - this.environmentTransitionStart)
      return this.blendEnvironmentVisuals(
        this.getEnvironmentVisuals(this.environment),
        this.getEnvironmentVisuals(this.nextEnvironment),
        t,
      )
    }

    private getEnvironmentVisuals(environment: FlowerEnvironment): EnvironmentVisuals {
      const time: Record<TimeOfDay, EnvironmentVisuals> = {
        dawn: {
          skyTop: [82, 96, 132], skyMid: [184, 138, 148], skyBottom: [236, 174, 136],
          sunGlow: [255, 216, 158], groundTop: [64, 104, 74], groundBottom: [20, 46, 34], hill: [40, 68, 70],
          celestial: 'sun' as const, celestialColor: [255, 232, 184] as Rgb, celestialGlow: [255, 196, 148] as Rgb,
          celestialX: 0.16, celestialY: 0.26, celestialRadius: 0.055, celestialAlpha: 0.72,
          cloud: [236, 240, 248] as Rgb, cloudAlpha: 0.16, cloudFamily: 'wispy', cloudSpeed: 1, cloudVariance: 0.16, cloudThickness: 0.16, cloudVerticalDrift: 0.08, cloudShadow: 0.04, cloudEdge: 0.24,
          starAlpha: 0.02, starCount: 6, starTwinkle: 0.22, sunHeight: 0.2, wind: 0.18,
          mist: 0, rainBias: 0,
          warmth: 0.58, darkness: 0.12, dew: 0.78,
        },
        morning: {
          skyTop: [72, 132, 188], skyMid: [112, 174, 214], skyBottom: [194, 221, 224],
          sunGlow: [255, 232, 168], groundTop: [58, 122, 72], groundBottom: [17, 58, 36], hill: [46, 94, 78],
          celestial: 'sun' as const, celestialColor: [255, 236, 182] as Rgb, celestialGlow: [255, 222, 154] as Rgb,
          celestialX: 0.18, celestialY: 0.18, celestialRadius: 0.058, celestialAlpha: 0.88,
          cloud: [228, 236, 246] as Rgb, cloudAlpha: 0.18, cloudFamily: 'cotton', cloudSpeed: 1, cloudVariance: 0.2, cloudThickness: 0.18, cloudVerticalDrift: 0.1, cloudShadow: 0.05, cloudEdge: 0.2,
          starAlpha: 0, starCount: 0, starTwinkle: 0.1, sunHeight: 0.45, wind: 0.22,
          mist: 0, rainBias: 0,
          warmth: 0.48, darkness: 0.02, dew: 0.36,
        },
        afternoon: {
          skyTop: [58, 112, 182], skyMid: [92, 150, 208], skyBottom: [178, 208, 222],
          sunGlow: [255, 220, 132], groundTop: [68, 116, 62], groundBottom: [24, 54, 30], hill: [58, 86, 66],
          celestial: 'sun' as const, celestialColor: [255, 230, 130] as Rgb, celestialGlow: [255, 204, 92] as Rgb,
          celestialX: 0.73, celestialY: 0.17, celestialRadius: 0.06, celestialAlpha: 0.95,
          cloud: [224, 232, 244] as Rgb, cloudAlpha: 0.16, cloudFamily: 'cotton', cloudSpeed: 1, cloudVariance: 0.18, cloudThickness: 0.18, cloudVerticalDrift: 0.08, cloudShadow: 0.04, cloudEdge: 0.18,
          starAlpha: 0, starCount: 0, starTwinkle: 0.08, sunHeight: 0.72, wind: 0.24,
          mist: 0, rainBias: 0,
          warmth: 0.68, darkness: 0, dew: 0.12,
        },
        dusk: {
          skyTop: [48, 54, 104], skyMid: [144, 76, 128], skyBottom: [232, 132, 92],
          sunGlow: [255, 174, 120], groundTop: [52, 84, 70], groundBottom: [18, 36, 34], hill: [42, 56, 72],
          celestial: 'sun' as const, celestialColor: [255, 190, 140] as Rgb, celestialGlow: [255, 160, 110] as Rgb,
          celestialX: 0.34, celestialY: 0.48, celestialRadius: 0.062, celestialAlpha: 0.76,
          cloud: [184, 188, 210] as Rgb, cloudAlpha: 0.22, cloudFamily: 'sheet', cloudSpeed: 0.92, cloudVariance: 0.22, cloudThickness: 0.24, cloudVerticalDrift: 0.12, cloudShadow: 0.08, cloudEdge: 0.16,
          starAlpha: 0.12, starCount: 18, starTwinkle: 0.26, sunHeight: 0.08, wind: 0.26,
          mist: 0, rainBias: 0,
          warmth: 0.74, darkness: 0.24, dew: 0.44,
        },
        night: {
          skyTop: [12, 18, 42], skyMid: [20, 34, 68], skyBottom: [38, 56, 82],
          sunGlow: [160, 190, 255], groundTop: [24, 58, 56], groundBottom: [8, 24, 28], hill: [18, 34, 48],
          celestial: 'moon' as const, celestialColor: [218, 230, 255] as Rgb, celestialGlow: [160, 194, 255] as Rgb,
          celestialX: 0.78, celestialY: 0.22, celestialRadius: 0.048, celestialAlpha: 0.92,
          cloud: [104, 118, 148] as Rgb, cloudAlpha: 0.3, cloudFamily: 'storm', cloudSpeed: 0.84, cloudVariance: 0.28, cloudThickness: 0.32, cloudVerticalDrift: 0.14, cloudShadow: 0.18, cloudEdge: 0.08,
          starAlpha: 0.78, starCount: 42, starTwinkle: 0.72, sunHeight: 0.48, wind: 0.14,
          mist: 0, rainBias: 0,
          warmth: 0.12, darkness: 0.72, dew: 0.68,
        },
      }

      const condition = {
        clear: { cloud: [238, 244, 255] as Rgb, cloudAlpha: 0.12, cloudFamily: 'wispy' as const, cloudSpeed: 1, cloudVariance: 0.18, cloudThickness: 0.18, cloudVerticalDrift: 0.08, cloudShadow: 0.04, cloudEdge: 0.22, mist: 0.02, rainBias: 0, dew: -0.08, darkness: -0.05 },
        softClouds: { cloud: [226, 234, 248] as Rgb, cloudAlpha: 0.22, cloudFamily: 'cotton' as const, cloudSpeed: 0.86, cloudVariance: 0.26, cloudThickness: 0.28, cloudVerticalDrift: 0.12, cloudShadow: 0.08, cloudEdge: 0.2, mist: 0.08, rainBias: 0, dew: 0.04, darkness: 0.02 },
        overcast: { cloud: [174, 184, 202] as Rgb, cloudAlpha: 0.42, cloudFamily: 'sheet' as const, cloudSpeed: 0.7, cloudVariance: 0.2, cloudThickness: 0.54, cloudVerticalDrift: 0.18, cloudShadow: 0.2, cloudEdge: 0.12, mist: 0.18, rainBias: 0.1, dew: 0.16, darkness: 0.18 },
        mist: { cloud: [218, 224, 228] as Rgb, cloudAlpha: 0.3, cloudFamily: 'wispy' as const, cloudSpeed: 0.64, cloudVariance: 0.34, cloudThickness: 0.16, cloudVerticalDrift: 0.06, cloudShadow: 0.05, cloudEdge: 0.16, mist: 0.54, rainBias: 0, dew: 0.24, darkness: 0.06 },
        drizzle: { cloud: [176, 194, 210] as Rgb, cloudAlpha: 0.36, cloudFamily: 'cotton' as const, cloudSpeed: 0.76, cloudVariance: 0.28, cloudThickness: 0.32, cloudVerticalDrift: 0.16, cloudShadow: 0.12, cloudEdge: 0.14, mist: 0.28, rainBias: 0.26, dew: 0.34, darkness: 0.12 },
        stormPassing: { cloud: [96, 112, 136] as Rgb, cloudAlpha: 0.5, cloudFamily: 'storm' as const, cloudSpeed: 0.58, cloudVariance: 0.42, cloudThickness: 0.76, cloudVerticalDrift: 0.28, cloudShadow: 0.32, cloudEdge: 0.08, mist: 0.16, rainBias: 0.2, dew: 0.28, darkness: 0.28 },
        afterRain: { cloud: [204, 214, 224] as Rgb, cloudAlpha: 0.2, cloudFamily: 'cotton' as const, cloudSpeed: 0.92, cloudVariance: 0.22, cloudThickness: 0.24, cloudVerticalDrift: 0.1, cloudShadow: 0.06, cloudEdge: 0.18, mist: 0.18, rainBias: 0.04, dew: 0.42, darkness: 0.02 },
      } satisfies Record<WeatherCondition, { cloud: Rgb; cloudAlpha: number; cloudFamily: EnvironmentVisuals['cloudFamily']; cloudSpeed: number; cloudVariance: number; cloudThickness: number; cloudVerticalDrift: number; cloudShadow: number; cloudEdge: number; mist: number; rainBias: number; dew: number; darkness: number }>

      const base = time[environment.timeOfDay]
      const weather = condition[environment.condition]
      return {
        ...base,
        cloud: weather.cloud,
        cloudAlpha: weather.cloudAlpha,
        cloudFamily: weather.cloudFamily,
        cloudSpeed: base.wind * weather.cloudSpeed,
        cloudVariance: weather.cloudVariance,
        cloudThickness: weather.cloudThickness,
        cloudVerticalDrift: weather.cloudVerticalDrift,
        cloudShadow: weather.cloudShadow,
        cloudEdge: weather.cloudEdge,
        mist: weather.mist,
        rainBias: weather.rainBias,
        dew: clamp(base.dew + weather.dew, 0, 1),
        darkness: clamp(base.darkness + weather.darkness, 0, 1),
        celestial: base.celestial,
        celestialColor: base.celestialColor,
        celestialGlow: base.celestialGlow,
        celestialX: base.celestialX,
        celestialY: base.celestialY,
        celestialRadius: base.celestialRadius,
        celestialAlpha: base.celestialAlpha,
        starAlpha: base.starAlpha,
        starCount: base.starCount,
        starTwinkle: base.starTwinkle,
        sunHeight: base.sunHeight,
        wind: base.wind,
      }
    }

    private blendEnvironmentVisuals(a: EnvironmentVisuals, b: EnvironmentVisuals, t: number): EnvironmentVisuals {
      return {
        skyTop: lerpRgb(a.skyTop, b.skyTop, t),
        skyMid: lerpRgb(a.skyMid, b.skyMid, t),
        skyBottom: lerpRgb(a.skyBottom, b.skyBottom, t),
        sunGlow: lerpRgb(a.sunGlow, b.sunGlow, t),
        celestial: t < 0.5 ? a.celestial : b.celestial,
        celestialColor: lerpRgb(a.celestialColor, b.celestialColor, t),
        celestialGlow: lerpRgb(a.celestialGlow, b.celestialGlow, t),
        celestialX: lerp(a.celestialX, b.celestialX, t),
        celestialY: lerp(a.celestialY, b.celestialY, t),
        celestialRadius: lerp(a.celestialRadius, b.celestialRadius, t),
        celestialAlpha: lerp(a.celestialAlpha, b.celestialAlpha, t),
        groundTop: lerpRgb(a.groundTop, b.groundTop, t),
        groundBottom: lerpRgb(a.groundBottom, b.groundBottom, t),
        hill: lerpRgb(a.hill, b.hill, t),
        cloud: lerpRgb(a.cloud, b.cloud, t),
        cloudAlpha: lerp(a.cloudAlpha, b.cloudAlpha, t),
        cloudFamily: t < 0.5 ? a.cloudFamily : b.cloudFamily,
        cloudSpeed: lerp(a.cloudSpeed, b.cloudSpeed, t),
        cloudVariance: lerp(a.cloudVariance, b.cloudVariance, t),
        cloudThickness: lerp(a.cloudThickness, b.cloudThickness, t),
        cloudVerticalDrift: lerp(a.cloudVerticalDrift, b.cloudVerticalDrift, t),
        cloudShadow: lerp(a.cloudShadow, b.cloudShadow, t),
        cloudEdge: lerp(a.cloudEdge, b.cloudEdge, t),
        warmth: lerp(a.warmth, b.warmth, t),
        darkness: lerp(a.darkness, b.darkness, t),
        dew: lerp(a.dew, b.dew, t),
        mist: lerp(a.mist, b.mist, t),
        rainBias: lerp(a.rainBias, b.rainBias, t),
        starAlpha: lerp(a.starAlpha, b.starAlpha, t),
        starCount: Math.round(lerp(a.starCount, b.starCount, t)),
        starTwinkle: lerp(a.starTwinkle, b.starTwinkle, t),
        sunHeight: lerp(a.sunHeight, b.sunHeight, t),
        wind: lerp(a.wind, b.wind, t),
      } as EnvironmentVisuals
    }

    private updateLightningFlash(
      now: number,
      state: string,
      environment: EnvironmentVisuals,
      highs: number,
      reducedMotion: boolean,
      lowPower: boolean,
    ) {
      if (reducedMotion || lowPower) return
      if (now < this.lightningFlashUntil) return

      const stormy = state === 'stormStrain' || state === 'collapse' || environment.rainBias > 0.16 || environment.darkness > 0.45
      if (!stormy) return

      const chance = (state === 'stormStrain' ? 0.035 : 0.006 + environment.rainBias * 0.018 + highs * 0.012)
      if (Math.random() > chance) return

      this.lightningFlashStrength = clamp(0.22 + environment.rainBias * 0.36 + highs * 0.28, 0.16, 0.72)
      this.lightningFlashUntil = now + 90 + Math.random() * 180
      this.lightningFlashX = 0.18 + Math.random() * 0.64
    }

    private currentLightningFlash(now: number) {
      if (now >= this.lightningFlashUntil) return 0
      const remaining = (this.lightningFlashUntil - now) / 270
      return clamp(remaining, 0, 1) * this.lightningFlashStrength
    }

    private drawSky(now: number, w: number, h: number, cloudDark: number, stormPulse: number, state: string, environment: EnvironmentVisuals) {
      const aftermath = state === 'aftermath' ? 1 : 0
      const stormTint: Rgb = [stormPulse * 24 - environment.darkness * 18, cloudDark * 28 + aftermath * 16, cloudDark * 34 + aftermath * 18]
      const skyTop = rgb([environment.skyTop[0] + stormTint[0], environment.skyTop[1] + stormTint[1], environment.skyTop[2] + stormTint[2]])
      const skyMid = rgb([environment.skyMid[0] + stormTint[0] * 0.7, environment.skyMid[1] + stormTint[1], environment.skyMid[2] + stormTint[2]])
      const skyBottom = rgb([environment.skyBottom[0] + stormTint[0] * 0.45, environment.skyBottom[1] + stormTint[1] * 0.65, environment.skyBottom[2] + stormTint[2] * 0.6])
      const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, skyTop)
      skyGrad.addColorStop(0.48, skyMid)
      skyGrad.addColorStop(1, skyBottom)
      this.ctx.fillStyle = skyGrad
      this.ctx.fillRect(0, 0, w, h)

      const glow = this.ctx.createRadialGradient(w * 0.68, h * 0.2, 0, w * 0.68, h * 0.2, Math.max(w, h) * 0.55)
      glow.addColorStop(0, rgb(environment.sunGlow, (0.1 + environment.warmth * 0.12 + aftermath * 0.08) * (1 - environment.darkness * 0.45)))
      glow.addColorStop(1, rgb(environment.sunGlow, 0))
      this.ctx.fillStyle = glow
      this.ctx.fillRect(0, 0, w, h)

      if (environment.mist > 0.03) {
        const mistGrad = this.ctx.createLinearGradient(0, h * 0.48, 0, h)
        mistGrad.addColorStop(0, 'rgba(220, 232, 236, 0)')
        mistGrad.addColorStop(1, `rgba(220, 232, 236, ${environment.mist * 0.18})`)
        this.ctx.fillStyle = mistGrad
        this.ctx.fillRect(0, h * 0.42, w, h * 0.58)
      }

      this.drawSkyAtmosphere(now, w, h, environment, cloudDark, stormPulse, state)
    }

    private drawSkyAtmosphere(now: number, w: number, h: number, environment: EnvironmentVisuals, cloudDark: number, stormPulse: number, state: string) {
      const celestialY = h * environment.celestialY
      const celestialX = w * environment.celestialX
      const celestialRadius = Math.max(w, h) * environment.celestialRadius
      const bodyAlpha = environment.celestialAlpha * (1 - cloudDark * 0.36)
      const glow = this.ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, celestialRadius * 8)
      glow.addColorStop(0, rgb(environment.celestialGlow, 0.34 * bodyAlpha))
      glow.addColorStop(0.24, rgb(environment.celestialGlow, 0.12 * bodyAlpha))
      glow.addColorStop(1, rgb(environment.celestialGlow, 0))
      this.ctx.fillStyle = glow
      this.ctx.fillRect(0, 0, w, h * 0.72)

      if (environment.starAlpha > 0.01) {
        const starCount = Math.max(0, Math.floor(environment.starCount * (0.5 + environment.starAlpha)))
        this.ctx.save()
        for (let i = 0; i < starCount; i++) {
          const seed = randomSeed(this.effectsSeed + i * 127)
          const x = seed * w
          const y = h * (0.02 + randomSeed(i * 41 + 9) * 0.38)
          const size = 0.6 + randomSeed(i * 19 + 5) * 1.6
          const twinkle = 0.7 + Math.sin((performance.now() / 1800) + i * 2.3) * environment.starTwinkle * 0.22
          const synthwaveStar = environment.darkness > 0.18 && (i % 5 === 0 || i % 7 === 0)
          this.ctx.fillStyle = synthwaveStar
            ? rgb(i % 2 === 0 ? [255, 98, 204] : [116, 224, 255], 1)
            : 'rgba(255, 250, 245, 1)'
          this.ctx.globalAlpha = environment.starAlpha * twinkle
          this.ctx.beginPath()
          this.ctx.arc(x, y, size, 0, TWO_PI)
          this.ctx.fill()
        }
        this.ctx.restore()
      }

      this.drawSynthwaveSkyEffects(now, w, h, environment, cloudDark, stormPulse, state)

      if (environment.celestial !== 'starfield') {
        this.drawCelestialBody(now, celestialX, celestialY, celestialRadius, environment, cloudDark, stormPulse, state)
      }
    }

    private drawSynthwaveSkyEffects(now: number, w: number, h: number, environment: EnvironmentVisuals, cloudDark: number, stormPulse: number, state: string) {
      const retroMood = clamp(
        smoothstep(0.16, 0.54, environment.darkness)
          + smoothstep(0.08, 0.42, environment.starAlpha)
          + (state === 'dusk' ? 0.18 : 0)
          + (state === 'night' ? 0.28 : 0)
          + (environment.rainBias > 0.05 ? 0.08 : 0),
        0,
        1,
      )
      if (retroMood <= 0.01) return

      const horizon = h * (0.44 + environment.mist * 0.06)
      const horizonSeed = Math.floor(now / (5000 + (this.effectsSeed % 5) * 900))
      const drift = now / (1800 + (this.effectsSeed % 7) * 220)
      const cloudFade = 1 - clamp(cloudDark * 0.72 + stormPulse * 0.24, 0, 0.88)

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'lighter'

      const colors: Rgb[] = [
        [255, 78, 188],
        [133, 235, 255],
        [207, 102, 255],
        [255, 142, 102],
      ]

      for (let i = 0; i < 4; i++) {
        const seed = randomSeed(this.effectsSeed + horizonSeed * 37 + i * 91)
        const yBase = horizon - h * (0.04 + seed * 0.12) + Math.sin(drift * (0.7 + seed * 0.5) + i * 1.4) * h * 0.018
        const color = colors[(i + horizonSeed) % colors.length]
        const bandWidth = h * (0.02 + seed * 0.02)
        const wobble = h * (0.014 + seed * 0.016)
        const alpha = retroMood * cloudFade * (0.06 + seed * 0.08)

        const glow = this.ctx.createLinearGradient(0, yBase - bandWidth * 3, 0, yBase + bandWidth * 3)
        glow.addColorStop(0, rgb(color, 0))
        glow.addColorStop(0.5, rgb(color, alpha * 0.46))
        glow.addColorStop(1, rgb(color, 0))
        this.ctx.fillStyle = glow
        this.ctx.fillRect(0, yBase - bandWidth * 3, w, bandWidth * 6)

        this.ctx.strokeStyle = rgb(color, alpha)
        this.ctx.lineWidth = Math.max(1, bandWidth)
        this.ctx.beginPath()
        for (let x = 0; x <= w; x += w / 14) {
          const progress = x / w
          const curve = Math.sin(progress * TWO_PI * (1.2 + i * 0.15) + seed * TWO_PI + drift * 0.18) * wobble
          const bend = Math.cos(progress * Math.PI * 1.1 + seed * 1.6) * wobble * 0.42
          const y = yBase + curve + bend + Math.sin((now / 8000) + progress * 8 + i) * wobble * 0.12
          if (x === 0) this.ctx.moveTo(x, y)
          else this.ctx.lineTo(x, y)
        }
        this.ctx.stroke()

        this.ctx.strokeStyle = rgb(color, alpha * 0.34)
        this.ctx.lineWidth = Math.max(1, bandWidth * 2.2)
        this.ctx.beginPath()
        for (let x = 0; x <= w; x += w / 12) {
          const progress = x / w
          const curve = Math.sin(progress * TWO_PI * (1.05 + i * 0.12) + seed * 1.7 + drift * 0.12) * wobble * 1.3
          const y = yBase + curve
          if (x === 0) this.ctx.moveTo(x, y)
          else this.ctx.lineTo(x, y)
        }
        this.ctx.stroke()
      }

      const ribbonCount = 2 + Math.floor(retroMood * 2)
      for (let i = 0; i < ribbonCount; i++) {
        const seed = randomSeed(this.effectsSeed + horizonSeed * 97 + i * 53)
        const color: Rgb = seed > 0.5 ? [255, 88, 196] : [104, 232, 255]
        const yBase = h * (0.16 + seed * 0.24)
        const wobble = h * (0.014 + seed * 0.022)
        const alpha = retroMood * cloudFade * (0.05 + seed * 0.08)
        this.ctx.strokeStyle = rgb(color, alpha)
        this.ctx.lineWidth = Math.max(1, h * (0.004 + seed * 0.004))
        this.ctx.beginPath()
        for (let x = -w * 0.05; x <= w * 1.05; x += w / 18) {
          const progress = (x + w * 0.05) / (w * 1.1)
          const arc = Math.sin(progress * TWO_PI * (1.3 + seed * 0.7) + drift * (0.8 + seed * 0.4) + i * 1.4) * wobble
          const y = yBase + arc + Math.cos(progress * Math.PI * 1.1 + seed * 3.7) * wobble * 0.35
          if (x <= -w * 0.049) this.ctx.moveTo(x, y)
          else this.ctx.lineTo(x, y)
        }
        this.ctx.stroke()
      }

      if (environment.darkness > 0.22) {
        const scanAlpha = retroMood * (0.014 + environment.darkness * 0.012) * cloudFade
        const scanOffset = (now / (70 + (this.effectsSeed % 5) * 11)) % 6
        this.ctx.fillStyle = `rgba(255, 110, 210, ${scanAlpha})`
        for (let y = 0; y < h * 0.72; y += 6) {
          this.ctx.fillRect(0, y + scanOffset, w, 1)
        }
      }

      if (retroMood > 0.46) {
        const flareSeed = randomSeed(this.effectsSeed + horizonSeed * 17)
        const flareX = w * (0.2 + flareSeed * 0.62)
        const flareY = horizon - h * (0.06 + flareSeed * 0.06)
        const flareRadius = Math.max(w, h) * (0.09 + flareSeed * 0.05)
        const flare = this.ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, flareRadius)
        flare.addColorStop(0, `rgba(255, 96, 214, ${retroMood * 0.12 * cloudFade})`)
        flare.addColorStop(0.32, `rgba(120, 224, 255, ${retroMood * 0.08 * cloudFade})`)
        flare.addColorStop(1, 'rgba(120, 224, 255, 0)')
        this.ctx.fillStyle = flare
        this.ctx.fillRect(0, 0, w, h * 0.54)
      }

      this.ctx.restore()
    }

    private drawCelestialBody(now: number, x: number, y: number, radius: number, environment: EnvironmentVisuals, cloudDark: number, stormPulse: number, state: string) {
      const isNight = environment.celestial === 'moon' || environment.starAlpha > 0.12
      const pulse = (0.78 + Math.sin((now / 24000) + environment.sunHeight * TWO_PI) * 0.08) * (isNight ? 0.94 : 1.04)
      const alpha = environment.celestialAlpha * pulse * (1 - cloudDark * 0.28)
      const glowRadius = radius * (7 + stormPulse * 2)
      const glow = this.ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
      glow.addColorStop(0, rgb(environment.celestialGlow, 0.55 * alpha))
      glow.addColorStop(0.28, rgb(environment.celestialGlow, 0.22 * alpha))
      glow.addColorStop(1, rgb(environment.celestialGlow, 0))
      this.ctx.fillStyle = glow
      this.ctx.beginPath()
      this.ctx.arc(x, y, glowRadius, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.save()
      this.ctx.globalAlpha = alpha
      this.ctx.fillStyle = rgb(environment.celestialColor, alpha)
      this.ctx.beginPath()
      this.ctx.arc(x, y, radius, 0, TWO_PI)
      this.ctx.fill()

      if (environment.celestial === 'moon') {
        this.ctx.fillStyle = 'rgba(205, 220, 238, 0.16)'
        for (let i = 0; i < 4; i++) {
          const dx = Math.sin(i * 2.1 + environment.sunHeight) * radius * 0.22
          const dy = Math.cos(i * 1.7 + environment.sunHeight) * radius * 0.14
          this.ctx.beginPath()
          this.ctx.arc(x + dx, y + dy, radius * (0.18 + i * 0.025), 0, TWO_PI)
          this.ctx.fill()
        }
      } else {
        this.ctx.strokeStyle = 'rgba(255, 236, 190, 0.26)'
        this.ctx.lineWidth = Math.max(1, radius * 0.14)
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * TWO_PI
          const sx = x + Math.cos(angle) * radius * 1.7
          const sy = y + Math.sin(angle) * radius * 1.7
          this.ctx.beginPath()
          this.ctx.moveTo(x + Math.cos(angle) * radius * 1.1, y + Math.sin(angle) * radius * 1.1)
          this.ctx.lineTo(sx, sy)
          this.ctx.stroke()
        }
      }

      if (environment.darkness > 0.18 || state === 'dusk' || state === 'night') {
        const neonRadius = radius * 2.65
        const neon = this.ctx.createRadialGradient(x, y, radius * 0.5, x, y, neonRadius)
        neon.addColorStop(0, 'rgba(255, 100, 205, 0.12)')
        neon.addColorStop(0.36, 'rgba(112, 226, 255, 0.16)')
        neon.addColorStop(0.72, 'rgba(215, 120, 255, 0.08)')
        neon.addColorStop(1, 'rgba(215, 120, 255, 0)')
        this.ctx.fillStyle = neon
        this.ctx.beginPath()
        this.ctx.arc(x, y, neonRadius, 0, TWO_PI)
        this.ctx.fill()

        this.ctx.strokeStyle = 'rgba(255, 104, 206, 0.14)'
        this.ctx.lineWidth = Math.max(1, radius * 0.1)
        this.ctx.beginPath()
        this.ctx.arc(x, y, radius * 1.65, 0, TWO_PI)
        this.ctx.stroke()

        this.ctx.strokeStyle = 'rgba(116, 226, 255, 0.1)'
        this.ctx.lineWidth = Math.max(1, radius * 0.06)
        this.ctx.beginPath()
        this.ctx.arc(x, y, radius * 2.02, 0, TWO_PI)
        this.ctx.stroke()
      }
      this.ctx.restore()

      if (state === 'stormStrain' || state === 'collapse') {
        this.ctx.fillStyle = `rgba(255, 255, 245, ${0.04 + stormPulse * 0.08})`
        this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight * 0.22)
      }
    }

    private drawCloudLighting(now: number, w: number, h: number, cloudDark: number, stormPulse: number, environment: EnvironmentVisuals) {
      const flash = this.currentLightningFlash(now)
      const moodyGlow = clamp(environment.rainBias * 0.08 + environment.darkness * 0.04 + stormPulse * 0.1, 0, 0.18)
      const strength = Math.max(flash, moodyGlow)
      if (strength <= 0.01) return

      const x = w * this.lightningFlashX
      const y = h * (0.16 + environment.cloudAlpha * 0.18)
      const radius = Math.max(w, h) * (0.22 + strength * 0.4)
      const glow = this.ctx.createRadialGradient(x, y, 0, x, y, radius)
      glow.addColorStop(0, `rgba(235, 246, 255, ${0.1 + strength * 0.36})`)
      glow.addColorStop(0.38, `rgba(190, 214, 255, ${strength * 0.16})`)
      glow.addColorStop(1, 'rgba(190, 214, 255, 0)')
      this.ctx.fillStyle = glow
      this.ctx.fillRect(0, 0, w, h * 0.62)

      if (flash > 0.08) {
        this.ctx.fillStyle = `rgba(255, 255, 245, ${flash * 0.08})`
        this.ctx.fillRect(0, 0, w, h)
      }

      if (cloudDark > 0.45 || environment.rainBias > 0.12) {
        this.ctx.strokeStyle = `rgba(225, 238, 255, ${strength * 0.18})`
        this.ctx.lineWidth = 1
        for (let i = 0; i < 4; i++) {
          const yy = h * (0.12 + i * 0.055)
          this.ctx.beginPath()
          this.ctx.moveTo(0, yy)
          this.ctx.bezierCurveTo(w * 0.25, yy - h * 0.03, w * 0.54, yy + h * 0.025, w, yy - h * 0.01)
          this.ctx.stroke()
        }
      }
    }

    private drawCloudLayer(now: number, w: number, h: number, cloudDark: number, stormPulse: number, reducedMotion: boolean, environment: EnvironmentVisuals) {
      const layers = [
        { count: 4, y: 0.12, size: 0.34, speed: 43000, alpha: 0.18, dir: -1, family: environment.cloudFamily === 'storm' ? 'storm' : environment.cloudFamily === 'sheet' ? 'sheet' : 'wispy' as EnvironmentVisuals['cloudFamily'] },
        { count: 5, y: 0.22, size: 0.44, speed: 30000, alpha: 0.24, dir: 1, family: environment.cloudFamily === 'wispy' ? 'wispy' : 'cotton' as EnvironmentVisuals['cloudFamily'] },
        { count: 3, y: 0.34, size: 0.58, speed: 52000, alpha: 0.18, dir: -1, family: environment.cloudFamily === 'storm' ? 'storm' : 'sheet' as EnvironmentVisuals['cloudFamily'] },
      ]
      for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        const layer = layers[layerIndex]
        const cloudSpeed = layer.speed * environment.cloudSpeed * (0.72 + 0.28 * Math.sin(now / (22000 + layerIndex * 7000) + layerIndex))
        const drift = reducedMotion ? 0 : (now / cloudSpeed) * w * layer.dir
        const span = w + w * layer.size
        for (let i = 0; i < layer.count; i++) {
          const seed = randomSeed(i * 91 + layer.count * 13)
          const windWobble = Math.sin(now / (15000 + layerIndex * 4300) + seed * TWO_PI) * environment.wind * w * 0.015
          const raw = i / layer.count * span + drift + seed * w * 0.18 + windWobble
          const x = ((raw % span) + span) % span - w * layer.size * 0.45
          const y = h * layer.y + seed * h * 0.055 + stormPulse * h * 0.012 + environment.cloudVerticalDrift * h * Math.sin(now / (30000 + layerIndex * 8000) + seed * 5)
          const width = w * layer.size * (0.72 + seed * environment.cloudVariance)
          const height = h * (0.11 + layer.size * environment.cloudThickness)
          this.drawCloud(x, y, width, height, layer.alpha + environment.cloudAlpha + cloudDark * 0.12, environment.cloud, environment.cloudFamily, layerIndex, seed, environment)
        }
      }

      this.ctx.fillStyle = `rgba(17, 24, 38, ${cloudDark * 0.14 + stormPulse * 0.1 + environment.darkness * 0.16})`
      this.ctx.fillRect(0, 0, w, h * 0.08)
    }

    private drawDistantHills(w: number, h: number, groundY: number, cloudDark: number, environment: EnvironmentVisuals) {
      this.ctx.save()
      this.ctx.fillStyle = rgb(environment.hill, 0.24 + cloudDark * 0.18 + environment.darkness * 0.14)
      this.ctx.beginPath()
      this.ctx.moveTo(0, groundY)
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * w
        const y = groundY - h * (0.05 + randomSeed(i * 43) * 0.07)
        this.ctx.lineTo(x, y)
      }
      this.ctx.lineTo(w, h)
      this.ctx.lineTo(0, h)
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.restore()
    }

    private drawGround(w: number, h: number, groundY: number, cloudDark: number, stormPulse: number, state: string, mids: number, environment: EnvironmentVisuals) {
      const wet = state === 'stormStrain' || state === 'collapse' ? 1 : state === 'aftermath' ? 0.45 : environment.dew * 0.35
      const groundGrad = this.ctx.createLinearGradient(0, groundY, 0, h)
      groundGrad.addColorStop(0, rgb([
        environment.groundTop[0] - wet * 10 - environment.darkness * 10,
        environment.groundTop[1] - cloudDark * 18,
        environment.groundTop[2] + wet * 12,
      ]))
      groundGrad.addColorStop(1, rgb([
        environment.groundBottom[0] + wet * 4,
        environment.groundBottom[1] - cloudDark * 8,
        environment.groundBottom[2] + wet * 10,
      ]))
      this.ctx.fillStyle = groundGrad
      this.ctx.beginPath()
      this.ctx.moveTo(0, groundY)
      for (let i = 0; i <= 18; i++) {
        const x = (i / 18) * w
        const y = groundY + Math.sin(i * 0.9 + stormPulse) * h * 0.012 + randomSeed(i * 29) * h * 0.018
        this.ctx.lineTo(x, y)
      }
      this.ctx.lineTo(w, h)
      this.ctx.lineTo(0, h)
      this.ctx.closePath()
      this.ctx.fill()

      const bladeCount = Math.floor(clamp(w / 28, 12, 46))
      this.ctx.strokeStyle = `rgba(150, 197, 135, ${0.14 + mids * 0.14 + environment.dew * 0.08})`
      this.ctx.lineWidth = 1.4
      for (let i = 0; i < bladeCount; i++) {
        const seed = randomSeed(i * 37)
        const x = seed * w
        const y = groundY + h * 0.025 + randomSeed(i * 71) * h * 0.08
        const bladeH = h * (0.035 + seed * 0.035)
        this.ctx.beginPath()
        this.ctx.moveTo(x, y)
        this.ctx.quadraticCurveTo(x + (seed - 0.5) * 18, y - bladeH * 0.6, x + (seed - 0.5) * 26, y - bladeH)
        this.ctx.stroke()
      }
    }

    private drawRainHighlights(
      now: number,
      w: number,
      h: number,
      groundY: number,
      rainAmount: number,
      highs: number,
      environment: EnvironmentVisuals,
      reducedMotion: boolean,
    ) {
      if (reducedMotion) return
      const shine = clamp(environment.rainBias * 0.34 + environment.dew * 0.14 + highs * 0.18, 0, 0.42)
      if (shine <= 0.03 || rainAmount < 2) return

      const flash = this.currentLightningFlash(now)
      this.ctx.save()
      this.ctx.strokeStyle = `rgba(226, 242, 255, ${shine * 0.22 + flash * 0.16})`
      this.ctx.lineWidth = 1
      const streaks = Math.min(18, Math.max(4, Math.floor(rainAmount * 0.22)))
      for (let i = 0; i < streaks; i++) {
        const seed = randomSeed(this.effectsSeed + i * 53)
        const x = seed * w
        const y = groundY + h * (0.04 + randomSeed(i * 89) * 0.18)
        const length = w * (0.018 + seed * 0.035)
        this.ctx.beginPath()
        this.ctx.moveTo(x, y)
        this.ctx.lineTo(x + length, y - h * 0.004)
        this.ctx.stroke()
      }

      const sheen = this.ctx.createLinearGradient(0, groundY, 0, h)
      sheen.addColorStop(0, `rgba(210, 232, 255, ${shine * 0.1 + flash * 0.08})`)
      sheen.addColorStop(0.45, 'rgba(210, 232, 255, 0)')
      this.ctx.fillStyle = sheen
      this.ctx.fillRect(0, groundY, w, h - groundY)
      this.ctx.restore()
    }

    private resolveGrowthStage(state: string, progress: number) {
      const wholePlant = state === 'bud'
        ? progress * 0.24
        : state === 'blooming'
          ? 0.24 + progress * 0.66
          : state === 'aftermath'
            ? 0.86 + progress * 0.14
            : 1

      return {
        stem: smoothstep(0.02, 0.36, wholePlant),
        leaves: smoothstep(0.18, 0.58, wholePlant),
        petals: smoothstep(0.38, 0.88, wholePlant),
        center: smoothstep(0.64, 1, wholePlant),
        world: smoothstep(0.08, 0.78, wholePlant),
      }
    }

    private updateGardenElements(now: number, state: string, worldGrowth: number, reducedMotion: boolean) {
      if (reducedMotion || worldGrowth < 0.35 || state === 'collapse') return

      const cadence = state === 'aftermath' ? 1900 : 2800
      if (now - this.lastGardenElementAt < cadence) return

      const element = this.createGardenElement(now)
      if (this.gardenElements.length < MAX_GARDEN_ELEMENTS) {
        this.gardenElements.push(element)
      } else {
        const recycleIndex = this.findGardenRecycleIndex(now)
        this.gardenElements[recycleIndex] = element
      }
      this.lastGardenElementAt = now
    }

    private createGardenElement(now: number): GardenElement {
      const id = this.nextGardenElementId++
      const seed = randomSeed(this.effectsSeed + id * 97)
      const speciesPick = randomSeed(this.effectsSeed + id * 131)
      const species: GardenSpecies = speciesPick < 0.08
        ? 'beautyBlossom'
        : speciesPick < 0.36
        ? 'flower'
        : speciesPick < 0.54
          ? 'grass'
          : speciesPick < 0.68
            ? 'seedPod'
            : speciesPick < 0.8
              ? 'mushroom'
              : speciesPick < 0.9
                ? 'fern'
                : speciesPick < 0.96
                  ? 'reed'
                  : 'clover'

      const sideLane = randomSeed(this.effectsSeed + id * 173)
      const xRatio = sideLane < 0.42
        ? 0.08 + seed * 0.28
        : sideLane < 0.84
          ? 0.64 + seed * 0.28
          : 0.18 + seed * 0.64

      const isBeautyBlossom = species === 'beautyBlossom'
      return {
        id,
        species,
        xRatio: clamp(xRatio, 0.05, 0.95),
        yOffsetRatio: 0.02 + randomSeed(this.effectsSeed + id * 211) * 0.12,
        sizeRatio: isBeautyBlossom
          ? 0.088 + randomSeed(this.effectsSeed + id * 257) * 0.052
          : 0.045 + randomSeed(this.effectsSeed + id * 257) * 0.075,
        bornAt: now,
        growMs: isBeautyBlossom
          ? 7600 + randomSeed(this.effectsSeed + id * 293) * 5200
          : 5200 + randomSeed(this.effectsSeed + id * 293) * 5200,
        lifeMs: isBeautyBlossom
          ? 72000 + randomSeed(this.effectsSeed + id * 337) * 36000
          : 42000 + randomSeed(this.effectsSeed + id * 337) * 36000,
        seed,
      }
    }

    private findGardenRecycleIndex(now: number) {
      let oldestIndex = 0
      let oldestScore = Number.NEGATIVE_INFINITY
      for (let i = 0; i < this.gardenElements.length; i++) {
        const element = this.gardenElements[i]
        const age = now - element.bornAt
        const spentBonus = age > element.lifeMs ? element.lifeMs : 0
        const score = age + spentBonus + element.yOffsetRatio * 8000
        if (score > oldestScore) {
          oldestScore = score
          oldestIndex = i
        }
      }
      return oldestIndex
    }

    private drawGardenElements(
      w: number,
      h: number,
      groundY: number,
      sceneSize: number,
      now: number,
      state: string,
      cloudDark: number,
      reducedMotion: boolean,
      environment: EnvironmentVisuals,
    ) {
      const stormLean = state === 'stormStrain' || state === 'collapse' ? -0.45 : 0
      for (const element of this.gardenElements) {
        const age = now - element.bornAt
        const growth = smoothstep(0, element.growMs, age)
        const spent = smoothstep(element.lifeMs * 0.72, element.lifeMs, age)
        const x = element.xRatio * w
        const y = groundY + element.yOffsetRatio * h
        const size = sceneSize * element.sizeRatio
        const sway = reducedMotion ? 0 : Math.sin(now / (1300 + element.seed * 900) + element.id) * 0.12
        this.drawGardenElement(element, x, y, size, growth, spent, sway + stormLean, cloudDark, environment)
      }
    }

    private drawGardenElement(
      element: GardenElement,
      x: number,
      y: number,
      size: number,
      growth: number,
      spent: number,
      sway: number,
      cloudDark: number,
      environment: EnvironmentVisuals,
    ) {
      if (growth <= 0.01) return

      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.globalAlpha = 0.38 + growth * 0.5 - spent * 0.22

      if (element.species === 'grass') {
        this.drawGardenGrass(size, growth, sway, cloudDark, element.seed)
      } else if (element.species === 'mushroom') {
        this.drawGardenMushroom(size, growth, spent, cloudDark)
      } else if (element.species === 'fern') {
        this.drawGardenFern(size, growth, spent, sway, cloudDark, element.seed)
      } else if (element.species === 'reed') {
        this.drawGardenReed(size, growth, spent, sway, cloudDark, element.seed)
      } else if (element.species === 'clover') {
        this.drawGardenClover(size, growth, spent, sway, cloudDark, element.seed)
      } else {
        const stemHeight = size * (1.6 + element.seed * 0.9) * growth
        const lean = sway * stemHeight
        this.drawGardenStem(stemHeight, lean, size, growth, spent, cloudDark)
        if (element.species === 'flower') {
          this.drawGardenBlossom(lean, -stemHeight, size, growth, spent, element.seed)
        } else if (element.species === 'beautyBlossom') {
          this.drawBeautyBlossom(lean, -stemHeight, size, growth, spent, element.seed, cloudDark, environment)
        } else {
          this.drawGardenSeedPod(lean, -stemHeight, size, growth, spent)
        }
      }

      this.ctx.restore()
    }

    private drawGardenStem(stemHeight: number, lean: number, size: number, growth: number, spent: number, cloudDark: number) {
      this.ctx.strokeStyle = `rgba(${76 - cloudDark * 12 + spent * 35}, ${142 - cloudDark * 24 - spent * 18}, ${72 + cloudDark * 12 - spent * 12}, ${0.62 + growth * 0.2})`
      this.ctx.lineWidth = Math.max(1, size * 0.08)
      this.ctx.lineCap = 'round'
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.quadraticCurveTo(lean * 0.28, -stemHeight * 0.55, lean, -stemHeight)
      this.ctx.stroke()

      this.ctx.fillStyle = `rgba(108, 165, 86, ${0.26 + growth * 0.22 - spent * 0.12})`
      this.ctx.beginPath()
      this.ctx.ellipse(lean * 0.32 - size * 0.14, -stemHeight * 0.45, size * 0.22, size * 0.07, -0.34, 0, TWO_PI)
      this.ctx.fill()
    }

    private drawGardenBlossom(x: number, y: number, size: number, growth: number, spent: number, seed: number) {
      const bloom = smoothstep(0.36, 0.78, growth) * (1 - spent * 0.65)
      if (bloom <= 0.02) return

      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate((seed - 0.5) * 0.4)
      const petalCount = 5 + Math.floor(seed * 3)
      this.ctx.fillStyle = `rgba(${214 + seed * 35}, ${120 + seed * 70}, ${178 + seed * 46}, ${0.48 + bloom * 0.38})`
      for (let i = 0; i < petalCount; i++) {
        const angle = i / petalCount * TWO_PI
        this.ctx.beginPath()
        this.ctx.ellipse(Math.cos(angle) * size * 0.23, Math.sin(angle) * size * 0.23, size * 0.15 * bloom, size * 0.28 * bloom, angle, 0, TWO_PI)
        this.ctx.fill()
      }
      this.ctx.fillStyle = `rgba(239, ${202 - spent * 70}, 92, ${0.72 + bloom * 0.18})`
      this.ctx.beginPath()
      this.ctx.arc(0, 0, size * 0.14 * bloom, 0, TWO_PI)
      this.ctx.fill()
      this.ctx.restore()
    }

    private drawBeautyBlossom(x: number, y: number, size: number, growth: number, spent: number, seed: number, cloudDark: number, environment: EnvironmentVisuals) {
      const bloom = smoothstep(0.28, 0.86, growth) * (1 - spent * 0.42)
      if (bloom <= 0.02) return

      const open = smoothstep(0.42, 0.92, growth)
      const glowAlpha = clamp((0.06 + bloom * 0.12 + environment.warmth * 0.025) * (1 - cloudDark * 0.38 + environment.darkness * 0.16), 0.02, 0.22)
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate((seed - 0.5) * 0.22)

      const glow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.45 * bloom)
      glow.addColorStop(0, `rgba(255, 232, 180, ${glowAlpha})`)
      glow.addColorStop(0.48, `rgba(255, 160, 214, ${glowAlpha * 0.62})`)
      glow.addColorStop(1, 'rgba(255, 160, 214, 0)')
      this.ctx.fillStyle = glow
      this.ctx.beginPath()
      this.ctx.arc(0, 0, size * 1.45 * bloom, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.fillStyle = `rgba(${82 - cloudDark * 10}, ${142 - cloudDark * 20}, ${86 + cloudDark * 10}, ${0.52 + bloom * 0.28})`
      for (let i = 0; i < 6; i++) {
        const angle = i / 6 * TWO_PI + Math.PI / 6
        this.ctx.save()
        this.ctx.rotate(angle)
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.bezierCurveTo(size * 0.1, -size * 0.18, size * 0.16, -size * 0.38, 0, -size * 0.52 * bloom)
        this.ctx.bezierCurveTo(-size * 0.18, -size * 0.34, -size * 0.12, -size * 0.14, 0, 0)
        this.ctx.fill()
        this.ctx.restore()
      }

      this.drawBeautyPetalRing(10, size * 0.82, size * 0.24, bloom, open, seed, spent, 0, 0.54)
      this.drawBeautyPetalRing(8, size * 0.58, size * 0.18, bloom, open, seed + 0.33, spent, Math.PI / 8, 0.78)
      this.drawBeautyPetalRing(5, size * 0.34, size * 0.12, bloom, open, seed + 0.66, spent, Math.PI / 5, 0.88)
      this.drawBeautyFilaments(size, bloom, open, seed, spent)

      const centerScale = smoothstep(0.62, 1, growth) * (1 - spent * 0.35)
      if (centerScale > 0.02) {
        const centerRadius = size * 0.16 * centerScale
        const centerGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, centerRadius)
        centerGrad.addColorStop(0, 'rgba(255, 246, 168, 0.98)')
        centerGrad.addColorStop(0.62, 'rgba(235, 166, 72, 0.92)')
        centerGrad.addColorStop(1, 'rgba(130, 72, 74, 0.72)')
        this.ctx.fillStyle = centerGrad
        this.ctx.beginPath()
        this.ctx.arc(0, 0, centerRadius, 0, TWO_PI)
        this.ctx.fill()

        this.ctx.fillStyle = 'rgba(93, 54, 58, 0.48)'
        for (let i = 0; i < 12; i++) {
          const angle = i * 2.399963
          const r = centerRadius * 0.72 * Math.sqrt(i / 12)
          this.ctx.beginPath()
          this.ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, Math.max(1, size * 0.016 * centerScale), 0, TWO_PI)
          this.ctx.fill()
        }
      }

      this.drawBeautyDew(size, bloom, open, seed, cloudDark, environment)

      this.ctx.restore()
    }

    private drawBeautyPetalRing(
      count: number,
      length: number,
      width: number,
      bloom: number,
      open: number,
      seed: number,
      spent: number,
      offset: number,
      alpha: number,
    ) {
      for (let i = 0; i < count; i++) {
        const angle = i / count * TWO_PI + offset
        const curl = (1 - open) * 0.9 + spent * 0.22
        const distance = length * 0.22 * open
        this.ctx.save()
        this.ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance)
        this.ctx.rotate(angle + Math.sin(seed * 10 + i) * 0.06)
        this.ctx.scale(0.35 + open * 0.65, 0.48 + open * 0.52)

        const grad = this.ctx.createLinearGradient(0, 0, length, 0)
        grad.addColorStop(0, `rgba(${196 + seed * 28}, ${96 + seed * 38}, ${178 + seed * 24}, ${alpha * bloom})`)
        grad.addColorStop(0.55, `rgba(255, ${164 + seed * 36}, ${220 + seed * 22}, ${alpha * bloom})`)
        grad.addColorStop(1, `rgba(255, 232, 244, ${alpha * bloom * 0.86})`)
        this.ctx.fillStyle = grad
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.bezierCurveTo(length * 0.32, -width * (0.86 + curl * 0.12), length * 0.78, -width * 0.76, length, 0)
        this.ctx.bezierCurveTo(length * 0.78, width * (0.82 + curl * 0.18), length * 0.3, width * 0.66, 0, 0)
        this.ctx.closePath()
        this.ctx.fill()

        this.ctx.strokeStyle = `rgba(255, 244, 252, ${0.18 * bloom})`
        this.ctx.lineWidth = Math.max(1, width * 0.05)
        this.ctx.beginPath()
        this.ctx.moveTo(length * 0.12, 0)
        this.ctx.quadraticCurveTo(length * 0.52, -width * 0.06, length * 0.88, 0)
        this.ctx.stroke()

        this.ctx.strokeStyle = `rgba(255, 228, 247, ${0.08 * bloom})`
        this.ctx.lineWidth = Math.max(0.7, width * 0.026)
        for (let vein = -1; vein <= 1; vein += 2) {
          this.ctx.beginPath()
          this.ctx.moveTo(length * 0.18, 0)
          this.ctx.quadraticCurveTo(length * 0.48, width * 0.12 * vein, length * 0.78, width * 0.28 * vein)
          this.ctx.stroke()
        }

        this.ctx.fillStyle = `rgba(255, 246, 252, ${0.06 * bloom})`
        this.ctx.beginPath()
        this.ctx.ellipse(length * 0.78, -width * 0.08, width * 0.08, width * 0.025, -0.2, 0, TWO_PI)
        this.ctx.fill()
        this.ctx.restore()
      }
    }

    private drawBeautyFilaments(size: number, bloom: number, open: number, seed: number, spent: number) {
      const filamentGrowth = bloom * smoothstep(0.58, 1, open) * (1 - spent * 0.5)
      if (filamentGrowth <= 0.02) return

      this.ctx.save()
      this.ctx.strokeStyle = `rgba(255, 229, 155, ${0.26 + filamentGrowth * 0.36})`
      this.ctx.lineWidth = Math.max(0.8, size * 0.018)
      for (let i = 0; i < 14; i++) {
        const angle = i / 14 * TWO_PI + seed * 0.4
        const length = size * (0.18 + randomSeed(seed * 500 + i * 23) * 0.16) * filamentGrowth
        const bend = Math.sin(seed * 12 + i) * size * 0.04
        this.ctx.beginPath()
        this.ctx.moveTo(Math.cos(angle) * size * 0.05, Math.sin(angle) * size * 0.05)
        this.ctx.quadraticCurveTo(
          Math.cos(angle) * length * 0.55 - Math.sin(angle) * bend,
          Math.sin(angle) * length * 0.55 + Math.cos(angle) * bend,
          Math.cos(angle) * length,
          Math.sin(angle) * length,
        )
        this.ctx.stroke()

        this.ctx.fillStyle = `rgba(122, 70, 62, ${0.28 + filamentGrowth * 0.34})`
        this.ctx.beginPath()
        this.ctx.arc(Math.cos(angle) * length, Math.sin(angle) * length, Math.max(0.8, size * 0.018), 0, TWO_PI)
        this.ctx.fill()
      }
      this.ctx.restore()
    }

    private drawBeautyDew(size: number, bloom: number, open: number, seed: number, cloudDark: number, environment: EnvironmentVisuals) {
      const dewAlpha = clamp(bloom * open * (0.06 + cloudDark * 0.1 + environment.dew * 0.22), 0, 0.28)
      if (dewAlpha <= 0.03) return

      this.ctx.save()
      this.ctx.fillStyle = `rgba(235, 248, 255, ${dewAlpha})`
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${dewAlpha * 0.72})`
      this.ctx.lineWidth = Math.max(0.6, size * 0.008)
      for (let i = 0; i < 5; i++) {
        const ring = i < 2 ? size * 0.38 : size * 0.62
        const angle = seed * 5 + i * 1.47
        const x = Math.cos(angle) * ring
        const y = Math.sin(angle) * ring * 0.72
        const r = size * (0.018 + randomSeed(seed * 700 + i * 29) * 0.018)
        this.ctx.beginPath()
        this.ctx.arc(x, y, r, 0, TWO_PI)
        this.ctx.fill()
        this.ctx.beginPath()
        this.ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.42, 0, TWO_PI)
        this.ctx.stroke()
      }
      this.ctx.restore()
    }

    private drawGardenSeedPod(x: number, y: number, size: number, growth: number, spent: number) {
      const pod = smoothstep(0.26, 0.72, growth)
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.fillStyle = `rgba(${116 + spent * 54}, ${146 - spent * 28}, ${82 - spent * 26}, ${0.52 + pod * 0.32})`
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, size * 0.22 * pod, size * 0.38 * pod, 0.1, 0, TWO_PI)
      this.ctx.fill()
      this.ctx.strokeStyle = `rgba(235, 220, 154, ${0.22 + pod * 0.18})`
      this.ctx.lineWidth = Math.max(1, size * 0.035)
      this.ctx.beginPath()
      this.ctx.moveTo(0, -size * 0.28 * pod)
      this.ctx.lineTo(0, size * 0.28 * pod)
      this.ctx.stroke()
      this.ctx.restore()
    }

    private drawGardenGrass(size: number, growth: number, sway: number, cloudDark: number, seed: number) {
      const blades = 4 + Math.floor(seed * 5)
      this.ctx.strokeStyle = `rgba(${92 - cloudDark * 18}, ${154 - cloudDark * 26}, ${78 + cloudDark * 10}, ${0.32 + growth * 0.42})`
      this.ctx.lineWidth = Math.max(1, size * 0.055)
      this.ctx.lineCap = 'round'
      for (let i = 0; i < blades; i++) {
        const offset = (i - blades / 2) * size * 0.1
        const bladeHeight = size * (0.8 + randomSeed(seed * 100 + i * 17) * 0.9) * growth
        const lean = (sway + (i - blades / 2) * 0.08) * bladeHeight
        this.ctx.beginPath()
        this.ctx.moveTo(offset, 0)
        this.ctx.quadraticCurveTo(offset + lean * 0.35, -bladeHeight * 0.55, offset + lean, -bladeHeight)
        this.ctx.stroke()
      }
    }

    private drawGardenMushroom(size: number, growth: number, spent: number, cloudDark: number) {
      const scale = smoothstep(0.1, 0.82, growth)
      const stemHeight = size * 0.62 * scale
      this.ctx.fillStyle = `rgba(${214 - cloudDark * 24}, ${197 - cloudDark * 18}, ${165 - cloudDark * 10}, ${0.5 + scale * 0.34})`
      this.ctx.beginPath()
      this.ctx.ellipse(0, -stemHeight * 0.34, size * 0.16 * scale, stemHeight * 0.48, 0, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.fillStyle = `rgba(${168 + spent * 30}, ${82 + spent * 35}, ${74 + spent * 20}, ${0.54 + scale * 0.32})`
      this.ctx.beginPath()
      this.ctx.ellipse(0, -stemHeight, size * 0.48 * scale, size * 0.24 * scale, 0, Math.PI, TWO_PI)
      this.ctx.closePath()
      this.ctx.fill()
    }

    private drawGardenFern(size: number, growth: number, spent: number, sway: number, cloudDark: number, seed: number) {
      const fronds = 3 + Math.floor(seed * 3)
      this.ctx.strokeStyle = `rgba(${76 - cloudDark * 12}, ${146 - cloudDark * 22 - spent * 18}, ${84 + cloudDark * 8}, ${0.34 + growth * 0.42})`
      this.ctx.fillStyle = `rgba(${92 - cloudDark * 16}, ${166 - cloudDark * 26 - spent * 20}, ${94 + cloudDark * 8}, ${0.28 + growth * 0.36})`
      this.ctx.lineWidth = Math.max(1, size * 0.045)
      for (let f = 0; f < fronds; f++) {
        const angle = -0.55 + f * (1.1 / Math.max(1, fronds - 1)) + sway * 0.3
        const length = size * (0.92 + randomSeed(seed * 200 + f * 31) * 0.56) * growth
        const tipX = Math.sin(angle) * length
        const tipY = -Math.cos(angle) * length
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.quadraticCurveTo(tipX * 0.38, tipY * 0.55, tipX, tipY)
        this.ctx.stroke()
        for (let leaf = 1; leaf <= 4; leaf++) {
          const t = leaf / 5
          const lx = tipX * t
          const ly = tipY * t
          const side = leaf % 2 === 0 ? 1 : -1
          this.ctx.beginPath()
          this.ctx.ellipse(lx + side * size * 0.08, ly, size * 0.1 * growth, size * 0.035 * growth, angle + side * 0.7, 0, TWO_PI)
          this.ctx.fill()
        }
      }
    }

    private drawGardenReed(size: number, growth: number, spent: number, sway: number, cloudDark: number, seed: number) {
      const height = size * (1.55 + seed * 0.9) * growth
      const lean = sway * height * 0.75
      this.ctx.strokeStyle = `rgba(${100 - cloudDark * 16 + spent * 24}, ${142 - cloudDark * 22 - spent * 18}, ${82 - spent * 18}, ${0.38 + growth * 0.38})`
      this.ctx.lineWidth = Math.max(1, size * 0.05)
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.quadraticCurveTo(lean * 0.32, -height * 0.54, lean, -height)
      this.ctx.stroke()
      this.ctx.fillStyle = `rgba(${128 + spent * 42}, ${88 + spent * 28}, ${52 + spent * 18}, ${0.42 + growth * 0.38})`
      this.ctx.beginPath()
      this.ctx.ellipse(lean, -height, size * 0.11 * growth, size * 0.34 * growth, -0.15 + sway * 0.15, 0, TWO_PI)
      this.ctx.fill()
    }

    private drawGardenClover(size: number, growth: number, spent: number, sway: number, cloudDark: number, seed: number) {
      const scale = smoothstep(0.08, 0.78, growth)
      const stemHeight = size * 0.48 * scale
      const lean = sway * size * 0.28
      this.ctx.strokeStyle = `rgba(${74 - cloudDark * 14}, ${142 - cloudDark * 20 - spent * 18}, ${78 + cloudDark * 8}, ${0.34 + scale * 0.32})`
      this.ctx.lineWidth = Math.max(1, size * 0.04)
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.quadraticCurveTo(lean * 0.35, -stemHeight * 0.45, lean, -stemHeight)
      this.ctx.stroke()
      this.ctx.fillStyle = `rgba(${72 - cloudDark * 12}, ${158 - cloudDark * 22 - spent * 22}, ${84 + seed * 26}, ${0.36 + scale * 0.44})`
      for (let i = 0; i < 3; i++) {
        const angle = -Math.PI / 2 + i * TWO_PI / 3 + seed * 0.2
        this.ctx.beginPath()
        this.ctx.ellipse(
          lean + Math.cos(angle) * size * 0.16 * scale,
          -stemHeight + Math.sin(angle) * size * 0.1 * scale,
          size * 0.14 * scale,
          size * 0.11 * scale,
          angle,
          0,
          TWO_PI,
        )
        this.ctx.fill()
      }
    }

    private drawRabbit(elapsed: number, w: number, h: number, groundY: number, sceneSize: number, state: string, reducedMotion: boolean, stormPulse: number) {
      if (reducedMotion) return

      const delay = 3600
      const local = elapsed - delay
      if (local < 0) return

      const enter = smoothstep(0, 1900, local)
      const alert = state === 'stormStrain' || state === 'collapse' ? 1 : 0
      const visibility = enter * (1 - alert * 0.32)
      if (visibility <= 0.01) return

      const look = alert ? 1 : smoothstep(2100, 3000, local) * (1 - smoothstep(4500, 5200, local))
      const settled = smoothstep(5200, 6800, local)
      const nibbleCycle = Math.max(0, Math.sin(local / 950))
      const nibble = settled * smoothstep(0.35, 0.9, nibbleCycle) * (1 - alert)
      const hop = local < 2400 ? Math.abs(Math.sin(local / 220)) * sceneSize * 0.035 : 0
      const idleShift = settled * Math.sin(local / 3600) * sceneSize * 0.012
      const baseX = w * 0.18 + enter * sceneSize * 0.26 + idleShift
      const baseY = groundY + h * 0.1 - hop + alert * sceneSize * 0.018
      const size = sceneSize * 0.075 * visibility
      const noseTwitch = Math.sin(elapsed / 80) * size * 0.025
      const headDip = nibble * size * 0.22 + settled * Math.sin(local / 1700) * size * 0.035 - alert * size * 0.08
      const bodySquash = 1 - alert * (0.16 + stormPulse * 0.04)

      this.ctx.save()
      this.ctx.translate(baseX, baseY)
      this.ctx.globalAlpha = visibility

      this.ctx.fillStyle = 'rgba(92, 78, 68, 0.26)'
      this.ctx.beginPath()
      this.ctx.ellipse(size * 0.2, size * 0.28, size * 1.25, size * 0.22, 0, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.fillStyle = '#d8c7b1'
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, size * 0.95, size * 0.54 * bodySquash, -0.1, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.fillStyle = '#f0dfc7'
      this.ctx.beginPath()
      this.ctx.ellipse(size * 0.58, -size * 0.34 + headDip, size * 0.48, size * 0.38, look ? -0.03 : -0.22, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.save()
      this.ctx.translate(size * 0.48, -size * 0.72 + headDip)
      this.ctx.rotate(-0.28 + look * 0.18 - alert * 0.1)
      this.ctx.fillStyle = '#d8c7b1'
      this.ctx.beginPath()
      this.ctx.ellipse(0, -size * 0.38, size * 0.14, size * 0.52, 0, 0, TWO_PI)
      this.ctx.fill()
      this.ctx.fillStyle = 'rgba(226, 172, 170, 0.68)'
      this.ctx.beginPath()
      this.ctx.ellipse(0, -size * 0.38, size * 0.07, size * 0.34, 0, 0, TWO_PI)
      this.ctx.fill()
      this.ctx.restore()

      this.ctx.save()
      this.ctx.translate(size * 0.75, -size * 0.73 + headDip)
      this.ctx.rotate(0.18 - look * 0.08 + alert * 0.1)
      this.ctx.fillStyle = '#d8c7b1'
      this.ctx.beginPath()
      this.ctx.ellipse(0, -size * 0.34, size * 0.13, size * 0.46, 0, 0, TWO_PI)
      this.ctx.fill()
      this.ctx.restore()

      this.ctx.fillStyle = '#332821'
      this.ctx.beginPath()
      this.ctx.arc(size * (0.72 + look * 0.04), -size * 0.42 + headDip, size * 0.045, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.fillStyle = '#b57d7e'
      this.ctx.beginPath()
      this.ctx.ellipse(size * 0.98 + noseTwitch, -size * 0.24 + headDip, size * 0.055, size * 0.035, 0, 0, TWO_PI)
      this.ctx.fill()

      this.ctx.strokeStyle = 'rgba(70, 55, 46, 0.55)'
      this.ctx.lineWidth = Math.max(1, size * 0.018)
      for (let i = -1; i <= 1; i++) {
        this.ctx.beginPath()
        this.ctx.moveTo(size * 0.92, -size * 0.2 + headDip + i * size * 0.035)
        this.ctx.lineTo(size * 1.22, -size * (0.25 + i * 0.02) + headDip + i * size * 0.05)
        this.ctx.stroke()
      }

      if (nibble > 0.05) {
        this.ctx.strokeStyle = 'rgba(103, 161, 83, 0.72)'
        this.ctx.lineWidth = Math.max(1, size * 0.02)
        for (let i = 0; i < 4; i++) {
          const gx = size * (0.92 + i * 0.06)
          this.ctx.beginPath()
          this.ctx.moveTo(gx, size * 0.28)
          this.ctx.quadraticCurveTo(gx + size * 0.02, size * 0.06, gx + size * 0.08, -size * 0.12 + headDip * 0.4)
          this.ctx.stroke()
        }
      }

      this.ctx.restore()
    }

    private drawStem(baseX: number, baseY: number, topY: number, stemCurve: number, w: number, h: number, sceneSize: number, cloudDark: number, growth: number) {
      if (growth <= 0.01) return
      const midX = baseX + stemCurve * w * 0.28
      this.ctx.save()
      this.ctx.lineCap = 'round'
      this.ctx.strokeStyle = `rgba(32, 70, 48, ${0.78 + cloudDark * 0.12})`
      this.ctx.lineWidth = sceneSize * (0.018 + growth * 0.016)
      this.ctx.beginPath()
      this.ctx.moveTo(baseX, baseY)
      this.ctx.bezierCurveTo(
        baseX + stemCurve * w * 0.38,  baseY - h * 0.27,
        baseX - stemCurve * w * 0.18, topY  + h * 0.12,
        baseX, topY,
      )
      this.ctx.stroke()

      this.ctx.strokeStyle = 'rgba(190, 225, 170, 0.5)'
      this.ctx.lineWidth = Math.max(2, sceneSize * 0.006)
      this.ctx.beginPath()
      this.ctx.moveTo(baseX - sceneSize * 0.008, baseY - sceneSize * 0.015)
      this.ctx.bezierCurveTo(midX - sceneSize * 0.012, baseY - h * 0.25, baseX - sceneSize * 0.018, topY + h * 0.1, baseX - sceneSize * 0.01, topY)
      this.ctx.stroke()
      this.ctx.restore()
    }

    private drawCloud(x: number, y: number, width: number, height: number, alpha: number, color: Rgb, family: EnvironmentVisuals['cloudFamily'], layerIndex: number, seed: number, environment: EnvironmentVisuals) {
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate((layerIndex - 1) * 0.04 + (seed - 0.5) * 0.05)
      this.ctx.globalAlpha = alpha
      this.ctx.fillStyle = rgb(color)
      this.ctx.beginPath()
      if (family === 'wispy') {
        this.ctx.ellipse(0, 0, width * 0.55, height * 0.11, Math.sin(seed * 12) * 0.08, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.18, -height * 0.02, width * 0.34, height * 0.08, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.42,  height * 0.01, width * 0.28, height * 0.07, 0, 0, Math.PI * 2)
      } else if (family === 'sheet') {
        this.ctx.ellipse(0, 0, width * 0.56, height * 0.22, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.28, -height * 0.08, width * 0.46, height * 0.16, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.56, -height * 0.02, width * 0.34, height * 0.12, 0, 0, Math.PI * 2)
        this.ctx.ellipse(-width * 0.12, height * 0.02, width * 0.24, height * 0.1, 0, 0, Math.PI * 2)
      } else if (family === 'storm') {
        this.ctx.ellipse(0, 0, width * 0.48, height * 0.28, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.24, -height * 0.1, width * 0.44, height * 0.24, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.52, -height * 0.02, width * 0.36, height * 0.2, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.68, height * 0.06, width * 0.28, height * 0.14, 0, 0, Math.PI * 2)
      } else {
        this.ctx.ellipse(0, 0, width * 0.4, height * 0.36, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.22, -height * 0.04, width * 0.38, height * 0.28, 0, 0, Math.PI * 2)
        this.ctx.ellipse(width * 0.48,  height * 0.02, width * 0.32, height * 0.2,  0, 0, Math.PI * 2)
      }
      this.ctx.fill()

      this.ctx.globalAlpha = alpha * environment.cloudShadow
      this.ctx.fillStyle = 'rgba(34, 40, 58, 1)'
      this.ctx.beginPath()
      this.ctx.ellipse(width * 0.08, height * 0.14, width * 0.42, height * 0.1, 0, 0, Math.PI * 2)
      this.ctx.ellipse(width * 0.4, height * 0.1, width * 0.34, height * 0.08, 0, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.globalAlpha = alpha * environment.cloudEdge
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)'
      this.ctx.lineWidth = Math.max(1, height * 0.03)
      this.ctx.beginPath()
      this.ctx.moveTo(-width * 0.42, height * 0.02)
      this.ctx.quadraticCurveTo(-width * 0.18, -height * 0.18, width * 0.08, -height * 0.14)
      this.ctx.quadraticCurveTo(width * 0.34, -height * 0.22, width * 0.66, -height * 0.08)
      this.ctx.stroke()
      this.ctx.restore()
    }

    private drawLeaf(x: number, y: number, direction: number, size: number, sway: number, cloudDark: number) {
      if (size <= 1) return
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate(direction * (0.46 + sway * 0.24))
      this.ctx.fillStyle = `rgba(${105 - cloudDark * 20}, ${166 - cloudDark * 20}, ${98 + cloudDark * 18}, 0.95)`
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.bezierCurveTo(size * 0.35, -size * 0.34, size * 0.9, -size * 0.24, size * 1.1, 0)
      this.ctx.bezierCurveTo(size * 0.82, size * 0.28, size * 0.34, size * 0.3, 0, 0)
      this.ctx.fill()
      this.ctx.strokeStyle = 'rgba(218, 241, 188, 0.45)'
      this.ctx.lineWidth = Math.max(1, size * 0.035)
      this.ctx.beginPath()
      this.ctx.moveTo(size * 0.06, 0)
      this.ctx.quadraticCurveTo(size * 0.52, -size * 0.05, size * 1.02, 0)
      this.ctx.stroke()
      this.ctx.restore()
    }

    private drawFlowerHead(
      centerX: number,
      centerY: number,
      radius: number,
      petalSpread: number,
      petalLift: number,
      centerScale: number,
      bloomLevel: number,
      petalGrowth: number,
      centerGrowth: number,
      jitter: number,
      stormCurl: number,
      now: number,
      state: string,
    ) {
      if (petalGrowth <= 0.02 && centerGrowth <= 0.02) return
      const collapse = state === 'collapse' ? 1 : 0
      const drawLayer = (count: number, length: number, width: number, offset: number, alpha: number, paletteShift: number) => {
        for (let i = 0; i < count; i++) {
          if (collapse && i % 7 === 0) continue
          const progress = i / count
          const angle = progress * TWO_PI + offset + stormCurl * 0.28
          const spread = petalSpread + Math.sin(i * 1.7 + now / 1200) * 0.018
          const px = centerX + Math.cos(angle) * radius * spread * 0.62
          const py = centerY + Math.sin(angle) * radius * spread * (0.52 - petalLift * 0.08)
          const curl = stormCurl * (0.25 + randomSeed(i * 11) * 0.45) + collapse * randomSeed(i * 19) * 0.5
          this.drawPetal(
            px,
            py,
            angle + jitter + curl * 0.18,
            length * (0.2 + petalGrowth * 0.8) * (0.9 + bloomLevel * 0.22 - collapse * 0.12),
            width * (0.35 + petalGrowth * 0.65) * (1 + petalLift * 0.16),
            alpha * petalGrowth,
            paletteShift + i,
            curl + (1 - petalGrowth) * 0.8,
          )
        }
      }

      if (petalGrowth < 0.54) {
        this.drawBud(centerX, centerY, radius, petalGrowth, stormCurl)
      }

      drawLayer(13, radius * 1.34, radius * 0.34, Math.PI / 13, 0.48, 2)
      drawLayer(10, radius * 1.16, radius * 0.3, 0, 0.82, 8)
      drawLayer(8, radius * 0.78, radius * 0.22, Math.PI / 8, 0.9, 15)

      if (centerGrowth <= 0.02) return
      this.ctx.save()
      this.ctx.beginPath()
      const centerRadius = radius * centerScale * 0.58 * centerGrowth
      this.ctx.arc(centerX, centerY, centerRadius, 0, TWO_PI)
      const centerGrad = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * centerScale * 0.62 * centerGrowth)
      centerGrad.addColorStop(0, '#ffeaa6')
      centerGrad.addColorStop(0.48, '#e8a84e')
      centerGrad.addColorStop(1, '#8f446d')
      this.ctx.fillStyle = centerGrad
      this.ctx.fill()

      const seedCount = 34
      for (let i = 0; i < seedCount; i++) {
        const t = i / seedCount
        const angle = i * 2.399963
        const r = radius * centerScale * 0.5 * Math.sqrt(t) * centerGrowth
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r
        this.ctx.fillStyle = `rgba(92, 45, 54, ${0.28 + t * 0.42})`
        this.ctx.beginPath()
        this.ctx.arc(x, y, Math.max(1, radius * 0.018 * (1 - t * 0.2)), 0, TWO_PI)
        this.ctx.fill()
      }
      this.ctx.restore()
    }

    private drawBud(centerX: number, centerY: number, radius: number, petalGrowth: number, stormCurl: number) {
      const closed = 1 - petalGrowth
      this.ctx.save()
      this.ctx.translate(centerX, centerY)
      this.ctx.rotate(-0.08 + stormCurl * 0.12)
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i - 2) * 0.22
        this.ctx.save()
        this.ctx.rotate(angle)
        this.ctx.fillStyle = `rgba(${102 + i * 6}, ${154 + i * 6}, 92, ${0.62 + closed * 0.25})`
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.bezierCurveTo(radius * 0.18, -radius * 0.3, radius * 0.26, -radius * 0.76, radius * 0.08, -radius * (1.02 - petalGrowth * 0.28))
        this.ctx.bezierCurveTo(-radius * 0.18, -radius * 0.74, -radius * 0.22, -radius * 0.25, 0, 0)
        this.ctx.fill()
        this.ctx.restore()
      }
      this.ctx.restore()
    }

    private drawPetal(x: number, y: number, angle: number, length: number, width: number, alpha: number, paletteIndex: number, curl: number) {
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate(angle)
      this.ctx.scale(1, 1 - curl * 0.18)

      const grad = this.ctx.createLinearGradient(0, 0, length, 0)
      grad.addColorStop(0, `rgba(${188 + paletteIndex * 2}, ${82 + paletteIndex * 4}, ${158 + paletteIndex * 2}, ${alpha})`)
      grad.addColorStop(0.55, `rgba(${244 - paletteIndex}, ${146 + paletteIndex * 3}, ${218 - paletteIndex}, ${alpha})`)
      grad.addColorStop(1, `rgba(255, 205, 235, ${alpha * 0.92})`)
      this.ctx.fillStyle = grad
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.bezierCurveTo(length * 0.28, -width * 0.78, length * 0.74, -width * 0.72, length, 0)
      this.ctx.bezierCurveTo(length * 0.72, width * (0.78 + curl * 0.12), length * 0.28, width * 0.62, 0, 0)
      this.ctx.closePath()
      this.ctx.fill()

      this.ctx.strokeStyle = `rgba(255, 235, 250, ${alpha * 0.44})`
      this.ctx.lineWidth = Math.max(1, width * 0.045)
      this.ctx.beginPath()
      this.ctx.moveTo(length * 0.12, 0)
      this.ctx.quadraticCurveTo(length * 0.5, -width * 0.08, length * 0.86, 0)
      this.ctx.stroke()
      this.ctx.restore()
    }

    private drawPuddleReflection(centerX: number, groundY: number, radius: number, cloudDark: number, stormPulse: number) {
      this.ctx.save()
      this.ctx.globalAlpha = 0.22 + cloudDark * 0.12
      this.ctx.fillStyle = `rgba(174, 204, 230, ${0.18 + stormPulse * 0.08})`
      this.ctx.beginPath()
      this.ctx.ellipse(centerX, groundY + radius * 0.72, radius * 1.35, radius * 0.18, 0, 0, TWO_PI)
      this.ctx.fill()
      this.ctx.strokeStyle = 'rgba(224, 239, 255, 0.18)'
      this.ctx.lineWidth = 1
      for (let i = 0; i < 3; i++) {
        this.ctx.beginPath()
        this.ctx.ellipse(centerX, groundY + radius * (0.62 + i * 0.08), radius * (0.74 + i * 0.18), radius * 0.055, 0, 0, TWO_PI)
        this.ctx.stroke()
      }
      this.ctx.restore()
    }

    private drawLightning(x: number, y: number, length: number, alpha: number) {
      const segments = 5
      let cx = x, cy = y
      this.ctx.strokeStyle = `rgba(255,255,240,${alpha})`
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.moveTo(cx, cy)
      for (let i = 0; i < segments; i++) {
        cx += (Math.random() - 0.5) * 18
        cy += length * 30 + Math.random() * 18
        this.ctx.lineTo(cx, cy)
      }
      this.ctx.stroke()
    }
  }

  return new FlowerStorm()
}

export default stopMotionFlowerStormFactory

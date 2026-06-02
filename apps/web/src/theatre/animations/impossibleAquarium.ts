import type { TriggerFrame } from '../VisualTriggers'
import { AnimationContext, IAnimation } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'
import { loadAnimationProgress, saveAnimationProgress } from '../animationProgressStorage'

const PROGRESS_ID = 'impossibleAquarium'
const PROGRESS_VERSION = 1
const TWO_PI = Math.PI * 2
const SCHOOL_COUNT = 18
const BUBBLE_COUNT = 54
const FISH_SIZE_SCALE = 1.85
const FISH_BASE = 38
const FISH_DEPTH_SCALE = 22

type AquariumProgress = {
  version: 1
  ageMs: number
  seed: number
  hue: number
}

type SchoolFish = {
  seed: number
  lane: number
  depth: number
  hue: number
}

type FishSignal = {
  value: number
  hueShift: number
  alpha: number
}

type SpectrumFrame = {
  bass: number
  lowMids: number
  mids: number
  highMids: number
  highs: number
  energy: number
  beat: boolean
  bassPulse: number
  beatFlash: number
  bandEnv: { bass: number; mids: number; highs: number }
}

type HeroFishAudio = {
  bass: number
  mids: number
  highs: number
  energy: number
  bassPulse: number
  beatFlash: number
  beat: boolean
  bassHit: boolean
  midsHit: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3)
}

function hash(seed: number) {
  const s = Math.sin(seed * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

function phaseFromGrowth(growth: number) {
  if (growth < 1.4) return 'school'
  if (growth < 5) return 'large'
  if (growth < 14) return 'giant'
  if (growth < 34) return 'leviathan'
  return 'mythic'
}

export function impossibleAquariumFactory(): IAnimation {
  class ImpossibleAquarium extends CanvasAnimation {
    private ageMs = 0
    private seed = Math.floor(Math.random() * 100000)
    private hue = 188
    private lastNow = 0
    private restored = false
    private school: SchoolFish[] = []
    private beatFlash = 0
    private bassPulse = 0
    private bassSmoothed = 0
    private midsSmoothed = 0

    constructor() {
      super({ defaultOpacity: 0.98, defaultZIndex: 101, defaultBlendMode: 'normal', useEffects: true })
    }

    async init(container: HTMLElement, context: AnimationContext) {
      await super.init(container, context)
      this.restoreProgress()
      this.school = Array.from({ length: SCHOOL_COUNT }, (_, i) => ({
        seed: this.seed + i * 97,
        lane: hash(this.seed + i * 31),
        depth: 0.35 + hash(this.seed + i * 43) * 0.9,
        hue: (this.hue + 80 + hash(this.seed + i * 59) * 180) % 360,
      }))
    }

    async stop() {
      this.saveProgress()
      await super.stop()
    }

    destroy() {
      this.saveProgress()
      super.destroy()
    }

    private restoreProgress() {
      if (this.restored) return
      this.restored = true

      const progress = loadAnimationProgress<AquariumProgress>(PROGRESS_ID)
      if (!progress || progress.version !== PROGRESS_VERSION) return

      this.ageMs = Math.max(0, progress.ageMs)
      this.seed = progress.seed
      this.hue = progress.hue
    }

    private saveProgress() {
      saveAnimationProgress(PROGRESS_ID, {
        version: PROGRESS_VERSION,
        ageMs: this.ageMs,
        seed: this.seed,
        hue: this.hue,
      } satisfies AquariumProgress)
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w <= 0 || h <= 0) return

      const now = context.shared?.time?.elapsed ?? performance.now()
      const dt = this.lastNow === 0 ? 16 : clamp(now - this.lastNow, 0, 80)
      this.lastNow = now

      const { bass, mids, highs } = this.readBands(context)
      const features = context.shared?.features
      const bandEnv = features?.bandEnv ?? { bass, mids, highs }
      const sensitivity = context.options?.sensitivity ?? 1
      const intensity = context.options?.intensity ?? 1
      const energy = clamp((features?.env || features?.rms || 0) * 1.45, 0, 1)
      const preset = (context.options?.preset as string) || 'vivid'
      const triggers = context.shared?.getTriggers?.(preset) ?? {
        bassHit: false, midsHit: false, highsHit: false, beat: false, chaosHit: false,
        energy, brightness: features?.centroid ?? 0.5,
      }

      const heroAudio = this.updateAudioReactiveState(
        dt, bass, mids, highs, bandEnv, triggers, features?.flux, sensitivity, intensity,
      )
      const audio = clamp(
        (heroAudio.bass * 0.5 + heroAudio.mids * 0.32 + heroAudio.highs * 0.18 + heroAudio.bassPulse * 0.35)
          * sensitivity
          * intensity,
        0,
        1.6,
      )
      const reducedMotion = context.shared?.reducedMotion ?? false

      if (!reducedMotion) {
        this.ageMs += dt * (1 + energy * 0.75 + (triggers.beat ? 0.8 : 0) + heroAudio.bassPulse * 0.35)
      }

      const growth = this.ageMs / 60000
      const phase = phaseFromGrowth(growth)
      const phasePower = easeOut(clamp(growth / 34, 0, 1))
      const visibleGrowth = 1 + easeOut(clamp(growth / 9, 0, 1)) * 1.55
      const worldScale = Math.pow(1 + growth * 0.82, 1.34)
      const heroWorldSize = FISH_BASE * worldScale
      const cameraZoom = clamp(
        Math.min(w, h) / (heroWorldSize * (2.85 + phasePower * 2.15)),
        0.045,
        2.1,
      )
      const zoom = cameraZoom
      const time = now / 1000

      const spectrum: SpectrumFrame = {
        bass,
        lowMids: clamp(bass * 0.45 + mids * 0.55, 0, 1),
        mids,
        highMids: clamp(mids * 0.58 + highs * 0.42, 0, 1),
        highs,
        energy,
        beat: triggers.beat || triggers.bassHit,
        bassPulse: heroAudio.bassPulse,
        beatFlash: heroAudio.beatFlash,
        bandEnv,
      }

      this.drawWater(w, h, time, energy, phasePower, heroAudio.bassPulse)
      this.drawTopLightFlashes(w, h, time, spectrum, phasePower, reducedMotion)
      this.drawDistantScaleAnimals(w, h, time, growth, zoom, phase, audio)
      this.drawBubbles(w, h, time, growth, zoom, highs, heroAudio.bassPulse, reducedMotion)
      this.drawSpectrumPlants(w, h, time, spectrum, phasePower, reducedMotion)
      this.drawSchool(w, h, time, growth, zoom, visibleGrowth, { bass, mids, highs, energy })

      const heroScreenX = w * 0.5 + Math.sin(time * 0.18) * w * 0.04 * (1 - phasePower)
      const heroScreenY = h * 0.52 + Math.sin(time * 0.13) * h * 0.035
      const heroHue = (this.hue + 80 + hash(this.seed) * 180) % 360
      const heroDrawSize = heroWorldSize * zoom * FISH_SIZE_SCALE * visibleGrowth
      this.drawHeroAura(heroScreenX, heroScreenY, heroDrawSize, growth, audio, triggers.beat)
      this.drawFish(
        heroScreenX,
        heroScreenY,
        heroDrawSize,
        heroHue,
        time,
        true,
        audio,
        triggers.beat || triggers.bassHit,
        phase,
      )
      if (this.effects && triggers.chaosHit && energy > 0.65 && !context.shared?.lowPower) {
        this.effects.triggerShockwave(heroScreenX, heroScreenY, energy * 0.9)
      }
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }

    private updateAudioReactiveState(
      dt: number,
      bass: number,
      mids: number,
      highs: number,
      bandEnv: { bass: number; mids: number; highs: number },
      triggers: TriggerFrame,
      flux: { bass?: number; mids?: number; highs?: number; overall?: number } | undefined,
      sensitivity: number,
      intensity: number,
    ): HeroFishAudio {
      const kick = clamp(
        Math.max(bass, bandEnv.bass, (flux?.bass ?? 0) * 2.8) * sensitivity * intensity,
        0,
        1.4,
      )
      this.bassSmoothed += (bass - this.bassSmoothed) * 0.24
      this.midsSmoothed += (mids - this.midsSmoothed) * 0.2

      if (triggers.beat || triggers.bassHit) {
        this.bassPulse = Math.max(this.bassPulse, 0.58 + kick * 0.62)
        this.beatFlash = Math.max(this.beatFlash, 0.62 + triggers.energy * 0.52)
      }
      this.bassPulse = Math.max(kick * 0.5, this.bassPulse - dt / 280)
      this.beatFlash = Math.max(0, this.beatFlash - dt / 200)

      return {
        bass: this.bassSmoothed,
        mids: this.midsSmoothed,
        highs,
        energy: triggers.energy,
        bassPulse: this.bassPulse,
        beatFlash: this.beatFlash,
        beat: triggers.beat,
        bassHit: triggers.bassHit,
        midsHit: triggers.midsHit,
      }
    }

    private drawWater(w: number, h: number, time: number, energy: number, phasePower: number, bassPulse: number) {
      const deep = Math.floor(8 + phasePower * 8)
      const mid = Math.floor(42 + energy * 18 + phasePower * 22)
      const glow = Math.floor(82 + energy * 46 + bassPulse * 38)
      const grad = this.ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, `rgb(${deep}, ${mid}, ${glow})`)
      grad.addColorStop(0.45, `rgb(4, ${28 + phasePower * 18}, ${62 + phasePower * 30})`)
      grad.addColorStop(1, `rgb(1, ${10 + phasePower * 12}, ${30 + phasePower * 28})`)
      this.ctx.fillStyle = grad
      this.ctx.fillRect(0, 0, w, h)

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < 8; i++) {
        const y = h * (0.08 + i * 0.105)
        const alpha = 0.018 + energy * 0.018 + bassPulse * 0.028
        this.ctx.strokeStyle = `rgba(125, 230, 255, ${alpha})`
        this.ctx.lineWidth = 1 + i * 0.35
        this.ctx.beginPath()
        for (let x = -w * 0.08; x <= w * 1.08; x += w / 18) {
          const yy = y + Math.sin(x * 0.012 + time * (0.55 + i * 0.04) + i) * h * 0.018
          if (x < 0) this.ctx.moveTo(x, yy)
          else this.ctx.lineTo(x, yy)
        }
        this.ctx.stroke()
      }
      this.ctx.restore()

      const vignette = this.ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.15, w * 0.5, h * 0.5, Math.max(w, h) * 0.74)
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(1, `rgba(0, 0, 12, ${0.36 + phasePower * 0.18})`)
      this.ctx.fillStyle = vignette
      this.ctx.fillRect(0, 0, w, h)
    }

    private drawSchool(
      w: number,
      h: number,
      time: number,
      growth: number,
      zoom: number,
      visibleGrowth: number,
      audio: { bass: number; mids: number; highs: number; energy: number },
    ) {
      const margin = w * 0.48
      const pathW = w + margin * 2

      for (let i = 0; i < this.school.length; i++) {
        const fish = this.school[i]
        const speed = 40 + hash(fish.seed + 9) * 72
        const dir = i % 2 === 0 ? 1 : -1
        const offset = hash(fish.seed) * pathW
        const sx = (((time * speed * dir + offset) % pathW) + pathW) % pathW - margin
        const sy =
          h * (0.14 + fish.lane * 0.72)
          + Math.sin(time * (0.45 + fish.depth * 0.16) + fish.seed) * h * 0.045
        const size =
          (FISH_BASE + fish.depth * FISH_DEPTH_SCALE)
          * zoom
          * FISH_SIZE_SCALE
          * visibleGrowth
          * (1 + clamp(growth * 0.06, 0, 0.35))
        if (sx < -margin - 100 || sx > w + margin + 100 || sy < -size * 2 || sy > h + size * 2 || size < 1) {
          continue
        }
        const signal = this.fishSignal(fish.seed, i, time, audio)
        this.drawFish(sx, sy, size, fish.hue, time + fish.seed, false, signal, false, 'school', dir < 0)
      }
    }

    private drawSpectrumPlants(w: number, h: number, time: number, spectrum: SpectrumFrame, phasePower: number, reducedMotion: boolean) {
      const envBands = [
        spectrum.bandEnv.bass,
        clamp(spectrum.bandEnv.bass * 0.55 + spectrum.bandEnv.mids * 0.45, 0, 1),
        spectrum.bandEnv.mids,
        clamp(spectrum.bandEnv.mids * 0.6 + spectrum.bandEnv.highs * 0.4, 0, 1),
        spectrum.bandEnv.highs,
        spectrum.energy,
        clamp(spectrum.bass * 0.25 + spectrum.highs * 0.75, 0, 1),
        clamp(spectrum.mids * 0.4 + spectrum.energy * 0.6, 0, 1),
      ]
      const liveBands = [
        spectrum.bass,
        spectrum.lowMids,
        spectrum.mids,
        spectrum.highMids,
        spectrum.highs,
        spectrum.energy,
        clamp(spectrum.bass * 0.28 + spectrum.highs * 0.72, 0, 1),
        clamp(spectrum.mids * 0.35 + spectrum.energy * 0.65, 0, 1),
      ]
      const baseXs = [0.055, 0.15, 0.27, 0.39, 0.58, 0.71, 0.83, 0.94]

      for (let i = 0; i < liveBands.length; i++) {
        const kickShare = i < 3 ? spectrum.bassPulse * 0.72 : spectrum.bassPulse * 0.22
        const beatAccent = spectrum.beat ? 0.28 + hash(this.seed + i * 37) * 0.32 : 0
        const pulse = reducedMotion
          ? envBands[i] * 0.55
          : clamp(
              liveBands[i] * 0.72 + envBands[i] * 0.58 + kickShare + beatAccent + spectrum.beatFlash * 0.32,
              0,
              1,
            )
        this.drawAnchorPlant(w, h, time, baseXs[i], pulse, phasePower, i, reducedMotion)
      }
    }

    private drawAnchorPlant(
      w: number,
      h: number,
      time: number,
      xRatio: number,
      pulse: number,
      phasePower: number,
      plantIndex: number,
      reducedMotion: boolean,
    ) {
      const baseX = w * xRatio
      const baseY = h * 1.015
      const height = h * (0.15 + phasePower * 0.06 + hash(this.seed + plantIndex * 41) * 0.045)
      const bladeCount = 9

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < bladeCount; i++) {
        const seed = this.seed + plantIndex * 503 + i * 73
        const spread = (i - (bladeCount - 1) / 2) / bladeCount
        const bladeH = height * (0.62 + hash(seed) * 0.5)
        const sway = reducedMotion
          ? 0
          : Math.sin(time * (0.55 + hash(seed + 2) * 0.24) + seed) * w * 0.012
        const pop = pulse * (0.45 + hash(seed + 4) * 0.75)
        const tipX = baseX + spread * w * 0.055 + sway + pop * w * (0.006 + Math.abs(spread) * 0.009)
        const tipY = baseY - bladeH * (1 + pop * 0.035)
        const ctrlX = baseX + spread * w * 0.025 + sway * 0.4
        const ctrlY = baseY - bladeH * 0.46
        const hue = 128 + plantIndex * 34 + i * 7 + pulse * 72

        this.ctx.strokeStyle = `hsla(${hue}, 82%, ${36 + pop * 32}%, ${0.22 + pop * 0.52})`
        this.ctx.lineWidth = Math.max(1, h * (0.004 + hash(seed + 3) * 0.004)) * (1 + pop * 0.5)
        this.ctx.lineCap = 'round'
        this.ctx.beginPath()
        this.ctx.moveTo(baseX + spread * w * 0.04, baseY)
        this.ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
        this.ctx.stroke()

        if (pop > 0.24 && i % 2 === 0) {
          this.ctx.fillStyle = `hsla(${hue + 70}, 95%, 64%, ${pop * 0.35})`
          this.ctx.beginPath()
          this.ctx.arc(tipX, tipY, Math.max(2, h * 0.006 * pop), 0, TWO_PI)
          this.ctx.fill()
        }
      }
      this.ctx.restore()
    }

    private drawTopLightFlashes(w: number, h: number, time: number, spectrum: SpectrumFrame, phasePower: number, reducedMotion: boolean) {
      if (reducedMotion) return

      const intense = clamp(
        spectrum.energy * 1.25 + spectrum.bassPulse * 0.9 + spectrum.beatFlash * 0.85 + (spectrum.beat ? 0.35 : 0),
        0,
        1.6,
      )

      const shafts = [
        { x: 0.18, value: spectrum.highs, hue: 188, phase: 0.2 },
        { x: 0.38, value: spectrum.highMids, hue: 258, phase: 1.3 },
        { x: 0.62, value: spectrum.mids, hue: 146, phase: 2.1 },
        { x: 0.82, value: spectrum.bass, hue: 326, phase: 3.4 },
      ]

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'screen'
      for (const shaft of shafts) {
        const audioShimmer = clamp(shaft.value * 1.35 + spectrum.bassPulse * 0.55 + intense * 0.2, 0, 1.4)
        const shimmer = clamp(
          audioShimmer * 0.78 + Math.sin(time * 2.4 + shaft.phase) * shaft.value * 0.14,
          0,
          1,
        )
        const alpha = clamp(
          (shaft.value * (0.14 + shimmer * 0.24) + spectrum.bassPulse * 0.14 + (spectrum.beat ? 0.1 : 0))
            * (0.55 + intense * 0.95),
          0,
          0.55,
        )
        if (alpha <= 0.006) continue

        const x = w * shaft.x
        const width = w * (0.1 + shaft.value * 0.06 + intense * 0.04)
        const reach = h * (0.58 + phasePower * 0.22 + intense * 0.12)
        const grad = this.ctx.createLinearGradient(x, 0, x, reach)
        grad.addColorStop(0, `hsla(${shaft.hue}, 96%, 72%, ${alpha})`)
        grad.addColorStop(0.28, `hsla(${shaft.hue + 30}, 95%, 62%, ${alpha * 0.38})`)
        grad.addColorStop(1, `hsla(${shaft.hue}, 95%, 54%, 0)`)
        this.ctx.fillStyle = grad
        this.ctx.beginPath()
        this.ctx.moveTo(x - width * 0.45, 0)
        this.ctx.lineTo(x + width * 0.45, 0)
        this.ctx.lineTo(x + width * (1.75 + shimmer + intense * 0.25), reach * 1.08)
        this.ctx.lineTo(x - width * (1.35 + shimmer + intense * 0.15), reach * 1.08)
        this.ctx.closePath()
        this.ctx.fill()
      }
      this.ctx.restore()
    }

    private fishSignal(seed: number, index: number, time: number, audio: { bass: number; mids: number; highs: number; energy: number }): FishSignal {
      const bandPick = hash(seed + 700)
      const source = bandPick < 0.34 ? audio.bass : bandPick < 0.72 ? audio.mids : audio.highs
      const offset = hash(seed + 701) * 2.4
      const travelingWave = Math.pow(clamp(Math.sin(time * 1.35 + index * 0.82 + offset) * 0.5 + 0.5, 0, 1), 4)
      const threshold = 0.05 + hash(seed + 702) * 0.18
      const value = clamp((source - threshold) * 2.85, 0, 1) * (0.35 + travelingWave * 0.95)
      const hueShift = bandPick < 0.34 ? 230 : bandPick < 0.72 ? 95 : 20
      return {
        value,
        hueShift,
        alpha: clamp(value * (0.28 + audio.energy * 0.38), 0, 0.62),
      }
    }

    private drawDistantScaleAnimals(
      w: number,
      h: number,
      time: number,
      growth: number,
      zoom: number,
      phase: string,
      audio: number,
    ) {
      if (growth < 4) return
      this.ctx.save()
      this.ctx.globalAlpha = clamp((growth - 4) / 8, 0, 0.36)
      this.ctx.fillStyle = 'rgba(8, 18, 34, 0.88)'
      const rayX = ((time * 16 + hash(this.seed + 300) * w * 2) % (w * 1.8)) - w * 0.4
      const rayY = h * (0.2 + hash(this.seed + 301) * 0.22)
      this.ctx.beginPath()
      this.ctx.ellipse(rayX, rayY, 120 * zoom * Math.max(4, growth * 0.6), 24 * zoom * Math.max(3, growth * 0.45), 0.05, 0, TWO_PI)
      this.ctx.fill()
      this.ctx.beginPath()
      this.ctx.moveTo(rayX - 20 * zoom, rayY)
      this.ctx.lineTo(rayX - 180 * zoom * Math.max(2, growth * 0.35), rayY + 28 * zoom)
      this.ctx.lineTo(rayX - 12 * zoom, rayY + 12 * zoom)
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.restore()

      if (phase === 'leviathan' || phase === 'mythic') {
        const eyeAlpha = phase === 'mythic' ? 0.26 : 0.15
        const eyeX = w * (0.82 + Math.sin(time * 0.05) * 0.04)
        const eyeY = h * (0.24 + Math.cos(time * 0.04) * 0.04)
        const r = Math.min(w, h) * (0.08 + clamp(growth / 80, 0, 0.12))
        this.ctx.save()
        this.ctx.globalAlpha = eyeAlpha + audio * 0.08
        this.ctx.fillStyle = 'rgba(2, 8, 20, 0.92)'
        this.ctx.beginPath()
        this.ctx.ellipse(eyeX, eyeY, r * 2.4, r * 1.4, -0.2, 0, TWO_PI)
        this.ctx.fill()
        this.ctx.fillStyle = 'rgba(110, 242, 255, 0.55)'
        this.ctx.beginPath()
        this.ctx.arc(eyeX, eyeY, r * 0.42, 0, TWO_PI)
        this.ctx.fill()
        this.ctx.fillStyle = 'rgba(0, 10, 20, 0.92)'
        this.ctx.beginPath()
        this.ctx.arc(eyeX, eyeY, r * (0.16 + audio * 0.06), 0, TWO_PI)
        this.ctx.fill()
        this.ctx.restore()
      }
    }

    private drawBubbles(
      w: number,
      h: number,
      time: number,
      growth: number,
      zoom: number,
      highs: number,
      bassPulse: number,
      reducedMotion: boolean,
    ) {
      if (reducedMotion) return
      this.ctx.save()
      this.ctx.lineCap = 'round'
      for (let i = 0; i < BUBBLE_COUNT; i++) {
        const s = this.seed + i * 211
        const lane = hash(s + 5)
        const speed = 22 + hash(s) * 48 + bassPulse * 28 * lane
        const drift = Math.sin(time * 0.35 + s * 0.02) * 10
        const x = hash(s + 1) * w + drift
        const y = h - (((time * speed + hash(s + 2) * h * 1.2) % (h * 1.28)))
        const baseR = (1.2 + hash(s + 3) * 5.5) * clamp(zoom * 1.6, 0.2, 1.2)
        const r = baseR * (1 + highs * 0.35 + bassPulse * 0.15 * lane)
        if (r < 0.4) continue
        const alpha = clamp(0.1 + hash(s + 4) * 0.22 - growth * 0.002 + highs * 0.08, 0.05, 0.32)
        this.ctx.strokeStyle = `rgba(196, 246, 255, ${alpha})`
        this.ctx.lineWidth = Math.max(0.6, r * 0.22)
        this.ctx.globalAlpha = alpha
        this.ctx.beginPath()
        this.ctx.arc(x, y, r, 0, TWO_PI)
        this.ctx.stroke()
        this.ctx.beginPath()
        this.ctx.arc(x - r * 0.28, y - r * 0.32, r * 0.18, 0, TWO_PI)
        this.ctx.strokeStyle = `rgba(230, 252, 255, ${alpha * 0.55})`
        this.ctx.stroke()
      }
      this.ctx.restore()
    }

    private drawHeroAura(x: number, y: number, size: number, growth: number, audio: number, beat: boolean) {
      const auraR = size * (1.35 + audio * 0.45 + (beat ? 0.18 : 0))
      const grad = this.ctx.createRadialGradient(x, y, size * 0.2, x, y, auraR)
      grad.addColorStop(0, `hsla(${this.hue + 40}, 92%, 70%, ${0.1 + audio * 0.2})`)
      grad.addColorStop(0.42, `hsla(${this.hue + 150}, 88%, 56%, ${0.045 + clamp(growth / 24, 0, 0.1)})`)
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      this.ctx.fillStyle = grad
      this.ctx.beginPath()
      this.ctx.arc(x, y, auraR, 0, TWO_PI)
      this.ctx.fill()
    }

    private drawFish(
      x: number,
      y: number,
      size: number,
      hue: number,
      time: number,
      hero: boolean,
      signal: number | FishSignal,
      beat: boolean,
      _phase: string,
      flip = false,
    ) {
      const audio = typeof signal === 'number' ? signal : signal.value
      const colorPulse = typeof signal === 'number'
        ? { value: signal, hueShift: 130, alpha: clamp(signal * 0.35 + (beat ? 0.16 : 0), 0, 0.52) }
        : signal
      const motionAudio = hero ? audio : 0
      const dir = flip ? -1 : 1
      const tail = Math.sin(time * (hero ? 5.2 + motionAudio * 6 : 2.6 + motionAudio * 2) + hue)
        * (hero ? 0.36 + motionAudio * 0.28 : 0.2 + motionAudio * 0.14)
      const bodyW = size * 1.5 * (1 + motionAudio * 0.12 + (beat ? 0.06 : 0))
      const bodyH = size * 0.62
      const light = 42 + colorPulse.value * 16
      const sat = 55 + colorPulse.value * 26
      const pulseHue = hue + colorPulse.hueShift

      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.scale(dir, 1)

      const tailX = -bodyW * 0.55
      this.ctx.fillStyle = `hsla(${hue + 24}, ${sat}%, ${light - 8}%, 0.72)`
      this.ctx.beginPath()
      this.ctx.moveTo(tailX, 0)
      this.ctx.lineTo(tailX - size * (0.62 + motionAudio * 0.22), -bodyH * (0.58 + tail * 0.18))
      this.ctx.lineTo(tailX - size * (0.46 - tail * 0.12), bodyH * (0.58 - tail * 0.18))
      this.ctx.closePath()
      this.ctx.fill()

      const grad = this.ctx.createRadialGradient(-bodyW * 0.1, -bodyH * 0.28, size * 0.1, 0, 0, bodyW * 0.75)
      grad.addColorStop(0, `hsla(${hue + 42}, ${sat}%, ${light + 24}%, 0.78)`)
      grad.addColorStop(0.58, `hsla(${hue}, ${sat}%, ${light}%, 0.78)`)
      grad.addColorStop(1, `hsla(${hue - 28}, ${sat}%, ${light - 14}%, 0.72)`)
      this.ctx.fillStyle = grad
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, bodyW * 0.52, bodyH * 0.52, 0, 0, TWO_PI)
      this.ctx.fill()

      if (colorPulse.alpha > 0.02) {
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'screen'
        this.ctx.fillStyle = `hsla(${pulseHue}, 96%, 64%, ${colorPulse.alpha})`
        this.ctx.beginPath()
        this.ctx.ellipse(0, 0, bodyW * 0.55, bodyH * 0.56, 0, 0, TWO_PI)
        this.ctx.fill()
        this.ctx.strokeStyle = `hsla(${pulseHue + 36}, 98%, 72%, ${colorPulse.alpha * 0.82})`
        this.ctx.lineWidth = Math.max(0.8, size * 0.045)
        this.ctx.beginPath()
        this.ctx.moveTo(-bodyW * 0.22, -bodyH * 0.28)
        this.ctx.quadraticCurveTo(bodyW * 0.04, 0, bodyW * 0.27, bodyH * 0.24)
        this.ctx.stroke()
        this.ctx.restore()
      }

      this.ctx.fillStyle = `hsla(${hue + 18}, ${sat}%, ${light + 8}%, ${hero ? 0.72 : 0.5})`
      this.ctx.beginPath()
      this.ctx.moveTo(-size * 0.05, -bodyH * 0.38)
      this.ctx.quadraticCurveTo(size * 0.12, -bodyH * (0.92 + motionAudio * 0.2), size * 0.34, -bodyH * 0.28)
      this.ctx.closePath()
      this.ctx.fill()

      this.ctx.fillStyle = 'rgba(230, 248, 255, 0.72)'
      this.ctx.beginPath()
      this.ctx.arc(bodyW * 0.31, -bodyH * 0.12, Math.max(1.2, size * 0.055), 0, TWO_PI)
      this.ctx.fill()
      this.ctx.fillStyle = 'rgba(2, 8, 16, 0.88)'
      this.ctx.beginPath()
      this.ctx.arc(bodyW * 0.33, -bodyH * 0.12, Math.max(0.8, size * 0.026), 0, TWO_PI)
      this.ctx.fill()

      this.ctx.restore()
    }

  }

  return new ImpossibleAquarium()
}

export default impossibleAquariumFactory

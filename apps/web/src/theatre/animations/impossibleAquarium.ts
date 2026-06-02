import type { TriggerFrame } from '../VisualTriggers'
import { AnimationContext, IAnimation } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'
import { loadAnimationProgress, saveAnimationProgress } from '../animationProgressStorage'

const PROGRESS_ID = 'impossibleAquarium'
const PROGRESS_VERSION = 1
const TWO_PI = Math.PI * 2
const SCHOOL_COUNT = 14
const BUBBLE_COUNT = 54

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
      const worldScale = Math.pow(1 + growth * 0.82, 1.34)
      const heroWorldSize = 42 * worldScale
      const cameraZoom = clamp(Math.min(w, h) / (heroWorldSize * (3.1 + phasePower * 2.6)), 0.045, 2.1)
      const zoom = cameraZoom
      const time = now / 1000
      const heroX = Math.sin(time * 0.22 + this.seed) * 18 * worldScale
      const heroY = Math.sin(time * 0.17 + this.seed * 0.7) * 12 * worldScale

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
      this.drawBubbles(w, h, time, growth, zoom, highs, reducedMotion)
      this.drawSpectrumPlants(w, h, time, spectrum, phasePower, reducedMotion)
      this.drawSchool(w, h, time, growth, zoom, heroX, heroY, { bass, mids, highs, energy })

      const heroScreenX = w * 0.5 + Math.sin(time * 0.18) * w * 0.04 * (1 - phasePower)
      const heroScreenY = h * 0.52 + Math.sin(time * 0.13) * h * 0.035
      this.drawHeroAura(heroScreenX, heroScreenY, heroWorldSize * zoom, growth, heroAudio)
      this.drawHeroBeatRings(heroScreenX, heroScreenY, heroWorldSize * zoom, heroAudio, reducedMotion)
      this.drawFish(
        heroScreenX,
        heroScreenY,
        heroWorldSize * zoom,
        this.hue,
        time,
        true,
        heroAudio,
        triggers.beat || triggers.bassHit,
        phase,
      )
      this.fireBeatEffects(heroScreenX, heroScreenY, heroAudio, triggers, reducedMotion, context.shared?.lowPower)
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
        this.bassPulse = Math.max(this.bassPulse, 0.5 + kick * 0.55)
        this.beatFlash = Math.max(this.beatFlash, 0.55 + triggers.energy * 0.45)
      }
      this.bassPulse = Math.max(kick * 0.42, this.bassPulse - dt / 240)
      this.beatFlash = Math.max(0, this.beatFlash - dt / 160)

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

    private fireBeatEffects(
      heroX: number,
      heroY: number,
      hero: HeroFishAudio,
      triggers: TriggerFrame,
      reducedMotion: boolean,
      lowPower?: boolean,
    ) {
      if (!this.effects || reducedMotion || lowPower) return

      if (triggers.beat || triggers.bassHit) {
        const strength = 0.35 + hero.bassPulse * 0.55 + hero.energy * 0.25
        this.effects.triggerShockwave(heroX, heroY, strength)
        this.effects.triggerParticleBurst(
          heroX,
          heroY,
          Math.floor(10 + hero.energy * 22 + hero.bassPulse * 18),
          0.55 + hero.bassPulse * 0.5,
          `${Math.round(90 + hero.bass * 80)},240,255`,
        )
        if (triggers.beat) this.effects.triggerScreenPunch(0.22 + hero.energy * 0.28)
      }
      if (triggers.midsHit) {
        this.effects.triggerParticleBurst(
          heroX + 12,
          heroY - 8,
          Math.floor(6 + hero.energy * 10),
          0.4 + hero.mids * 0.35,
          '120,255,200',
        )
      }
      if (triggers.chaosHit && hero.energy > 0.65) {
        this.effects.triggerShockwave(heroX, heroY, hero.energy * 1.05)
        this.effects.triggerScreenPunch(hero.energy * 0.45)
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
      heroX: number,
      heroY: number,
      audio: { bass: number; mids: number; highs: number; energy: number },
    ) {
      const cameraPull = Math.max(0, growth - 1.2)
      for (let i = 0; i < this.school.length; i++) {
        const fish = this.school[i]
        const laneY = (fish.lane - 0.5) * 520 - cameraPull * 15
        const speed = 28 + hash(fish.seed + 9) * 42
        const span = 1200 + cameraPull * 80
        const dir = i % 2 === 0 ? 1 : -1
        const x = ((((time * speed * dir + hash(fish.seed) * span) % span) + span) % span) - span * 0.5
        const y = laneY + Math.sin(time * (0.45 + fish.depth * 0.16) + fish.seed) * 42
        const sx = w * 0.5 + (x - heroX * 0.45) * zoom
        const sy = h * 0.52 + (y - heroY * 0.45) * zoom
        const size = (28 + fish.depth * 16) * zoom
        if (sx < -120 || sx > w + 120 || sy < -90 || sy > h + 90 || size < 0.8) continue
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
          ? envBands[i] * 0.45
          : clamp(
              liveBands[i] * 0.62 + envBands[i] * 0.48 + kickShare + beatAccent + spectrum.beatFlash * 0.18,
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

      const shafts = [
        { x: 0.18, value: spectrum.highs, hue: 188, phase: 0.2 },
        { x: 0.38, value: spectrum.highMids, hue: 258, phase: 1.3 },
        { x: 0.62, value: spectrum.mids, hue: 146, phase: 2.1 },
        { x: 0.82, value: spectrum.bass, hue: 326, phase: 3.4 },
      ]

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'screen'
      for (const shaft of shafts) {
        const audioShimmer = clamp(shaft.value * 1.15 + spectrum.bassPulse * 0.35, 0, 1)
        const shimmer = reducedMotion
          ? audioShimmer * 0.5
          : clamp(audioShimmer * 0.72 + Math.sin(time * 2.4 + shaft.phase) * shaft.value * 0.12, 0, 1)
        const alpha = clamp(
          shaft.value * (0.1 + shimmer * 0.16) + spectrum.bassPulse * 0.08 + (spectrum.beat ? 0.06 : 0),
          0,
          0.28,
        )
        if (alpha <= 0.006) continue

        const x = w * shaft.x
        const width = w * (0.08 + shaft.value * 0.04)
        const grad = this.ctx.createLinearGradient(x, 0, x, h * (0.52 + phasePower * 0.18))
        grad.addColorStop(0, `hsla(${shaft.hue}, 96%, 72%, ${alpha})`)
        grad.addColorStop(0.28, `hsla(${shaft.hue + 30}, 95%, 62%, ${alpha * 0.38})`)
        grad.addColorStop(1, `hsla(${shaft.hue}, 95%, 54%, 0)`)
        this.ctx.fillStyle = grad
        this.ctx.beginPath()
        this.ctx.moveTo(x - width * 0.45, 0)
        this.ctx.lineTo(x + width * 0.45, 0)
        this.ctx.lineTo(x + width * (1.6 + shimmer), h * 0.74)
        this.ctx.lineTo(x - width * (1.2 + shimmer), h * 0.74)
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
      const threshold = 0.12 + hash(seed + 702) * 0.34
      const value = clamp((source - threshold) * 2.2, 0, 1) * (0.25 + travelingWave * 0.9)
      const hueShift = bandPick < 0.34 ? 230 : bandPick < 0.72 ? 95 : 20
      return {
        value,
        hueShift,
        alpha: clamp(value * (0.18 + audio.energy * 0.24), 0, 0.46),
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

    private drawBubbles(w: number, h: number, time: number, growth: number, zoom: number, highs: number, reducedMotion: boolean) {
      if (reducedMotion) return
      this.ctx.save()
      this.ctx.strokeStyle = `rgba(196, 246, 255, ${0.12 + highs * 0.18})`
      for (let i = 0; i < BUBBLE_COUNT; i++) {
        const s = this.seed + i * 211
        const speed = 18 + hash(s) * 62
        const x = hash(s + 1) * w + Math.sin(time * 0.4 + s) * 18
        const y = h - (((time * speed + hash(s + 2) * h * 1.4) % (h * 1.35)))
        const r = (1.5 + hash(s + 3) * 7) * clamp(zoom * 1.8, 0.2, 1.4) * (1 + highs * 0.6)
        if (r < 0.45) continue
        this.ctx.globalAlpha = clamp(0.12 + hash(s + 4) * 0.28 - growth * 0.002, 0.04, 0.36)
        this.ctx.beginPath()
        this.ctx.arc(x, y, r, 0, TWO_PI)
        this.ctx.stroke()
      }
      this.ctx.restore()
    }

    private drawHeroAura(x: number, y: number, size: number, growth: number, hero: HeroFishAudio) {
      const pulse = hero.bass + hero.bassPulse * 0.85 + hero.beatFlash * 0.35
      const auraR = size * (1.35 + pulse * 0.55 + (hero.beat ? 0.22 : 0))
      const grad = this.ctx.createRadialGradient(x, y, size * 0.2, x, y, auraR)
      grad.addColorStop(0, `hsla(${this.hue + 40}, 96%, 72%, ${0.12 + pulse * 0.28 + hero.beatFlash * 0.2})`)
      grad.addColorStop(0.42, `hsla(${this.hue + 150}, 90%, 58%, ${0.05 + clamp(growth / 24, 0, 0.12) + hero.mids * 0.08})`)
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      this.ctx.fillStyle = grad
      this.ctx.beginPath()
      this.ctx.arc(x, y, auraR, 0, TWO_PI)
      this.ctx.fill()

      if (hero.bassPulse > 0.12 || hero.beatFlash > 0.08) {
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'screen'
        const ringR = size * (0.95 + hero.bassPulse * 0.35)
        this.ctx.strokeStyle = `hsla(${this.hue + 120}, 98%, 68%, ${0.08 + hero.bassPulse * 0.22 + hero.beatFlash * 0.18})`
        this.ctx.lineWidth = Math.max(2, size * 0.04) * (1 + hero.bassPulse * 0.6)
        this.ctx.beginPath()
        this.ctx.arc(x, y, ringR, 0, TWO_PI)
        this.ctx.stroke()
        this.ctx.restore()
      }
    }

    private drawHeroBeatRings(
      x: number,
      y: number,
      size: number,
      hero: HeroFishAudio,
      reducedMotion: boolean,
    ) {
      if (reducedMotion || hero.beatFlash < 0.04) return

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'screen'
      const rings = 3
      for (let i = 0; i < rings; i++) {
        const t = hero.beatFlash * (1 - i * 0.22)
        const r = size * (0.55 + i * 0.22 + (1 - t) * 0.45 + hero.bassPulse * 0.25)
        this.ctx.strokeStyle = `hsla(${this.hue + 90 + i * 40}, 100%, 72%, ${t * 0.35})`
        this.ctx.lineWidth = Math.max(1.5, size * 0.028) * (1 + hero.bassPulse)
        this.ctx.beginPath()
        this.ctx.arc(x, y, r, 0, TWO_PI)
        this.ctx.stroke()
      }
      this.ctx.restore()
    }

    private drawFish(
      x: number,
      y: number,
      size: number,
      hue: number,
      time: number,
      hero: boolean,
      signal: number | FishSignal | HeroFishAudio,
      beat: boolean,
      phase: string,
      flip = false,
    ) {
      const heroAudio: HeroFishAudio | null =
        hero && typeof signal === 'object' && 'bassPulse' in signal ? signal : null
      const schoolSignal: FishSignal | null =
        !hero && typeof signal === 'object' && 'value' in signal ? signal : null
      const audio = typeof signal === 'number'
        ? signal
        : heroAudio
          ? heroAudio.bass + heroAudio.bassPulse * 0.75 + heroAudio.beatFlash * 0.25
          : schoolSignal?.value ?? 0
      const colorPulse: FishSignal = typeof signal === 'number'
        ? { value: signal, hueShift: 130, alpha: clamp(signal * 0.35 + (beat ? 0.16 : 0), 0, 0.52) }
        : heroAudio
          ? { value: audio, hueShift: 130 + heroAudio.mids * 40, alpha: clamp(audio * 0.4 + heroAudio.beatFlash * 0.35, 0, 0.62) }
          : schoolSignal ?? { value: 0, hueShift: 0, alpha: 0 }
      const motionAudio = hero ? audio : 0
      const bassKick = heroAudio?.bassPulse ?? 0
      const flash = heroAudio?.beatFlash ?? 0
      const dir = flip ? -1 : 1
      const tail = Math.sin(time * (hero ? 5.8 + motionAudio * 7 + bassKick * 4 : 2.4) + hue)
        * (hero ? 0.38 + motionAudio * 0.32 + bassKick * 0.22 : 0.18)
      const bodyW = size * (hero ? 1.65 : 1.5) * (1 + motionAudio * 0.1 + bassKick * 0.12 + (beat ? 0.07 : 0))
      const bodyH = size * (hero ? 0.78 : 0.62) * (hero ? 1 - bassKick * 0.06 + flash * 0.04 : 1)
      const light = hero ? 48 + audio * 22 + flash * 28 + (beat ? 18 : 0) : 42 + colorPulse.value * 16
      const sat = hero ? 78 + audio * 14 + bassKick * 10 : 55 + colorPulse.value * 26
      const pulseHue = hue + colorPulse.hueShift

      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.scale(dir, 1)

      const tailX = -bodyW * 0.55
      this.ctx.fillStyle = `hsla(${hue + 24}, ${sat}%, ${light - 8}%, ${hero ? 0.9 : 0.72})`
      this.ctx.beginPath()
      this.ctx.moveTo(tailX, 0)
      this.ctx.lineTo(tailX - size * (0.62 + motionAudio * 0.22), -bodyH * (0.58 + tail * 0.18))
      this.ctx.lineTo(tailX - size * (0.46 - tail * 0.12), bodyH * (0.58 - tail * 0.18))
      this.ctx.closePath()
      this.ctx.fill()

      const grad = this.ctx.createRadialGradient(-bodyW * 0.1, -bodyH * 0.28, size * 0.1, 0, 0, bodyW * 0.75)
      grad.addColorStop(0, `hsla(${hue + 42}, ${sat}%, ${light + 24}%, ${hero ? 0.96 : 0.78})`)
      grad.addColorStop(0.58, `hsla(${hue}, ${sat}%, ${light}%, ${hero ? 0.98 : 0.78})`)
      grad.addColorStop(1, `hsla(${hue - 28}, ${sat}%, ${light - 14}%, ${hero ? 0.94 : 0.72})`)
      this.ctx.fillStyle = grad
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, bodyW * 0.52, bodyH * 0.52, 0, 0, TWO_PI)
      this.ctx.fill()

      if (!hero && colorPulse.alpha > 0.02) {
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

      if (hero) {
        const stripeCount = phase === 'mythic' ? 9 : phase === 'leviathan' ? 7 : 5
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'screen'
        for (let i = 0; i < stripeCount; i++) {
          const stripeX = -bodyW * 0.32 + (i / Math.max(1, stripeCount - 1)) * bodyW * 0.68
          const stripePop = audio + bassKick * (0.35 + (i % 3) * 0.12)
          this.ctx.strokeStyle = `hsla(${hue + 130 + i * 18}, 98%, ${58 + stripePop * 28}%, ${0.18 + stripePop * 0.32 + flash * 0.22 + (beat ? 0.2 : 0)})`
          this.ctx.lineWidth = Math.max(1.2, size * 0.035) * (1 + bassKick * 0.45)
          this.ctx.beginPath()
          this.ctx.moveTo(stripeX, -bodyH * 0.34)
          this.ctx.quadraticCurveTo(stripeX + size * 0.08, 0, stripeX - size * 0.02, bodyH * 0.34)
          this.ctx.stroke()
        }
        this.ctx.restore()

        this.drawHeroGlints(bodyW, bodyH, hue, heroAudio ?? {
          bass: audio, mids: 0, highs: 0, energy: 0, bassPulse: bassKick, beatFlash: flash,
          beat, bassHit: beat, midsHit: false,
        }, time)
      }

      this.ctx.fillStyle = `hsla(${hue + 18}, ${sat}%, ${light + 8}%, ${hero ? 0.82 : 0.5})`
      this.ctx.beginPath()
      this.ctx.moveTo(-size * 0.05, -bodyH * 0.38)
      this.ctx.quadraticCurveTo(size * 0.12, -bodyH * (0.92 + motionAudio * 0.2), size * 0.34, -bodyH * 0.28)
      this.ctx.closePath()
      this.ctx.fill()

      const eyeR = Math.max(1.2, size * 0.055) * (hero ? 1 + bassKick * 0.18 + flash * 0.12 : 1)
      const pupilR = Math.max(0.8, size * 0.026) * (hero ? 1 + (heroAudio?.mids ?? 0) * 0.2 : 1)
      const pupilShiftX = heroAudio ? Math.sin(time * 0.7) * size * 0.012 + heroAudio.mids * size * 0.02 : 0
      const pupilShiftY = heroAudio ? -heroAudio.bass * size * 0.018 - bassKick * size * 0.02 : 0

      this.ctx.fillStyle = hero ? `rgba(245, 255, 255, ${0.92 + flash * 0.06})` : 'rgba(230, 248, 255, 0.72)'
      this.ctx.beginPath()
      this.ctx.arc(bodyW * 0.31, -bodyH * 0.12, eyeR, 0, TWO_PI)
      this.ctx.fill()
      if (hero && (bassKick > 0.1 || flash > 0.05)) {
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'screen'
        this.ctx.strokeStyle = `hsla(${hue + 160}, 100%, 78%, ${0.25 + bassKick * 0.35 + flash * 0.25})`
        this.ctx.lineWidth = Math.max(1, size * 0.02)
        this.ctx.beginPath()
        this.ctx.arc(bodyW * 0.31, -bodyH * 0.12, eyeR * 1.65, 0, TWO_PI)
        this.ctx.stroke()
        this.ctx.restore()
      }
      this.ctx.fillStyle = 'rgba(2, 8, 16, 0.88)'
      this.ctx.beginPath()
      this.ctx.arc(bodyW * 0.33 + pupilShiftX, -bodyH * 0.12 + pupilShiftY, pupilR, 0, TWO_PI)
      this.ctx.fill()
      if (hero && flash > 0.08) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + flash * 0.4})`
        this.ctx.beginPath()
        this.ctx.arc(bodyW * 0.28 + pupilShiftX, -bodyH * 0.14 + pupilShiftY, pupilR * 0.35, 0, TWO_PI)
        this.ctx.fill()
      }

      this.ctx.restore()
    }

    private drawHeroGlints(bodyW: number, bodyH: number, hue: number, hero: HeroFishAudio, time: number) {
      const spark = hero.bassPulse + hero.beatFlash * 0.8
      if (spark < 0.08) return

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'screen'
      const spots = [
        { x: bodyW * 0.08, y: -bodyH * 0.05, phase: 0 },
        { x: -bodyW * 0.12, y: bodyH * 0.08, phase: 1.2 },
        { x: bodyW * 0.2, y: bodyH * 0.18, phase: 2.4 },
      ]
      for (const spot of spots) {
        const twinkle = clamp(Math.sin(time * 8 + spot.phase) * 0.5 + 0.5, 0, 1)
        const a = spark * twinkle * 0.55
        if (a < 0.04) continue
        this.ctx.fillStyle = `hsla(${hue + 180}, 100%, 78%, ${a})`
        this.ctx.beginPath()
        this.ctx.arc(spot.x, spot.y, bodyW * 0.04 * (1 + hero.bassPulse), 0, TWO_PI)
        this.ctx.fill()
      }
      this.ctx.restore()
    }

  }

  return new ImpossibleAquarium()
}

export default impossibleAquariumFactory

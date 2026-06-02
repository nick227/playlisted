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
      const sensitivity = context.options?.sensitivity ?? 1
      const intensity = context.options?.intensity ?? 1
      const energy = clamp((features?.env || features?.rms || 0) * 1.45, 0, 1)
      const audio = clamp((bass * 0.55 + mids * 0.3 + highs * 0.15) * sensitivity * intensity, 0, 1.4)
      const reducedMotion = context.shared?.reducedMotion ?? false
      const triggers = context.shared?.getTriggers?.('vivid') ?? {
        bassHit: false, midsHit: false, highsHit: false, beat: false, chaosHit: false,
        energy, brightness: features?.centroid ?? 0.5,
      }

      if (!reducedMotion) {
        this.ageMs += dt * (1 + energy * 0.75 + (triggers.beat ? 0.8 : 0))
      }

      const growth = this.ageMs / 60000
      const phase = phaseFromGrowth(growth)
      const phasePower = easeOut(clamp(growth / 34, 0, 1))
      const worldScale = Math.pow(1 + growth * 0.82, 1.34)
      const heroWorldSize = 42 * worldScale
      const cameraZoom = clamp(Math.min(w, h) / (heroWorldSize * (3.1 + phasePower * 2.6)), 0.045, 2.1)
      const beatZoom = reducedMotion ? 1 : 1 + (triggers.beat ? 0.035 + bass * 0.04 : bass * 0.012)
      const zoom = cameraZoom * beatZoom
      const time = now / 1000
      const heroX = Math.sin(time * 0.22 + this.seed) * 18 * worldScale
      const heroY = Math.sin(time * 0.17 + this.seed * 0.7) * 12 * worldScale

      this.drawWater(w, h, time, energy, phasePower)
      this.drawDistantScaleAnimals(w, h, time, growth, zoom, phase, audio)
      const plantPulse = reducedMotion ? 0 : clamp((triggers.beat ? 0.85 : 0) + bass * 0.55 + highs * 0.22, 0, 1)
      this.drawBubbles(w, h, time, growth, zoom, highs, reducedMotion)
      this.drawAnchorPlant(w, h, time, plantPulse, phasePower, reducedMotion)
      this.drawSchool(w, h, time, growth, zoom, heroX, heroY, { bass, mids, highs, energy })

      const heroScreenX = w * 0.5 + Math.sin(time * 0.18) * w * 0.04 * (1 - phasePower)
      const heroScreenY = h * 0.52 + Math.sin(time * 0.13) * h * 0.035
      this.drawHeroAura(heroScreenX, heroScreenY, heroWorldSize * zoom, growth, audio, triggers.beat)
      this.drawFish(
        heroScreenX,
        heroScreenY,
        heroWorldSize * zoom,
        this.hue,
        time,
        true,
        audio,
        triggers.beat,
        phase,
      )
      this.drawScaleReadout(w, h, growth, phase)

      if (this.effects && triggers.chaosHit && energy > 0.65 && !context.shared?.lowPower) {
        this.effects.triggerShockwave(heroScreenX, heroScreenY, energy * 0.9)
      }
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }

    private drawWater(w: number, h: number, time: number, energy: number, phasePower: number) {
      const deep = Math.floor(8 + phasePower * 8)
      const mid = Math.floor(42 + energy * 18 + phasePower * 22)
      const glow = Math.floor(82 + energy * 46)
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
        const alpha = 0.018 + energy * 0.018
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

    private drawAnchorPlant(w: number, h: number, time: number, pulse: number, phasePower: number, reducedMotion: boolean) {
      const baseX = w * 0.12
      const baseY = h * 0.96
      const height = h * (0.22 + phasePower * 0.08)
      const bladeCount = 9

      this.ctx.save()
      this.ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < bladeCount; i++) {
        const seed = this.seed + i * 73
        const spread = (i - (bladeCount - 1) / 2) / bladeCount
        const bladeH = height * (0.62 + hash(seed) * 0.5)
        const sway = reducedMotion
          ? 0
          : Math.sin(time * (0.55 + hash(seed + 2) * 0.24) + seed) * w * 0.012
        const pop = pulse * (0.45 + hash(seed + 4) * 0.75)
        const tipX = baseX + spread * w * 0.09 + sway + pop * w * (0.018 + Math.abs(spread) * 0.015)
        const tipY = baseY - bladeH * (1 + pop * 0.08)
        const ctrlX = baseX + spread * w * 0.035 + sway * 0.4
        const ctrlY = baseY - bladeH * 0.46
        const hue = 156 + i * 9 + pulse * 90

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
      phase: string,
      flip = false,
    ) {
      const audio = typeof signal === 'number' ? signal : signal.value
      const colorPulse = typeof signal === 'number'
        ? { value: signal, hueShift: 130, alpha: clamp(signal * 0.35 + (beat ? 0.16 : 0), 0, 0.52) }
        : signal
      const motionAudio = hero ? audio : 0
      const dir = flip ? -1 : 1
      const tail = Math.sin(time * (hero ? 5.2 + motionAudio * 5 : 2.4) + hue) * (hero ? 0.36 + motionAudio * 0.25 : 0.18)
      const bodyW = size * (hero ? 1.65 : 1.5) * (1 + motionAudio * 0.08 + (beat ? 0.045 : 0))
      const bodyH = size * (hero ? 0.78 : 0.62)
      const light = hero ? 48 + audio * 18 + (beat ? 16 : 0) : 42 + colorPulse.value * 16
      const sat = hero ? 78 + audio * 12 : 55 + colorPulse.value * 26
      const pulseHue = hue + colorPulse.hueShift

      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.scale(dir, 1)

      const tailX = -bodyW * 0.55
      this.ctx.fillStyle = `hsla(${hue + 24}, ${sat}%, ${light - 8}%, ${hero ? 0.9 : 0.72})`
      this.ctx.beginPath()
      this.ctx.moveTo(tailX, 0)
      this.ctx.lineTo(tailX - size * (0.62 + audio * 0.22), -bodyH * (0.58 + tail * 0.18))
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
          this.ctx.strokeStyle = `hsla(${hue + 130 + i * 18}, 95%, ${58 + audio * 24}%, ${0.16 + audio * 0.28 + (beat ? 0.16 : 0)})`
          this.ctx.lineWidth = Math.max(1.2, size * 0.035)
          this.ctx.beginPath()
          this.ctx.moveTo(stripeX, -bodyH * 0.34)
          this.ctx.quadraticCurveTo(stripeX + size * 0.08, 0, stripeX - size * 0.02, bodyH * 0.34)
          this.ctx.stroke()
        }
        this.ctx.restore()
      }

      this.ctx.fillStyle = `hsla(${hue + 18}, ${sat}%, ${light + 8}%, ${hero ? 0.82 : 0.5})`
      this.ctx.beginPath()
      this.ctx.moveTo(-size * 0.05, -bodyH * 0.38)
      this.ctx.quadraticCurveTo(size * 0.12, -bodyH * (0.92 + motionAudio * 0.2), size * 0.34, -bodyH * 0.28)
      this.ctx.closePath()
      this.ctx.fill()

      this.ctx.fillStyle = hero ? 'rgba(245, 255, 255, 0.92)' : 'rgba(230, 248, 255, 0.72)'
      this.ctx.beginPath()
      this.ctx.arc(bodyW * 0.31, -bodyH * 0.12, Math.max(1.2, size * 0.055), 0, TWO_PI)
      this.ctx.fill()
      this.ctx.fillStyle = 'rgba(2, 8, 16, 0.88)'
      this.ctx.beginPath()
      this.ctx.arc(bodyW * 0.33, -bodyH * 0.12, Math.max(0.8, size * 0.026), 0, TWO_PI)
      this.ctx.fill()

      this.ctx.restore()
    }

    private drawScaleReadout(w: number, h: number, growth: number, phase: string) {
      this.ctx.save()
      this.ctx.globalAlpha = 0.42
      this.ctx.fillStyle = 'rgba(210, 248, 255, 0.75)'
      this.ctx.font = `${Math.max(10, Math.min(13, w * 0.018))}px ui-sans-serif, system-ui, sans-serif`
      this.ctx.fillText(`${phase.toUpperCase()} / ${Math.max(1, Math.round(1 + growth * 8))}x`, w * 0.04, h * 0.94)
      this.ctx.restore()
    }
  }

  return new ImpossibleAquarium()
}

export default impossibleAquariumFactory

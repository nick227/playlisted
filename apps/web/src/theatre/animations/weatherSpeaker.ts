import { AnimationContext, IAnimation } from '../core/IAnimation'
import CanvasAnimation from '../core/CanvasAnimation'

export function weatherSpeakerFactory(): IAnimation {
  class WeatherSpeaker extends CanvasAnimation {
    private lastSkyKey = ''
    private skyGrad: CanvasGradient | null = null

    constructor() {
      super({ useEffects: true, defaultZIndex: 100 })
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
      const features = context.shared?.features
      const sensitivity = context.options?.sensitivity || 1
      const intensity = context.options?.intensity || 1
      const strength = (bass * 0.7 + mids * 0.2 + highs * 0.1) * intensity * sensitivity
      const env = features?.env || features?.rms || 0
      const now = context.shared?.time?.elapsed ?? performance.now()

      const skyBass = Math.min(50, bass * 140)
      const skyBassFloor = Math.floor(skyBass)
      const topColor = `rgba(${skyBassFloor},${Math.floor(16 + skyBass * 0.3)},${Math.floor(34 - skyBass * 0.2)},1)`
      const bottomColor = `rgba(${Math.floor(10 + skyBass * 0.5)},${Math.floor(32 + skyBass * 0.4)},48,1)`
      const skyKey = `${h}|${topColor}|${bottomColor}`
      if (skyKey !== this.lastSkyKey || !this.skyGrad) {
        this.skyGrad = this.ctx.createLinearGradient(0, 0, 0, h)
        this.skyGrad.addColorStop(0, topColor)
        this.skyGrad.addColorStop(1, bottomColor)
        this.lastSkyKey = skyKey
      }
      this.ctx.fillStyle = this.skyGrad
      this.ctx.fillRect(0, 0, w, h)

      const minSide = Math.min(w, h)
      const towerW = minSide * 0.08
      const towerH = minSide * 0.5
      this.ctx.fillStyle = 'rgba(20,30,40,0.88)'
      this.ctx.fillRect(w * 0.1, h - towerH - 40, towerW, towerH)

      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false,
        midsHit: false,
        highsHit: false,
        beat: false,
        chaosHit: false,
        energy: Math.min(1, env * 1.4),
        brightness: features?.centroid || 0,
      }

      if (this.effects) {
        if (triggers.highsHit) this.effects.triggerParticleBurst(w * 0.6, h * 0.2, Math.floor(10 + triggers.energy * 26), triggers.energy * 0.9, '200,220,255')
        if (triggers.chaosHit && triggers.energy > 0.6) this.effects.triggerRainSurge(Math.floor(30 + triggers.energy * 130), triggers.energy)
        if (triggers.beat) this.effects.triggerParticleBurst(w * 0.1 + towerW * 0.5, h - towerH, Math.floor(6 + triggers.energy * 10), 0.7, '180,210,255')
      }

      const pScale = this.particleScale(context)
      const dropScale = context.shared?.lowPower ? Math.min(0.35, pScale) : pScale
      const drops = Math.floor((25 + (strength + env * 0.5) * 480) * dropScale)
      if (drops > 0) {
        const rainAlpha = Math.min(0.85, 0.07 + strength * 0.9 + env * 0.3)
        this.ctx.strokeStyle = `rgba(185,210,255,${rainAlpha})`
        this.ctx.lineWidth = 1
        const timePhase = now / 500
        const invDrops = 1 / drops
        for (let i = 0; i < drops; i++) {
          const phase = (i * 1.618 + timePhase) % 1
          const rx = i * invDrops * w
          const ry = phase * h * 0.8
          const len = 8 + (i % 7) * 5 + strength * 150
          this.ctx.beginPath()
          this.ctx.moveTo(rx, ry)
          this.ctx.lineTo(rx + Math.sin(i * 0.5) * 7, ry + len)
          this.ctx.stroke()
        }
      }

      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }

  return new WeatherSpeaker()
}

export default weatherSpeakerFactory

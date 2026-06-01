import { AnimationContext, IAnimation } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'
import { quantize, stepped } from '../stopMotion'

export function monsterWaveFactory(): IAnimation {
  class MonsterWave extends CanvasAnimation {
    constructor() {
      super({ useEffects: true, defaultZIndex: 102 })
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#030508'
      this.ctx.fillRect(0, 0, w, h)

      const { bass, mids } = this.readBands(context)
      const features = context.shared?.features
      const sensitivity = context.options?.sensitivity || 1
      const intensity = context.options?.intensity || 1
      const now = context.shared?.time?.elapsed ?? performance.now()
      const metaIntensity = intensity * sensitivity
      const energyValue = Math.min(1, (features?.env || features?.rms || 0) * 1.4)
      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false,
        midsHit: false,
        highsHit: false,
        beat: false,
        chaosHit: false,
        energy: energyValue,
        brightness: features?.centroid || 0,
      }

      if (this.effects) {
        if (triggers.chaosHit && triggers.energy > 0.65) {
          this.effects.triggerParticleBurst(w * 0.5, h * 0.7, Math.floor(18 + triggers.energy * 36), triggers.energy, '220,200,255')
        }
        if (triggers.beat) {
          this.effects.triggerParticleBurst(w * 0.3, h * 0.75, Math.floor(8 + triggers.energy * 14), triggers.energy * 0.8, '180,160,255')
        }
      }

      const sampleTime = quantize(now, 120)
      const heightStep = stepped((bass * 0.8 + mids * 0.2) * metaIntensity, 5)
      const layers = 5
      const invW = 1 / w
      const yBaseOffset = h * 0.55
      const yStep = h * 0.07
      const waveStrength = (mids * 200 + bass * 260) * metaIntensity
      const alphaBase = 0.18 + mids * 0.8 + bass * 0.5
      const yPulseScale = 14 + waveStrength
      const cosFactor = 1 + heightStep
      const kBase = Math.PI * 5

      for (let l = 0; l < layers; l++) {
        this.ctx.beginPath()
        const yBase = yBaseOffset + l * yStep
        this.ctx.moveTo(0, yBase)
        const waveOffset = sampleTime / (420 + l * 80)
        for (let x = 0; x <= w; x += 8) {
          const k = x * invW * kBase + waveOffset
          const yPulse = stepped(Math.sin(k), 6)
          const y = yBase + yPulse * yPulseScale + Math.cos(k * 0.5) * (l * 8) * cosFactor
          this.ctx.lineTo(x, y)
        }
        this.ctx.lineTo(w, h)
        this.ctx.lineTo(0, h)
        this.ctx.closePath()
        const alpha = Math.min(0.8, alphaBase + l * 0.04)
        const rb = Math.floor(50 + l * 28 + bass * 80)
        const gb = Math.floor(25 + l * 38 + mids * 60)
        const bb = Math.floor(80 + l * 18 + bass * 40)
        this.ctx.fillStyle = `rgba(${rb},${gb},${bb},${alpha})`
        this.ctx.fill()
      }

      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }

  return new MonsterWave()
}

export default monsterWaveFactory

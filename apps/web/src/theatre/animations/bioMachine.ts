import { AnimationContext, IAnimation } from '../core/IAnimation'
import CanvasAnimation from '../core/CanvasAnimation'
import { stepped, frameHold } from '../stopMotion/stopMotion'

export function bioMachineFactory(): IAnimation {
  class BioMachine extends CanvasAnimation {
    constructor() {
      super({ useEffects: true, defaultZIndex: 100 })
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#05070a'
      this.ctx.fillRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
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
        if (triggers.midsHit) this.effects.triggerParticleBurst(w * 0.25, h * 0.4, Math.floor(10 + triggers.energy * 24), triggers.energy, '120,220,160')
        if (triggers.chaosHit && triggers.energy > 0.6) this.effects.triggerShockwave(w * 0.85, h * 0.2, triggers.energy * 1.1)
        if (triggers.beat) this.effects.triggerParticleBurst(w * 0.5, h * 0.5, Math.floor(6 + triggers.energy * 12), triggers.energy * 0.7, '160,255,200')
      }

      const stepTime = frameHold(now, 120)
      const gearPhase = stepped(Math.sin(stepTime / 700) * 0.5 + 0.5, 5)
      const cells = 12
      const metaStrength = (bass * 210 + mids * 90) * metaIntensity
      const saturation = Math.min(255, 100 + mids * 300)
      const saturationHalf = Math.floor(saturation * 0.5)
      const saturationFull = Math.floor(saturation)
      const saturationThird = Math.floor(saturation * 0.7)
      const fillAlpha = Math.min(0.9, 0.18 + mids * 1.2)
      const ringAlpha = Math.min(0.9, 0.18 + highs * 1.1)
      const baseGearR = 35 + metaStrength
      const ringOffsetStep = Math.PI / 6
      const colorStop0 = `rgba(${saturationHalf},${saturationFull},${saturationThird},${fillAlpha})`
      const colorStop1 = `rgba(15,25,35,${Math.max(0, 0.55 - bass * 0.5)})`

      for (let i = 0; i < cells; i++) {
        const x = (i % 4) / 3 * w
        const y = Math.floor(i / 4) / 2 * h
        const r = 20 + Math.abs(Math.sin(now / (300 + i * 40))) * 55 + metaStrength
        const cx = x + 60
        const cy = y + 60
        const grad = this.ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r)
        grad.addColorStop(0, colorStop0)
        grad.addColorStop(1, colorStop1)
        this.ctx.fillStyle = grad
        this.ctx.beginPath()
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2)
        this.ctx.fill()
      }

      const gearCx = w * 0.85
      const gearCy = h * 0.2
      this.ctx.save()
      this.ctx.translate(gearCx, gearCy)
      this.ctx.rotate(now / 600 * (mids * 3 + 0.4) + gearPhase * 0.5)
      this.ctx.strokeStyle = `rgba(200,185,155,${ringAlpha})`
      this.ctx.lineWidth = 1.5 + bass * 4
      const ringOffset = Math.floor(gearPhase * 3) * 2
      for (let g = 0; g < 6; g++) {
        this.ctx.beginPath()
        this.ctx.arc(0, 0, baseGearR + g * 9 + ringOffset, 0, Math.PI * 2)
        this.ctx.stroke()
        this.ctx.rotate(ringOffsetStep)
      }
      this.ctx.restore()

      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }

  return new BioMachine()
}

export default bioMachineFactory

import { AnimationContext, IAnimation } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'
import { stepped, frameHold } from '../stopMotion'

export function spinAmpFactory(): IAnimation {
  class SpinAmp extends CanvasAnimation {
    constructor() {
      super({ useEffects: true, defaultBlendMode: 'screen', defaultZIndex: 102 })
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
      const features = context.shared?.features
      const sensitivity = context.options?.sensitivity || 1
      const intensity = context.options?.intensity || 1
      const rings = 6
      const cx = w / 2
      const cy = h / 2
      const now = context.shared?.time?.elapsed ?? performance.now()
      const time = now / 1000
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
      const stepOsc = stepped(Math.sin(frameHold(now, 90) / 600), 5)
      const shakeOffset = 1 + stepOsc * 0.35

      if (this.effects) {
        if (triggers.chaosHit && triggers.energy > 0.75) this.effects.triggerShockwave(cx, cy, triggers.energy * 1.1)
        if (triggers.midsHit) this.effects.triggerParticleBurst(cx, cy, Math.floor(6 + triggers.energy * 20), triggers.energy * 0.9, '140,200,255')
        if (triggers.beat) this.effects.triggerParticleBurst(cx, cy, Math.floor(4 + triggers.energy * 10), triggers.energy * 0.6, '200,240,255')
      }

      const shakeAllowed = this.allowsShake(context)
      const shake = shakeAllowed && this.effects ? this.effects.getShake() : 0
      if (shake > 0) {
        this.ctx.save()
        this.ctx.translate(
          (Math.random() - 0.5) * 10 * shake * shakeOffset,
          (Math.random() - 0.5) * 8 * shake * shakeOffset,
        )
      }

      const minSide = Math.min(w, h)
      const ringBase = bass * 240 + mids * 120
      const alpha = Math.min(0.95, 0.15 + (mids * 0.9 + highs * 0.7) * sensitivity)
      const lineWidthBase = 2 + bass * 12
      const rotateBase = time * 0.18
      const pi2 = Math.PI * 2

      for (let i = 0; i < rings; i++) {
        const rot = (rotateBase + time * i * 0.12) % pi2
        const radius = minSide * (0.07 + i * 0.07) + ringBase * intensity
        const r = 80 + i * 24
        const g = 130 + i * 12
        this.ctx.save()
        this.ctx.translate(cx, cy)
        this.ctx.rotate(rot)
        this.ctx.strokeStyle = `rgba(${r},${g},255,${alpha})`
        this.ctx.lineWidth = lineWidthBase + i * (1.5 + highs * 5)
        this.ctx.beginPath()
        this.ctx.arc(0, 0, radius, 0, pi2)
        this.ctx.stroke()
        this.ctx.restore()
      }

      if (shake > 0) this.ctx.restore()
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }

  return new SpinAmp()
}

export default spinAmpFactory

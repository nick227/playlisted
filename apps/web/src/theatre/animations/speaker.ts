import { AnimationContext, IAnimation } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'
import { frameHold, stepped } from '../stopMotion'
import { generateShapeDescriptor, renderShape } from '../shapeGenerator'

export function speakerFactory(): IAnimation {
  class SpeakerAnim extends CanvasAnimation {
    private lastGlowKey = ''
    private glowGrad: CanvasGradient | null = null
    private buildProgress = 0
    private stageOffset = Math.random() * Math.PI * 2
    private shapeDescriptor = generateShapeDescriptor(Math.random() * 99999)
    private shapeRotation = 0

    constructor() {
      super({ defaultOpacity: 0.97, defaultZIndex: 101, defaultBlendMode: 'normal', useEffects: true })
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#06060a'
      this.ctx.fillRect(0, 0, w, h)

      const { bass: rawBass, mids: rawMids, highs: rawHighs } = this.readBands(context)
      const features = context.shared?.features
      const sensitivity = context.options?.sensitivity || 1
      const intensity = context.options?.intensity || 1
      const bass = rawBass * sensitivity * intensity
      const mids = rawMids * sensitivity * intensity * 0.8
      const highs = rawHighs * sensitivity * intensity * 0.6

      const cx = w / 2
      const cy = h / 2
      const env = features?.env || features?.rms || 0
      const now = context.shared?.time?.elapsed ?? performance.now()

      const targetBuild = Math.min(1, Math.max(0, bass * 0.65 + mids * 0.25 + env * 0.18))
      this.buildProgress += (targetBuild - this.buildProgress) * 0.032
      const stageGlow = 0.85 + this.buildProgress * 0.35
      const stageRing = 0.18 + this.buildProgress * 0.42
      const pulseFactor = 1 + Math.max(bass, env) * 3.8 * (0.88 + this.buildProgress * 0.22)
      const pulseTime = frameHold(now, 100)
      const pulse = 1 + stepped(Math.sin(pulseTime / 900) * 0.5 + 0.5, 4) * 0.18
      const baseR = Math.min(w, h) * 0.15
      const r = baseR * pulseFactor * pulse

      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false, midsHit: false, highsHit: false,
        beat: false, chaosHit: false,
        energy: Math.min(1, env * 1.4),
        brightness: features?.centroid || 0,
      }

      if (this.effects) {
        if (triggers.chaosHit && triggers.energy > 0.7) {
          this.effects.triggerShockwave(cx, cy, triggers.energy * 1.3)
        }
        if (triggers.highsHit) {
          this.effects.triggerParticleBurst(cx + r * 1.4, cy, Math.floor(10 + triggers.energy * 28), triggers.energy, '200,220,255')
        }
        if (triggers.beat) {
          this.effects.triggerScreenPunch(Math.min(0.8, triggers.energy * 0.9))
        }
      }

      const shakeAllowed = this.allowsShake(context)
      const shake = shakeAllowed && this.effects ? this.effects.getShake() : 0
      if (shake > 0) {
        this.ctx.save()
        this.ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 8 * shake)
      }

      const warmth = Math.min(40, bass * 120)
      const glowKey = `${cx}|${cy}|${r}|${warmth}|${this.buildProgress.toFixed(3)}`
      if (glowKey !== this.lastGlowKey || !this.glowGrad) {
        this.glowGrad = this.ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r)
        this.glowGrad.addColorStop(0, `rgba(${220 + warmth},${190 - warmth * 0.4},${100 + this.buildProgress * 24},${Math.min(0.95, (0.45 + bass * 0.8) * stageGlow)})`)
        this.glowGrad.addColorStop(0.5, `rgba(${100 + warmth + this.buildProgress * 18},80,${180 - warmth},${Math.min(0.6, (0.15 + bass * 0.6) * stageGlow)})`)
        this.glowGrad.addColorStop(1, 'rgba(20,20,30,0)')
        this.lastGlowKey = glowKey
      }
      this.ctx.beginPath()
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2)
      this.ctx.fillStyle = this.glowGrad
      this.ctx.fill()

      if (this.buildProgress > 0.12) {
        this.ctx.beginPath()
        this.ctx.strokeStyle = `rgba(160,210,255,${stageRing * (0.04 + this.buildProgress * 0.10)})`
        this.ctx.lineWidth = 2 + this.buildProgress * 2
        this.ctx.arc(cx, cy, r * (1.24 + this.buildProgress * 0.18), 0, Math.PI * 2)
        this.ctx.stroke()
      }

      // ── Center shape: rotates and bounces with music ──────────────────────
      this.shapeRotation += (mids * 0.018 + bass * 0.008) * (1 + this.buildProgress * 0.35)
      const shapeBounce = 1 + bass * 0.22 + (triggers.beat ? 0.15 : 0)
      const shapeRadius = r * 0.42 * shapeBounce
      const shapeEnergy = Math.min(1, bass * 1.6 + mids * 0.4)
      renderShape(this.shapeDescriptor, {
        ctx: this.ctx,
        cx,
        cy,
        baseRadius: shapeRadius,
        rotation: this.shapeRotation,
        time: now,
        energy: shapeEnergy,
      })

      if (this.allowsHeavyParticles(context)) {
        const pScale = this.particleScale(context)
        const particles = Math.floor(18 * pScale + this.buildProgress * 18)
        if (particles > 0) {
          const phaseA = now / 2200 + this.stageOffset
          const phaseB = now / 180
          const particleAlpha = Math.min(0.95, 0.08 + bass * 1.1 + highs * 0.7 + this.buildProgress * 0.18)
          this.ctx.fillStyle = `rgba(200,225,255,${particleAlpha})`
          for (let i = 0; i < particles; i++) {
            const a = (i / particles) * Math.PI * 2 + phaseA
            const pr = r + 10 + Math.sin(phaseB + i) * (12 + this.buildProgress * 6) + (bass + mids * 0.7) * 260
            const px = cx + Math.cos(a) * pr
            const py = cy + Math.sin(a) * pr
            const size = 2 + bass * 18 + highs * 9 + this.buildProgress * 1.6
            this.ctx.beginPath()
            this.ctx.arc(px, py, size, 0, Math.PI * 2)
            this.ctx.fill()
          }
        }
      }

      if (shake > 0) this.ctx.restore()
      if (this.effects) this.effects.update(this.ctx, now, this.pixelRatio)
    }
  }

  return new SpeakerAnim()
}

export default speakerFactory

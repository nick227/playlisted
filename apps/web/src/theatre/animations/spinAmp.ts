import { IAnimation } from '../core/IAnimation'
import type { PublicAnimationContext } from '../author/types'
import CanvasAnimation from '../core/CanvasAnimation'

const RINGS = 10
const Z_NEAR = 0.18
const Z_FAR = 2.4
const GOLDEN = 1.6180339887

export function spinAmpFactory(): IAnimation {
  class SpinAmp extends CanvasAnimation {
    private ringZ = new Float32Array(0)
    private ringRot = new Float32Array(0)
    private ringOmega = new Float32Array(0)
    private ringR = new Uint8Array(0)
    private ringG = new Uint8Array(0)
    private lastTime = 0

    constructor() {
      super({ useEffects: true, defaultBlendMode: 'screen', defaultZIndex: 102 })
    }

    private ensureState() {
      if (this.ringZ.length === RINGS) return
      this.ringZ = new Float32Array(RINGS)
      this.ringRot = new Float32Array(RINGS)
      this.ringOmega = new Float32Array(RINGS)
      this.ringR = new Uint8Array(RINGS)
      this.ringG = new Uint8Array(RINGS)
      for (let i = 0; i < RINGS; i++) {
        this.ringZ[i] = Z_NEAR + (Z_FAR - Z_NEAR) * (i / RINGS)
        // Phase offsets spread by golden ratio so rings never align
        this.ringRot[i] = (i * GOLDEN) % (Math.PI * 2)
        // Slightly different angular velocity per ring
        this.ringOmega[i] = 0.10 + (i / RINGS) * 0.18
        this.ringR[i] = 80 + Math.round((i / (RINGS - 1)) * 120)
        this.ringG[i] = 130 + Math.round((i / (RINGS - 1)) * 80)
      }
    }

    protected draw(context: PublicAnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)

      this.ensureState()

      const { bass, mids, highs } = this.readBands(context)
      const features = context.shared?.features
      const sensitivity = context.options?.sensitivity || 1
      const intensity = context.options?.intensity || 1
      const now = context.shared?.time?.elapsed ?? performance.now()

      const delta = this.lastTime === 0 ? 16 : Math.min(now - this.lastTime, 100)
      this.lastTime = now

      const energyValue = Math.min(1, (features?.env || features?.rms || 0) * 1.4)
      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false, midsHit: false, highsHit: false, beat: false, chaosHit: false,
        energy: energyValue, brightness: features?.centroid || 0,
      }

      const cx = w / 2
      const cy = h / 2

      if (this.effects) {
        if (triggers.chaosHit && triggers.energy > 0.75) this.effects.triggerShockwave(cx, cy, triggers.energy * 1.1)
        if (triggers.midsHit) this.effects.triggerParticleBurst(cx, cy, Math.floor(6 + triggers.energy * 20), triggers.energy * 0.9, '140,200,255')
        if (triggers.beat) this.effects.triggerParticleBurst(cx, cy, Math.floor(4 + triggers.energy * 10), triggers.energy * 0.6, '200,240,255')
      }

      // Advance all rings toward viewer; bass boosts dolly speed
      const speed = (0.25 + bass * 2.0 * sensitivity) * intensity * (delta / 1000)
      for (let i = 0; i < RINGS; i++) {
        this.ringZ[i] -= speed
        if (this.ringZ[i] < Z_NEAR) {
          // Wrap to back, carrying over any overshoot
          this.ringZ[i] += Z_FAR - Z_NEAR
        }
      }

      // Painter's algorithm: draw far rings first
      const order = Array.from({ length: RINGS }, (_, i) => i)
        .sort((a, b) => this.ringZ[b] - this.ringZ[a])

      const minSide = Math.min(w, h)
      // Tunnel radius grows slightly with bass
      const tunnelRadius = minSide * (0.33 + bass * 0.07 * intensity)
      const time = now / 1000
      const pi2 = Math.PI * 2

      const shakeAllowed = this.allowsShake(context)
      const shake = shakeAllowed && this.effects ? this.effects.getShake() : 0
      if (shake > 0) {
        this.ctx.save()
        this.ctx.translate(
          (Math.random() - 0.5) * 10 * shake,
          (Math.random() - 0.5) * 8 * shake,
        )
      }

      for (const i of order) {
        const z = this.ringZ[i]
        const projR = tunnelRadius / z

        // Depth ramp: 0=far, 1=near
        const t = (Z_FAR - z) / (Z_FAR - Z_NEAR)
        // Fade out as ring rushes past the near plane
        const nearFade = z < 0.45 ? (z - Z_NEAR) / (0.45 - Z_NEAR) : 1.0
        const depthAlpha = Math.min(0.95, 0.06 + t * 0.88) * nearFade
        const reactAlpha = Math.min(1, 0.25 + (mids * 0.7 + highs * 0.5) * sensitivity)
        const alpha = Math.min(0.95, depthAlpha * reactAlpha)

        // Thicker and brighter as ring approaches
        const lineWidth = Math.max(0.5, (1.0 + bass * 10 * intensity) * (0.2 + t * 0.8))
        const rot = (time * this.ringOmega[i] + this.ringRot[i]) % pi2

        this.ctx.save()
        this.ctx.translate(cx, cy)
        this.ctx.rotate(rot)
        this.ctx.strokeStyle = `rgba(${this.ringR[i]},${this.ringG[i]},255,${alpha})`
        this.ctx.lineWidth = lineWidth
        this.ctx.beginPath()
        this.ctx.arc(0, 0, projR, 0, pi2)
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

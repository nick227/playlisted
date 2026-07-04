import { IAnimation } from '../core/IAnimation'
import type { PublicAnimationContext } from '../author/types'
import CanvasAnimation from '../core/CanvasAnimation'

const N = 8  // blob anchor points

export function goopyFactory(): IAnimation {
  class Goopy extends CanvasAnimation {
    private phases = new Float32Array(N)
    private hue = 145
    private blinkTimer = 2800
    private blinkPhase = 0
    private blinkT = 0
    private lastTime = 0
    private stateReady = false

    constructor() {
      super({ useEffects: true, defaultBlendMode: 'normal', defaultZIndex: 101 })
    }

    private ensureState() {
      if (this.stateReady) return
      for (let i = 0; i < N; i++) this.phases[i] = i * 1.6180339887
      this.stateReady = true
    }

    protected draw(context: PublicAnimationContext): void {
      const w = this.cssWidth; const h = this.cssHeight
      this.ensureState()
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#060810'; this.ctx.fillRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
      const features   = context.shared?.features
      const intensity  = context.options?.intensity  || 1
      const sensitivity = context.options?.sensitivity || 1
      const now   = context.shared?.time?.elapsed ?? performance.now()
      const delta = this.lastTime === 0 ? 16 : Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const time = now / 1000

      const audioSens   = sensitivity * intensity
      const energyValue = Math.min(1, (features?.env || features?.rms || 0) * 1.4)
      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false, midsHit: false, highsHit: false, beat: false, chaosHit: false,
        energy: energyValue, brightness: features?.centroid || 0,
      }

      const cx = w / 2; const cy = h * 0.46
      const minSide = Math.min(w, h)
      const baseR = minSide * 0.24

      // Hue drifts: mids push toward cyan, bass pushes toward purple
      this.hue += (mids * 80 - bass * 40) * (delta / 1000) * 0.6
      this.hue = ((this.hue % 360) + 360) % 360
      const sat = 55 + energyValue * 28
      const lit = 36 + energyValue * 16

      // ── Blob body ────────────────────────────────────────────────────────────
      // Angles: 0=top, clockwise. Bottom points at indices 3,4,5.
      const blobPts: Array<[number, number]> = []
      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2
        const osc = Math.sin(time * 1.35 + this.phases[i]) * 0.08
                  + Math.sin(time * 0.68 + this.phases[i] * 1.4) * 0.04
        const spike = triggers.chaosHit ? 0.22 * triggers.energy : 0
        const r = baseR * (1 + bass * 0.20 * audioSens + osc + spike)
        blobPts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
      }
      // Midpoints for smooth closed quadratic bezier
      const midPts: Array<[number, number]> = blobPts.map((p, i) => {
        const q = blobPts[(i + 1) % N]
        return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      })

      // Outer glow
      const glowR = baseR * (1.65 + energyValue * 0.55)
      const gg = this.ctx.createRadialGradient(cx, cy, baseR * 0.4, cx, cy, glowR)
      gg.addColorStop(0, `hsla(${this.hue},${sat}%,${lit + 22}%,${0.10 + energyValue * 0.22})`)
      gg.addColorStop(1, 'rgba(0,0,0,0)')
      this.ctx.beginPath(); this.ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
      this.ctx.fillStyle = gg; this.ctx.fill()

      // Body fill
      const bg = this.ctx.createRadialGradient(cx - baseR * 0.22, cy - baseR * 0.28, baseR * 0.1, cx, cy, baseR * 1.1)
      bg.addColorStop(0, `hsla(${this.hue + 22},${sat + 12}%,${lit + 30}%,0.97)`)
      bg.addColorStop(0.55, `hsla(${this.hue},${sat}%,${lit}%,0.96)`)
      bg.addColorStop(1, `hsla(${this.hue - 18},${sat - 6}%,${lit - 10}%,0.92)`)
      this.ctx.beginPath()
      this.ctx.moveTo(midPts[0][0], midPts[0][1])
      for (let i = 0; i < N; i++) {
        const m = midPts[(i + 1) % N]
        this.ctx.quadraticCurveTo(blobPts[i][0], blobPts[i][1], m[0], m[1])
      }
      this.ctx.closePath(); this.ctx.fillStyle = bg; this.ctx.fill()
      this.ctx.strokeStyle = `hsla(${this.hue + 35},${sat}%,${lit + 38}%,0.50)`
      this.ctx.lineWidth = 1.5 + bass * 3 * audioSens; this.ctx.stroke()

      // Wet specular highlight — bright ellipse on upper-left of blob
      const hlX = cx - baseR * 0.28; const hlY = cy - baseR * 0.30
      const hlGrd = this.ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, baseR * 0.38)
      hlGrd.addColorStop(0, `hsla(${this.hue + 50},50%,92%,${0.22 + energyValue * 0.14})`)
      hlGrd.addColorStop(1, 'rgba(0,0,0,0)')
      this.ctx.beginPath(); this.ctx.ellipse(hlX, hlY, baseR * 0.38, baseR * 0.22, -0.5, 0, Math.PI * 2)
      this.ctx.fillStyle = hlGrd; this.ctx.fill()

      // ── Drips (bottom 3 points: indices 3, 4, 5) ─────────────────────────────
      for (const di of [3, 4, 5]) {
        const [dx, dTopY] = blobPts[di]
        const dripLen = baseR * (0.45 + bass * 1.25 * audioSens + Math.sin(time * 0.85 + di) * 0.12)
        const ctrlX = dx + Math.sin(time * 0.95 + di * 1.3) * baseR * 0.10
        const endY = dTopY + dripLen; const endX = dx + (ctrlX - dx) * 0.35
        // Shaft
        this.ctx.beginPath(); this.ctx.moveTo(dx, dTopY)
        this.ctx.quadraticCurveTo(ctrlX, (dTopY + endY) / 2, endX, endY)
        this.ctx.strokeStyle = `hsla(${this.hue},${sat}%,${lit + 12}%,0.80)`
        this.ctx.lineWidth = 5 + bass * 7 * audioSens; this.ctx.lineCap = 'round'; this.ctx.stroke()
        // Droplet at tip
        const dropR = 4.5 + bass * 6 * audioSens
        this.ctx.beginPath(); this.ctx.arc(endX, endY, dropR, 0, Math.PI * 2)
        this.ctx.fillStyle = `hsla(${this.hue + 10},${sat}%,${lit + 18}%,0.90)`; this.ctx.fill()
      }

      // ── Single giant eye ─────────────────────────────────────────────────────
      const eyeCY = cy - baseR * 0.10
      const eyeR  = baseR * 0.38
      const pupilR = eyeR * (0.50 + energyValue * 0.18)
      const pupilX = Math.sin(time * 0.52) * eyeR * 0.20 + mids * eyeR * 0.16
      const pupilY = Math.cos(time * 0.40) * eyeR * 0.15 - bass * eyeR * 0.13

      this.blinkTimer -= delta
      if (this.blinkTimer <= 0 && this.blinkPhase === 0) { this.blinkPhase = 1; this.blinkT = 0; this.blinkTimer = 2200 + Math.random() * 4000 }
      let blinkSc = 1.0
      if (this.blinkPhase > 0) {
        this.blinkT += delta; const half = 90
        if (this.blinkPhase === 1) { blinkSc = Math.max(0, 1 - this.blinkT / half); if (blinkSc <= 0) { this.blinkPhase = 2; this.blinkT = 0 } }
        else { blinkSc = Math.min(1, this.blinkT / half); if (blinkSc >= 1) this.blinkPhase = 0 }
      }

      // Subtle eyebrow arch above eye
      this.ctx.strokeStyle = `hsla(${this.hue + 30},${sat - 10}%,${lit + 15}%,0.55)`
      this.ctx.lineWidth = eyeR * 0.09; this.ctx.lineCap = 'round'
      this.ctx.beginPath()
      this.ctx.arc(cx, eyeCY - eyeR * 0.28, eyeR * 0.82, Math.PI * 1.22, Math.PI * 1.78)
      this.ctx.stroke()

      // Eye glow halo
      const ehalo = this.ctx.createRadialGradient(cx, eyeCY, eyeR * 0.5, cx, eyeCY, eyeR * 2.2)
      ehalo.addColorStop(0, `hsla(${this.hue + 55},80%,75%,0.18)`); ehalo.addColorStop(1, 'rgba(0,0,0,0)')
      this.ctx.beginPath(); this.ctx.arc(cx, eyeCY, eyeR * 2.2, 0, Math.PI * 2); this.ctx.fillStyle = ehalo; this.ctx.fill()

      this.ctx.save(); this.ctx.translate(cx, eyeCY); this.ctx.scale(1, blinkSc)
      this.ctx.beginPath(); this.ctx.arc(0, 0, eyeR, 0, Math.PI * 2)
      this.ctx.fillStyle = `hsla(${this.hue + 45},28%,90%,0.96)`; this.ctx.fill()
      this.ctx.strokeStyle = `hsla(${this.hue},${sat}%,${lit + 18}%,0.55)`; this.ctx.lineWidth = 2; this.ctx.stroke()
      this.ctx.beginPath(); this.ctx.arc(pupilX, pupilY, pupilR, 0, Math.PI * 2); this.ctx.fillStyle = '#050812'; this.ctx.fill()
      this.ctx.strokeStyle = `hsla(${this.hue + 50},70%,55%,0.45)`; this.ctx.lineWidth = pupilR * 0.20
      this.ctx.beginPath(); this.ctx.arc(pupilX, pupilY, pupilR * 0.70, 0, Math.PI * 2); this.ctx.stroke()
      this.ctx.beginPath(); this.ctx.arc(pupilX - pupilR * 0.30, pupilY - pupilR * 0.32, pupilR * 0.28, 0, Math.PI * 2)
      this.ctx.fillStyle = 'rgba(255,255,255,0.90)'; this.ctx.fill()
      this.ctx.beginPath(); this.ctx.arc(pupilX + pupilR * 0.20, pupilY + pupilR * 0.20, pupilR * 0.12, 0, Math.PI * 2)
      this.ctx.fillStyle = 'rgba(255,255,255,0.55)'; this.ctx.fill()
      if (triggers.beat || triggers.bassHit) {
        const eg = this.ctx.createRadialGradient(0, 0, eyeR * 0.3, 0, 0, eyeR * 2.1)
        eg.addColorStop(0, `hsla(${this.hue + 60},90%,88%,${0.38 * triggers.energy})`); eg.addColorStop(1, 'rgba(0,0,0,0)')
        this.ctx.beginPath(); this.ctx.arc(0, 0, eyeR * 2.1, 0, Math.PI * 2); this.ctx.fillStyle = eg; this.ctx.fill()
      }
      this.ctx.restore()

      // ── Effects ───────────────────────────────────────────────────────────────
      if (this.effects) {
        const pr = Math.round
        if (triggers.beat)     this.effects.triggerParticleBurst(cx, cy - baseR * 1.1, Math.floor(8 + triggers.energy * 18), triggers.energy * 0.85, `${pr(40 + mids * 80)},${pr(180 + bass * 60)},${pr(100 + highs * 80)}`)
        if (triggers.chaosHit) this.effects.triggerShockwave(cx, cy, triggers.energy)
        if (triggers.midsHit)  this.effects.triggerParticleBurst(cx, cy + baseR * 0.9, Math.floor(6 + triggers.energy * 12), triggers.energy * 0.7, `${pr(50 + highs * 80)},${pr(200 + mids * 55)},${pr(120 + bass * 60)}`)
      }
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }
  return new Goopy()
}

export default goopyFactory

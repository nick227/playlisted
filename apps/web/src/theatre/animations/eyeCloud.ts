import { IAnimation } from '../core/IAnimation'
import type { PublicAnimationContext } from '../author/types'
import CanvasAnimation from '../core/CanvasAnimation'

// Relative positions/sizes of the 6 eyes (fraction of bodyR)
const EYE_DEFS = [
  { rx: -0.36, ry: -0.30, rs: 0.155 },
  { rx:  0.30, ry: -0.36, rs: 0.215 },  // largest — the "main" eye
  { rx: -0.08, ry: -0.06, rs: 0.125 },
  { rx:  0.46, ry:  0.06, rs: 0.105 },
  { rx: -0.42, ry:  0.22, rs: 0.115 },
  { rx:  0.12, ry:  0.34, rs: 0.095 },
]

// Overlapping circles that define the cloud body
const CLOUD_CIRCLES = [
  { rx: 0,     ry:  0,    rs: 0.58 },
  { rx: -0.38, ry: -0.18, rs: 0.40 },
  { rx:  0.40, ry: -0.12, rs: 0.38 },
  { rx: -0.28, ry:  0.30, rs: 0.35 },
  { rx:  0.32, ry:  0.26, rs: 0.32 },
]

interface EyeState { bt: number; bp: number; bT: number; boom: number; boomT: number }

export function eyeCloudFactory(): IAnimation {
  class EyeCloud extends CanvasAnimation {
    private eyeStates: EyeState[] = []
    private lastTime = 0

    constructor() {
      super({ useEffects: true, defaultBlendMode: 'normal', defaultZIndex: 101 })
    }

    private ensureState() {
      if (this.eyeStates.length === EYE_DEFS.length) return
      this.eyeStates = EYE_DEFS.map((_, i) => ({
        bt: 1500 + i * 620 + Math.random() * 2500,
        bp: 0, bT: 0, boom: 1, boomT: 0,
      }))
    }

    protected draw(context: PublicAnimationContext): void {
      const w = this.cssWidth; const h = this.cssHeight
      this.ensureState()
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#070610'; this.ctx.fillRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
      const features   = context.shared?.features
      const intensity   = context.options?.intensity  || 1
      const sensitivity = context.options?.sensitivity || 1
      const now   = context.shared?.time?.elapsed ?? performance.now()
      const delta = this.lastTime === 0 ? 16 : Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const time = now / 1000

      const energyValue = Math.min(1, (features?.env || features?.rms || 0) * 1.4)
      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false, midsHit: false, highsHit: false, beat: false, chaosHit: false,
        energy: energyValue, brightness: features?.centroid || 0,
      }

      const cx = w / 2; const cy = h / 2
      const bodyR = Math.min(w, h) * 0.26

      // On chaos, randomly pop one eye
      if (triggers.chaosHit) {
        const lucky = Math.floor(Math.random() * this.eyeStates.length)
        this.eyeStates[lucky].boom = 2.5; this.eyeStates[lucky].boomT = 600
      }

      // ── Body glow ─────────────────────────────────────────────────────────────
      const glowR = bodyR * (1.6 + energyValue * 0.5)
      const gr = Math.round(100 + mids * 80); const gg = Math.round(60 + bass * 60); const gb = Math.round(200 + highs * 55)
      const glowGrd = this.ctx.createRadialGradient(cx, cy, bodyR * 0.5, cx, cy, glowR)
      glowGrd.addColorStop(0, `rgba(${gr},${gg},${gb},${0.10 + energyValue * 0.22})`)
      glowGrd.addColorStop(1, 'rgba(0,0,0,0)')
      this.ctx.beginPath(); this.ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
      this.ctx.fillStyle = glowGrd; this.ctx.fill()

      // ── Cloud body — overlapping circles ──────────────────────────────────────
      const bodyR2 = bodyR * (1 + bass * 0.06 * intensity)
      const cr = Math.round(105 + mids * 40); const cg2 = Math.round(78 + bass * 35); const cb2 = Math.round(172 + highs * 40)
      const bodyCol = `rgb(${cr},${cg2},${cb2})`
      for (const c of CLOUD_CIRCLES) {
        const cx2 = cx + c.rx * bodyR2 + Math.sin(time * 0.7 + c.rx * 4) * bodyR * 0.012
        const cy2 = cy + c.ry * bodyR2 + Math.cos(time * 0.55 + c.ry * 4) * bodyR * 0.010
        const r2 = c.rs * bodyR2 * (1 + bass * 0.08 * intensity)
        this.ctx.beginPath(); this.ctx.arc(cx2, cy2, r2, 0, Math.PI * 2)
        if (c.rx === 0 && c.ry === 0) {
          // Main central circle gets a radial gradient for depth
          const bg = this.ctx.createRadialGradient(cx2 - r2 * 0.22, cy2 - r2 * 0.25, r2 * 0.08, cx2, cy2, r2)
          bg.addColorStop(0, `rgb(${Math.min(255, cr + 38)},${Math.min(255, cg2 + 28)},${Math.min(255, cb2 + 28)})`)
          bg.addColorStop(1, bodyCol)
          this.ctx.fillStyle = bg
        } else {
          this.ctx.fillStyle = bodyCol
        }
        this.ctx.fill()
      }
      // Fuzzy outer fringe — multiple low-alpha rings
      for (let f = 0; f < 4; f++) {
        const fR = bodyR * (0.58 + f * 0.065) * (1 + bass * 0.06 * intensity)
        this.ctx.beginPath(); this.ctx.arc(cx, cy, fR, 0, Math.PI * 2)
        this.ctx.strokeStyle = `rgba(${gr + 20},${gg + 10},${gb + 15},${0.18 - f * 0.04})`
        this.ctx.lineWidth = bodyR * 0.055; this.ctx.stroke()
      }

      // ── Eyes ─────────────────────────────────────────────────────────────────
      const pupilWanderX = Math.sin(time * 0.48) * 0.18 + mids * 0.14 * sensitivity
      const pupilWanderY = Math.cos(time * 0.36) * 0.14 - bass * 0.10 * sensitivity

      for (let ei = 0; ei < EYE_DEFS.length; ei++) {
        const def = EYE_DEFS[ei]; const st = this.eyeStates[ei]

        // Boom countdown
        if (st.boomT > 0) { st.boomT -= delta; if (st.boomT <= 0) st.boom = 1 }
        const boomLerp = st.boom > 1 ? Math.min(1, st.boomT / 300) : 0
        const sizeScale = 1 + (st.boom - 1) * boomLerp

        const ex = cx + def.rx * bodyR2 + Math.sin(time * 0.62 + ei * 0.9) * bodyR * 0.014
        const ey = cy + def.ry * bodyR2 + Math.cos(time * 0.50 + ei * 0.7) * bodyR * 0.012
        const eR = def.rs * bodyR2 * sizeScale

        // Blink state
        st.bt -= delta
        if (st.bt <= 0 && st.bp === 0) { st.bp = 1; st.bT = 0; st.bt = 1800 + Math.random() * 4500 }
        let blinkSc = 1.0
        if (st.bp > 0) {
          st.bT += delta; const half = 75
          if (st.bp === 1) { blinkSc = Math.max(0, 1 - st.bT / half); if (blinkSc <= 0) { st.bp = 2; st.bT = 0 } }
          else { blinkSc = Math.min(1, st.bT / half); if (blinkSc >= 1) st.bp = 0 }
        }

        const pupilR = eR * (0.44 + energyValue * 0.16)
        const pupilX = pupilWanderX * eR + (ei % 2 === 0 ? 0.04 : -0.04) * eR
        const pupilY = pupilWanderY * eR + (ei < 3 ? -0.03 : 0.03) * eR

        this.ctx.save(); this.ctx.translate(ex, ey); this.ctx.scale(1, blinkSc)
        // Sclera
        this.ctx.beginPath(); this.ctx.arc(0, 0, eR, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(238,235,255,0.96)`; this.ctx.fill()
        this.ctx.strokeStyle = `rgba(${gr - 20},${gg},${gb},0.45)`; this.ctx.lineWidth = 1.5; this.ctx.stroke()
        // Pupil
        this.ctx.beginPath(); this.ctx.arc(pupilX, pupilY, pupilR, 0, Math.PI * 2); this.ctx.fillStyle = '#080815'; this.ctx.fill()
        // Iris ring (unique color per eye)
        const irisHue = 260 + ei * 18
        this.ctx.strokeStyle = `hsla(${irisHue},70%,55%,0.45)`; this.ctx.lineWidth = pupilR * 0.22
        this.ctx.beginPath(); this.ctx.arc(pupilX, pupilY, pupilR * 0.70, 0, Math.PI * 2); this.ctx.stroke()
        // Gleams (two dots for depth)
        this.ctx.beginPath(); this.ctx.arc(pupilX - pupilR * 0.28, pupilY - pupilR * 0.30, pupilR * 0.28, 0, Math.PI * 2)
        this.ctx.fillStyle = 'rgba(255,255,255,0.90)'; this.ctx.fill()
        this.ctx.beginPath(); this.ctx.arc(pupilX + pupilR * 0.20, pupilY + pupilR * 0.18, pupilR * 0.11, 0, Math.PI * 2)
        this.ctx.fillStyle = 'rgba(255,255,255,0.50)'; this.ctx.fill()
        // Beat glow
        if (triggers.beat) {
          const eg = this.ctx.createRadialGradient(0, 0, eR * 0.3, 0, 0, eR * 1.9)
          eg.addColorStop(0, `hsla(${irisHue},90%,88%,${0.35 * triggers.energy})`); eg.addColorStop(1, 'rgba(0,0,0,0)')
          this.ctx.beginPath(); this.ctx.arc(0, 0, eR * 1.9, 0, Math.PI * 2); this.ctx.fillStyle = eg; this.ctx.fill()
        }
        this.ctx.restore()
      }

      // ── Silly mouth (below lowest eye — gap added to avoid overlap) ──────────
      const mCY = cy + bodyR * 0.56; const mW = bodyR * 0.38
      const mH = Math.max(4, bodyR * 0.06 + bass * bodyR * 0.14 * intensity)
      this.ctx.beginPath(); this.ctx.ellipse(cx, mCY, mW, mH, 0, 0, Math.PI)
      this.ctx.fillStyle = '#060514'; this.ctx.fill()
      this.ctx.strokeStyle = `rgba(${gr - 10},${gg},${gb},0.5)`; this.ctx.lineWidth = 1.5; this.ctx.stroke()

      // ── Effects ───────────────────────────────────────────────────────────────
      if (this.effects) {
        if (triggers.beat)     this.effects.triggerParticleBurst(cx, cy - bodyR, Math.floor(8 + triggers.energy * 18), triggers.energy * 0.85, `${gr},${gg},${gb}`)
        if (triggers.chaosHit) this.effects.triggerShockwave(cx, cy, triggers.energy)
        if (triggers.midsHit)  this.effects.triggerParticleBurst(cx + bodyR * 0.5, cy - bodyR * 0.2, Math.floor(5 + triggers.energy * 10), triggers.energy * 0.7, '180,140,255')
      }
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }
  return new EyeCloud()
}

export default eyeCloudFactory

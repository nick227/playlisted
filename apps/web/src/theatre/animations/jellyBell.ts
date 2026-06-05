import { AnimationContext, IAnimation } from '../core/IAnimation'
import CanvasAnimation from '../core/CanvasAnimation'

const N_TENT = 8  // number of tentacles

// Bioluminescent spot positions (fraction of bellR) on the dome face
const SPOTS = [
  { rx: -0.50, ry: -0.55 }, { rx:  0.42, ry: -0.60 },
  { rx: -0.20, ry: -0.78 }, { rx:  0.58, ry: -0.28 },
  { rx: -0.62, ry: -0.22 },
]

export function jellyBellFactory(): IAnimation {
  class JellyBell extends CanvasAnimation {
    private tentPhases = new Float32Array(N_TENT)
    private spotIntensities = new Float32Array(SPOTS.length)
    private floatOffset = 0
    private beatFlash = 0
    private lastTime = 0
    private stateReady = false
    private blinkTimer = 3000
    private blinkPhase = 0
    private blinkT = 0

    constructor() {
      super({ useEffects: true, defaultBlendMode: 'normal', defaultZIndex: 101 })
    }

    private ensureState() {
      if (this.stateReady) return
      for (let i = 0; i < N_TENT; i++) this.tentPhases[i] = i * 0.75
      for (let i = 0; i < SPOTS.length; i++) this.spotIntensities[i] = Math.random()
      this.stateReady = true
    }

    protected draw(context: AnimationContext): void {
      const w = this.cssWidth; const h = this.cssHeight
      this.ensureState()
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#030510'; this.ctx.fillRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
      const features   = context.shared?.features
      const intensity  = context.options?.intensity  || 1
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

      // Beat flash
      if (triggers.beat || triggers.bassHit) this.beatFlash = Math.max(this.beatFlash, triggers.energy)
      this.beatFlash = Math.max(0, this.beatFlash - (delta / 200))

      const cx = w / 2
      const minSide = Math.min(w, h)
      const bellR = minSide * 0.24

      // Whole body floats up and down
      this.floatOffset = Math.sin(time * 0.75) * minSide * 0.025
      const cy = h * 0.46 + this.floatOffset

      const rimY = cy  // flat bottom of the bell dome

      // Spot reactivity: each spot responds to its own frequency + overall energy
      for (let i = 0; i < SPOTS.length; i++) {
        const target = Math.min(1, energyValue * 1.2 + [bass, mids, highs, bass, mids][i] * 0.5)
        this.spotIntensities[i] += (target - this.spotIntensities[i]) * 0.15
      }

      // ── Background glow field ─────────────────────────────────────────────────
      const bgGrd = this.ctx.createRadialGradient(cx, cy - bellR * 0.4, bellR * 0.2, cx, cy - bellR * 0.4, bellR * 2.2)
      const glowB = Math.round(140 + bass * 70); const glowC = Math.round(80 + highs * 80)
      bgGrd.addColorStop(0, `rgba(${glowC},${Math.round(60 + mids * 50)},${glowB},${0.08 + energyValue * 0.18})`)
      bgGrd.addColorStop(1, 'rgba(0,0,0,0)')
      this.ctx.beginPath(); this.ctx.arc(cx, cy - bellR * 0.4, bellR * 2.2, 0, Math.PI * 2)
      this.ctx.fillStyle = bgGrd; this.ctx.fill()

      // ── Tentacles (drawn before bell so bell is on top) ───────────────────────
      const tentLen = bellR * (1.35 + bass * 0.65 * intensity)
      const tentCol = `rgba(${glowC},${Math.round(80 + mids * 60)},${glowB},0.72)`
      this.ctx.lineWidth = 2.2 + bass * 2 * intensity; this.ctx.lineCap = 'round'

      for (let ti = 0; ti < N_TENT; ti++) {
        // Space tentacles across the rim
        const tx = cx - bellR * 0.88 + (ti / (N_TENT - 1)) * bellR * 1.76
        const phase = this.tentPhases[ti] + time * 1.6
        const swing1 = Math.sin(phase) * bellR * (0.10 + bass * 0.18 * sensitivity)
        const swing2 = Math.sin(phase * 0.7 + 1.0) * bellR * (0.08 + mids * 0.12 * sensitivity)
        const midX1 = tx + swing1 * 0.5; const midY1 = rimY + tentLen * 0.33
        const midX2 = tx + swing2;       const midY2 = rimY + tentLen * 0.68
        const endX  = tx + swing2 * 0.6; const endY  = rimY + tentLen

        // Gradient fade on tentacle
        const tg = this.ctx.createLinearGradient(tx, rimY, endX, endY)
        tg.addColorStop(0, tentCol); tg.addColorStop(1, `rgba(${glowC},${Math.round(80 + mids * 60)},${glowB},0.10)`)
        this.ctx.strokeStyle = tg

        this.ctx.beginPath(); this.ctx.moveTo(tx, rimY)
        this.ctx.bezierCurveTo(midX1, midY1, midX2, midY2, endX, endY)
        this.ctx.stroke()

        // Suckers — small glowing dots along tentacle length
        for (let s = 1; s <= 3; s++) {
          const t = s / 4
          const sx = tx + (midX2 - tx) * t + swing1 * t * 0.4
          const sy = rimY + tentLen * t
          this.ctx.beginPath(); this.ctx.arc(sx, sy, 1.8 + bass * 1.5, 0, Math.PI * 2)
          this.ctx.fillStyle = `rgba(${glowC + 40},${Math.round(160 + mids * 80)},255,${0.35 + bass * 0.3})`; this.ctx.fill()
        }
      }

      // ── Bell body ─────────────────────────────────────────────────────────────
      // Ellipse so X/Y radii can squish independently — organic jellyfish pulse
      const squish = Math.sin(time * 2.4) * 0.018 + bass * 0.030 * intensity
      const bellRx = bellR * (1 + squish)   // widens on beat
      const bellRy = bellR * (1 - squish * 0.6)  // slightly flattens as it widens

      // Dome fill — layered translucent gradient
      const domeGrd = this.ctx.createRadialGradient(cx - bellR * 0.18, rimY - bellR * 0.45, bellR * 0.05, cx, rimY, bellR * 1.05)
      const flash = this.beatFlash
      domeGrd.addColorStop(0, `rgba(${Math.round(80 + flash * 100)},${Math.round(160 + flash * 80)},${Math.round(220 + flash * 35)},${0.65 + flash * 0.20})`)
      domeGrd.addColorStop(0.5, `rgba(${glowC},${Math.round(80 + mids * 50)},${glowB},0.45)`)
      domeGrd.addColorStop(1, `rgba(${Math.max(0, glowC - 20)},${Math.round(40 + bass * 30)},${Math.max(0, glowB - 20)},0.25)`)

      this.ctx.beginPath()
      this.ctx.ellipse(cx, rimY, bellRx, bellRy, 0, Math.PI, 0)  // upper half of ellipse
      this.ctx.closePath()
      this.ctx.fillStyle = domeGrd; this.ctx.fill()

      // Dome rim
      this.ctx.strokeStyle = `rgba(${Math.min(255, glowC + 30)},${Math.round(140 + mids * 80)},255,0.65)`
      this.ctx.lineWidth = 2 + bass * 2 * intensity
      this.ctx.beginPath(); this.ctx.ellipse(cx, rimY, bellRx, bellRy, 0, Math.PI, 0); this.ctx.stroke()

      // Interior shimmer (subtle arc highlight suggesting translucency)
      this.ctx.strokeStyle = `rgba(200,240,255,${0.04 + energyValue * 0.06})`
      this.ctx.lineWidth = bellR * 0.14
      this.ctx.beginPath(); this.ctx.arc(cx - bellR * 0.14, rimY - bellR * 0.10, bellR * 0.55, Math.PI * 1.15, Math.PI * 1.80)
      this.ctx.stroke()

      // ── Bioluminescent spots on dome ──────────────────────────────────────────
      for (let si = 0; si < SPOTS.length; si++) {
        const sp = SPOTS[si]; const inten = this.spotIntensities[si]
        const sx = cx + sp.rx * bellR; const sy = rimY + sp.ry * bellR
        const sR = bellR * (0.048 + inten * 0.040)
        const spotGrd = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, sR * 3.5)
        const sc = Math.round(80 + inten * 175)
        spotGrd.addColorStop(0, `rgba(${sc},255,${Math.round(200 + inten * 55)},${0.80 + inten * 0.18})`)
        spotGrd.addColorStop(0.4, `rgba(${sc},${Math.round(150 + inten * 80)},200,${0.20 + inten * 0.15})`)
        spotGrd.addColorStop(1, 'rgba(0,0,0,0)')
        this.ctx.beginPath(); this.ctx.arc(sx, sy, sR * 3.5, 0, Math.PI * 2)
        this.ctx.fillStyle = spotGrd; this.ctx.fill()
        this.ctx.beginPath(); this.ctx.arc(sx, sy, sR, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(200,255,240,${0.85 + inten * 0.15})`; this.ctx.fill()
      }

      // ── Eyes on bell face ─────────────────────────────────────────────────────
      const eyeOffX = bellR * 0.28; const eyeY = rimY - bellR * 0.30; const eyeR = bellR * 0.155
      const pupilR  = eyeR * (0.42 + energyValue * 0.16)
      const pupilX  = Math.sin(time * 0.55) * eyeR * 0.22 + mids * eyeR * 0.18
      const pupilY2 = Math.cos(time * 0.42) * eyeR * 0.16 - bass * eyeR * 0.13

      // Blink
      this.blinkTimer -= delta
      if (this.blinkTimer <= 0 && this.blinkPhase === 0) { this.blinkPhase = 1; this.blinkT = 0; this.blinkTimer = 2800 + Math.random() * 3500 }
      let blinkSc = 1.0
      if (this.blinkPhase > 0) {
        this.blinkT += delta; const half = 85
        if (this.blinkPhase === 1) { blinkSc = Math.max(0, 1 - this.blinkT / half); if (blinkSc <= 0) { this.blinkPhase = 2; this.blinkT = 0 } }
        else { blinkSc = Math.min(1, this.blinkT / half); if (blinkSc >= 1) this.blinkPhase = 0 }
      }

      for (const s of [-1, 1]) {
        const ex = cx + s * eyeOffX
        this.ctx.save(); this.ctx.translate(ex, eyeY); this.ctx.scale(1, blinkSc)
        this.ctx.beginPath(); this.ctx.arc(0, 0, eyeR, 0, Math.PI * 2)
        this.ctx.fillStyle = 'rgba(230,248,255,0.94)'; this.ctx.fill()
        this.ctx.strokeStyle = `rgba(${glowC},${Math.round(140 + mids * 60)},${Math.min(255, glowB + 20)},0.5)`; this.ctx.lineWidth = 1.5; this.ctx.stroke()
        this.ctx.beginPath(); this.ctx.arc(pupilX * s, pupilY2, pupilR, 0, Math.PI * 2)
        this.ctx.fillStyle = '#050810'; this.ctx.fill()
        // Gleams
        this.ctx.beginPath(); this.ctx.arc(pupilX * s - pupilR * 0.28, pupilY2 - pupilR * 0.30, pupilR * 0.26, 0, Math.PI * 2)
        this.ctx.fillStyle = 'rgba(255,255,255,0.88)'; this.ctx.fill()
        this.ctx.beginPath(); this.ctx.arc(pupilX * s + pupilR * 0.18, pupilY2 + pupilR * 0.16, pupilR * 0.11, 0, Math.PI * 2)
        this.ctx.fillStyle = 'rgba(255,255,255,0.50)'; this.ctx.fill()
        this.ctx.restore()
      }

      // ── Mouth (small, below eyes) ─────────────────────────────────────────────
      const mouthOpenness = Math.max(3, bass * bellR * 0.12 * intensity)
      this.ctx.beginPath(); this.ctx.ellipse(cx, eyeY + eyeR * 1.9, bellR * 0.12, mouthOpenness, 0, 0, Math.PI)
      this.ctx.fillStyle = '#050810'; this.ctx.fill()
      this.ctx.strokeStyle = `rgba(${glowC},${Math.round(140 + mids * 60)},255,0.40)`; this.ctx.lineWidth = 1; this.ctx.stroke()

      // ── Effects ───────────────────────────────────────────────────────────────
      if (this.effects) {
        if (triggers.beat)     this.effects.triggerParticleBurst(cx, cy - bellR * 1.1, Math.floor(6 + triggers.energy * 16), triggers.energy * 0.8, `${glowC},${Math.round(180 + bass * 60)},${glowB}`)
        if (triggers.chaosHit) this.effects.triggerShockwave(cx, cy - bellR * 0.4, triggers.energy)
        if (triggers.midsHit)  this.effects.triggerParticleBurst(cx, rimY + tentLen * 0.5, Math.floor(6 + triggers.energy * 12), triggers.energy * 0.7, '80,255,220')
      }
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }
  return new JellyBell()
}

export default jellyBellFactory

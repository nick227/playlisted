import { AnimationContext, IAnimation } from '../core/IAnimation'
import CanvasAnimation from '../core/CanvasAnimation'

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function circuitBotFactory(): IAnimation {
  class CircuitBot extends CanvasAnimation {
    private armBob = 0
    private antWiggle = 0
    private ledPhase = 0
    private glitchTimer = 0
    private glitchX = 0
    private lastTime = 0

    constructor() {
      super({ useEffects: true, defaultBlendMode: 'normal', defaultZIndex: 101 })
    }

    protected draw(context: AnimationContext): void {
      const w = this.cssWidth; const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#030508'; this.ctx.fillRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
      const features  = context.shared?.features
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

      const cx = w / 2; const cy = h / 2
      const u = Math.min(w, h) * 0.088  // base unit

      // State updates
      this.armBob    += (Math.sin(time * 3.8) * bass * 0.5 * intensity - this.armBob) * 0.18
      this.antWiggle  = Math.sin(time * 7.5) * (0.12 + mids * 0.28 * sensitivity)
      this.ledPhase   = (this.ledPhase + delta * 0.0012) % 1.0
      if (triggers.chaosHit) { this.glitchTimer = 380; this.glitchX = (Math.random() - 0.5) * u * 1.8 }
      if (this.glitchTimer > 0) this.glitchTimer -= delta

      const isGlitching = this.glitchTimer > 0
      const ledCol = triggers.beat
        ? `rgba(80,255,180,0.95)`
        : `rgba(0,${Math.round(190 + bass * 65)},${Math.round(155 + highs * 70)},0.85)`
      const frameCol = `rgb(${Math.round(38 + mids * 20)},${Math.round(48 + bass * 18)},58)`
      const edgeCol  = 'rgba(0,200,168,0.55)'

      const headW = u * 4.2; const headH = u * 3.4
      const bodyW = u * 5.0; const bodyH = u * 4.4
      const headY = cy - u * 5.0; const bodyY = cy - u * 1.15
      const cr    = u * 0.38

      // ── Glitch ghost (draw before main body) ─────────────────────────────────
      if (isGlitching) {
        this.ctx.globalAlpha = 0.28
        rrect(this.ctx, cx + this.glitchX - headW / 2, headY, headW, headH, cr); this.ctx.fillStyle = 'rgba(255,0,60,0.7)'; this.ctx.fill()
        rrect(this.ctx, cx + this.glitchX - bodyW / 2, bodyY, bodyW, bodyH, cr); this.ctx.fill()
        this.ctx.globalAlpha = 1
      }

      // ── Body rect ─────────────────────────────────────────────────────────────
      rrect(this.ctx, cx - bodyW / 2, bodyY, bodyW, bodyH, cr)
      this.ctx.fillStyle = frameCol; this.ctx.fill()
      this.ctx.strokeStyle = edgeCol; this.ctx.lineWidth = 1.5; this.ctx.stroke()
      // Left-edge depth panel (lighter strip simulating 3-D bevel)
      this.ctx.fillStyle = 'rgba(255,255,255,0.045)'
      this.ctx.fillRect(cx - bodyW / 2 + 2, bodyY + 2, bodyW * 0.14, bodyH - 4)

      // ── Head rect ─────────────────────────────────────────────────────────────
      rrect(this.ctx, cx - headW / 2, headY, headW, headH, cr)
      this.ctx.fillStyle = frameCol; this.ctx.fill()
      this.ctx.strokeStyle = edgeCol; this.ctx.lineWidth = 1.5; this.ctx.stroke()
      this.ctx.fillStyle = 'rgba(255,255,255,0.045)'
      this.ctx.fillRect(cx - headW / 2 + 2, headY + 2, headW * 0.14, headH - 4)

      // Neck
      const nkW = u * 1.4
      this.ctx.fillStyle = 'rgb(28,36,44)'
      this.ctx.fillRect(cx - nkW / 2, headY + headH, nkW, bodyY - (headY + headH))

      // ── LED eyes ──────────────────────────────────────────────────────────────
      const eyeW = u * 1.15; const eyeH = u * 0.80; const eyeY = headY + headH * 0.34
      for (const s of [-1, 1]) {
        const ex = cx + s * u * 1.05
        this.ctx.fillStyle = 'rgb(8,12,16)'
        this.ctx.fillRect(ex - eyeW / 2, eyeY, eyeW, eyeH)
        // Scan line
        const scanX = ex - eyeW / 2 + ((this.ledPhase + (s > 0 ? 0.5 : 0)) % 1) * eyeW
        this.ctx.fillStyle = ledCol
        this.ctx.fillRect(Math.max(ex - eyeW / 2, scanX - 2), eyeY + 1, 4, eyeH - 2)
        // Glow overlay
        const eLnGrd = this.ctx.createLinearGradient(ex - eyeW / 2, 0, ex + eyeW / 2, 0)
        eLnGrd.addColorStop(0, 'rgba(0,200,168,0.0)')
        eLnGrd.addColorStop(Math.max(0, (scanX - (ex - eyeW / 2) - 12) / eyeW), 'rgba(0,200,168,0.0)')
        eLnGrd.addColorStop(Math.min(1, (scanX - (ex - eyeW / 2)) / eyeW), 'rgba(0,200,168,0.12)')
        eLnGrd.addColorStop(1, 'rgba(0,200,168,0.0)')
        this.ctx.fillStyle = eLnGrd
        this.ctx.fillRect(ex - eyeW / 2, eyeY, eyeW, eyeH)
        // Frame
        this.ctx.strokeStyle = ledCol; this.ctx.lineWidth = 1.5
        this.ctx.strokeRect(ex - eyeW / 2, eyeY, eyeW, eyeH)
      }

      // ── LED mouth — pixel row ─────────────────────────────────────────────────
      const mouthY = headY + headH * 0.74; const mouthW = u * 3.2; const pixW = u * 0.38
      const smileH = [0.18, 0.55, 0.90, 1.0, 0.90, 0.55, 0.18]
      for (let p = 0; p < 7; p++) {
        const px = cx - mouthW / 2 + (p / 6) * mouthW - pixW / 2
        const ph = (pixW * 0.85 + energyValue * pixW * 0.9) * smileH[p]
        const br = Math.round(60 + energyValue * 180 + smileH[p] * 80)
        this.ctx.fillStyle = `rgb(0,${br},${Math.round(br * 0.78)})`
        this.ctx.fillRect(px, mouthY - ph / 2, pixW * 0.82, ph)
      }

      // ── Chest EQ ──────────────────────────────────────────────────────────────
      const eqX = cx - u * 1.95; const eqY = bodyY + bodyH * 0.20
      const eqW = u * 3.9; const eqH = u * 1.95; const barGap = 3
      this.ctx.fillStyle = 'rgba(0,0,0,0.65)'; this.ctx.fillRect(eqX, eqY, eqW, eqH)
      this.ctx.strokeStyle = 'rgba(0,200,168,0.35)'; this.ctx.lineWidth = 1; this.ctx.strokeRect(eqX, eqY, eqW, eqH)
      const bands = [bass * 1.5, bass * 0.6 + mids * 0.9, mids * 1.1, mids * 0.4 + highs * 0.7, highs * 1.3]
      const bW2 = (eqW - barGap * 6) / 5
      for (let b = 0; b < 5; b++) {
        const bh = Math.min(eqH - 6, Math.max(2, bands[b] * (eqH - 6)))
        const bx = eqX + barGap + b * (bW2 + barGap)
        const colR = b < 2 ? 0 : b < 4 ? Math.round(mids * 60) : Math.round(highs * 80)
        const colG = Math.round(150 + bands[b] * 100)
        const colB = b < 2 ? 100 : b < 3 ? 180 : 255
        this.ctx.fillStyle = `rgb(${colR},${colG},${colB})`
        this.ctx.fillRect(bx, eqY + eqH - 3 - bh, bW2, bh)
      }

      // ── Corner bolts ──────────────────────────────────────────────────────────
      this.ctx.fillStyle = 'rgba(160,185,205,0.65)'
      for (const [bx, by] of [
        [cx - headW / 2 + u * 0.32, headY + u * 0.32],
        [cx + headW / 2 - u * 0.32, headY + u * 0.32],
        [cx - bodyW / 2 + u * 0.32, bodyY + bodyH - u * 0.38],
        [cx + bodyW / 2 - u * 0.32, bodyY + bodyH - u * 0.38],
      ] as Array<[number, number]>) {
        this.ctx.beginPath(); this.ctx.arc(bx, by, u * 0.18, 0, Math.PI * 2); this.ctx.fill()
        this.ctx.strokeStyle = 'rgba(80,100,120,0.6)'; this.ctx.lineWidth = 1; this.ctx.stroke()
      }

      // ── Arms — scale(s,1) mirrors left arm so both extend outward ────────────
      const armLen = u * 2.4; const armH = u * 0.88; const armY = bodyY + bodyH * 0.32
      const armAngle = this.armBob + bass * 0.25 * intensity
      for (const s of [-1, 1]) {
        const ax = cx + s * (bodyW / 2)
        this.ctx.save(); this.ctx.translate(ax, armY); this.ctx.scale(s, 1); this.ctx.rotate(armAngle)
        this.ctx.fillStyle = frameCol
        this.ctx.fillRect(0, -armH / 2, armLen, armH)
        this.ctx.strokeStyle = edgeCol; this.ctx.lineWidth = 1.5
        this.ctx.strokeRect(0, -armH / 2, armLen, armH)
        // Claw/hand
        rrect(this.ctx, armLen - u * 0.1, -armH * 0.7, armH * 1.4, armH * 1.4, u * 0.22)
        this.ctx.fillStyle = `rgb(${Math.round(45 + bass * 22)},${Math.round(55 + mids * 18)},65)`; this.ctx.fill()
        this.ctx.strokeStyle = edgeCol; this.ctx.stroke()
        this.ctx.restore()
      }

      // ── Antenna ───────────────────────────────────────────────────────────────
      const antTipX = cx + Math.sin(this.antWiggle) * u * 2.2
      const antTipY = headY - u * 2.4
      this.ctx.strokeStyle = edgeCol; this.ctx.lineWidth = 2
      this.ctx.beginPath(); this.ctx.moveTo(cx, headY); this.ctx.lineTo(antTipX, antTipY); this.ctx.stroke()
      // Blinking LED
      const ledAlpha = Math.sin(time * 2.4) * 0.35 + 0.65
      this.ctx.beginPath(); this.ctx.arc(antTipX, antTipY, u * 0.22, 0, Math.PI * 2)
      this.ctx.fillStyle = triggers.beat ? `rgba(255,255,100,${ledAlpha})` : `rgba(0,220,180,${ledAlpha})`; this.ctx.fill()
      const ledGrd = this.ctx.createRadialGradient(antTipX, antTipY, 0, antTipX, antTipY, u * 1.1)
      ledGrd.addColorStop(0, `rgba(0,220,180,${ledAlpha * 0.5})`); ledGrd.addColorStop(1, 'rgba(0,0,0,0)')
      this.ctx.beginPath(); this.ctx.arc(antTipX, antTipY, u * 1.1, 0, Math.PI * 2); this.ctx.fillStyle = ledGrd; this.ctx.fill()

      // ── Effects ───────────────────────────────────────────────────────────────
      if (this.effects) {
        if (triggers.beat)     this.effects.triggerParticleBurst(cx, headY - u * 2, Math.floor(6 + triggers.energy * 14), triggers.energy * 0.8, '0,200,168')
        if (triggers.chaosHit) this.effects.triggerShockwave(cx, cy, triggers.energy)
        if (triggers.midsHit)  this.effects.triggerParticleBurst(cx, cy, Math.floor(4 + triggers.energy * 10), triggers.energy * 0.65, '80,255,200')
      }
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }
  return new CircuitBot()
}

export default circuitBotFactory

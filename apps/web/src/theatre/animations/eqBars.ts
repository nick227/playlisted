import { AnimationContext, IAnimation } from '../core/IAnimation'
import CanvasAnimation from '../core/CanvasAnimation'

const BARS       = 96
const GAP_RATIO  = 0.20
const BLUR_PX    = 10
const GLOW_ALPHA = 0.50
// Frequency range for the EQ display
const LOW_HZ  = 20
const HIGH_HZ = 18000

export function eqBarsFactory(): IAnimation {
  class EqBarsAnim extends CanvasAnimation {
    private freqBuf:  Uint8Array<ArrayBuffer> | null = null
    private smooth    = new Float32Array(BARS)
    private peaks     = new Float32Array(BARS)
    private peakVel   = new Float32Array(BARS)
    // Frequency-range per bar: average freqBuf[binStart..binEnd] inclusive
    private binStart  = new Uint16Array(BARS)
    private binEnd    = new Uint16Array(BARS)

    private offscreen: HTMLCanvasElement | null = null
    private offCtx:    CanvasRenderingContext2D | null = null

    private mainGrad: { h: number; grad: CanvasGradient } | null = null
    private glowGrad: { h: number; grad: CanvasGradient } | null = null

    // Layout cache — recalculated only when canvas size changes
    private layoutW = 0
    private layoutH = 0
    private barW    = 0
    private fillW   = 0
    private gapSide = 0
    private centerY = 0
    private maxHalf = 0

    // Beat ring state
    private ringPulse = 0  // 0→1, set to 1.0 on beat, decays per-frame
    private bassEnv   = 0  // smoothed bass energy for the steady ring

    constructor() {
      super({ defaultOpacity: 1.0, defaultZIndex: 101, defaultBlendMode: 'normal' })
    }

    async init(container: HTMLElement, context: AnimationContext) {
      await super.init(container, context)
      if (context.analyser) {
        this.freqBuf = new Uint8Array(context.analyser.frequencyBinCount)
        this.buildBinRanges(
          context.analyser.frequencyBinCount,
          context.analyser.context.sampleRate,
        )
      }
    }

    // Computes the inclusive [binStart, binEnd] range for each bar using a
    // true log scale from LOW_HZ to HIGH_HZ. Each bar averages all FFT bins
    // that fall in its frequency slice, which prevents dead bars in the highs
    // from reading a single poorly-energised bin.
    private buildBinRanges(binCount: number, sampleRate: number) {
      const hzPerBin = (sampleRate / 2) / binCount
      const logRange = Math.log(HIGH_HZ / LOW_HZ)

      for (let i = 0; i < BARS; i++) {
        const freq0 = LOW_HZ * Math.exp((i / BARS) * logRange)
        const freq1 = LOW_HZ * Math.exp(((i + 1) / BARS) * logRange)
        const b0 = Math.max(0, Math.floor(freq0 / hzPerBin))
        const b1 = Math.min(binCount - 1, Math.ceil(freq1 / hzPerBin) - 1)
        this.binStart[i] = b0
        this.binEnd[i]   = Math.max(b0, b1)  // guarantee end >= start
      }
    }

    private updateLayout(W: number, H: number) {
      if (W === this.layoutW && H === this.layoutH) return
      this.layoutW = W
      this.layoutH = H
      this.barW    = W / BARS
      this.fillW   = Math.max(1, this.barW * (1 - GAP_RATIO))
      this.gapSide = (this.barW - this.fillW) / 2
      this.centerY = H / 2
      // At amp=1.0 each half-bar reaches 48% of H → full bar fills ~96% of screen
      this.maxHalf = H * 0.48
      this.mainGrad = null
      this.glowGrad = null
      if (this.offscreen) {
        this.offscreen.width  = Math.ceil(W)
        this.offscreen.height = Math.ceil(H)
      }
    }

    private ensureOffscreen(W: number, H: number): CanvasRenderingContext2D {
      if (!this.offscreen) {
        this.offscreen = document.createElement('canvas')
        this.offCtx    = this.offscreen.getContext('2d')!
        this.offscreen.width  = Math.ceil(W)
        this.offscreen.height = Math.ceil(H)
      }
      return this.offCtx!
    }

    private makeGradient(ctx2d: CanvasRenderingContext2D, H: number): CanvasGradient {
      const g = ctx2d.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0,    '#8800ff')  // deep violet — bar tips
      g.addColorStop(0.35, '#00b8ff')  // electric blue
      g.addColorStop(0.5,  '#00f5d4')  // bright teal — center
      g.addColorStop(0.65, '#00b8ff')  // electric blue
      g.addColorStop(1,    '#8800ff')  // deep violet — bar tips
      return g
    }

    protected draw(context: AnimationContext) {
      const W = this.cssWidth
      const H = this.cssHeight
      if (!W || !H) return

      this.updateLayout(W, H)
      const { barW, fillW, gapSide, centerY, maxHalf } = this

      const c = this.ctx
      c.clearRect(0, 0, W, H)

      // Lazy init if analyser wasn't connected at init time
      if (!this.freqBuf && context.analyser) {
        this.freqBuf = new Uint8Array(context.analyser.frequencyBinCount)
        this.buildBinRanges(
          context.analyser.frequencyBinCount,
          context.analyser.context.sampleRate,
        )
      }
      if (context.analyser && this.freqBuf) {
        context.analyser.getByteFrequencyData(this.freqBuf)
      }

      const { freqBuf, binStart, binEnd, smooth, peaks, peakVel } = this

      // ── Per-bar amplitude, smoothing, peak hold ────────────────────────────
      // The shared AnalyserNode already applies smoothingTimeConstant=0.84, so
      // the raw[] values are pre-smoothed. We only add a light extra layer here:
      // instant attack (follow the signal up immediately) + gentle decay
      // so bars drop quickly but don't flicker on transients.
      for (let i = 0; i < BARS; i++) {
        let sum = 0
        const b0 = binStart[i], b1 = binEnd[i]
        if (freqBuf) {
          for (let j = b0; j <= b1; j++) sum += freqBuf[j]
        }
        const raw = freqBuf ? sum / ((b1 - b0 + 1) * 255) : 0

        const prev = smooth[i]
        smooth[i] = raw > prev
          ? prev * 0.05 + raw * 0.95   // near-instant attack
          : prev * 0.50 + raw * 0.50   // responsive decay

        const amp = smooth[i]
        if (amp >= peaks[i]) {
          peaks[i]   = amp
          peakVel[i] = 0
        } else {
          peakVel[i] = Math.min(0.018, peakVel[i] + 0.00025)
          peaks[i]   = Math.max(0, peaks[i] - peakVel[i])
        }
      }

      // ── Gradient (per context, rebuilt only on resize) ─────────────────────
      if (!this.mainGrad || this.mainGrad.h !== H) {
        this.mainGrad = { h: H, grad: this.makeGradient(c, H) }
      }

      // ── Glow pass: bars → offscreen → blur-composite onto main ─────────────
      const oc = this.ensureOffscreen(W, H)
      if (!this.glowGrad || this.glowGrad.h !== H) {
        this.glowGrad = { h: H, grad: this.makeGradient(oc, H) }
      }

      oc.clearRect(0, 0, W, H)
      oc.fillStyle = this.glowGrad.grad
      for (let i = 0; i < BARS; i++) {
        const amp = smooth[i]
        if (amp < 0.004) continue
        const halfH = amp * maxHalf
        oc.fillRect(i * barW + gapSide, centerY - halfH, fillW, halfH * 2)
      }

      c.save()
      c.filter      = `blur(${BLUR_PX}px)`
      c.globalAlpha = GLOW_ALPHA
      c.drawImage(this.offscreen!, 0, 0, W, H)
      c.restore()

      // ── Sharp bars ─────────────────────────────────────────────────────────
      c.fillStyle = this.mainGrad.grad
      for (let i = 0; i < BARS; i++) {
        const amp = smooth[i]
        if (amp < 0.004) continue
        const halfH = amp * maxHalf
        c.fillRect(i * barW + gapSide, centerY - halfH, fillW, halfH * 2)
      }

      // ── Peak hold markers (all lines in one batched path) ──────────────────
      c.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      c.lineWidth   = 1.5
      c.beginPath()
      for (let i = 0; i < BARS; i++) {
        const peak = peaks[i]
        if (peak < 0.010) continue
        const halfH = peak * maxHalf
        const x1 = i * barW + gapSide
        const x2 = x1 + fillW
        c.moveTo(x1, centerY - halfH)
        c.lineTo(x2, centerY - halfH)
        c.moveTo(x1, centerY + halfH)
        c.lineTo(x2, centerY + halfH)
      }
      c.stroke()

      // ── Center reference line ──────────────────────────────────────────────
      c.strokeStyle = 'rgba(0, 245, 212, 0.30)'
      c.lineWidth   = 1
      c.beginPath()
      c.moveTo(0, centerY)
      c.lineTo(W, centerY)
      c.stroke()

      // ── Beat ring ──────────────────────────────────────────────────────────
      // getTriggers fires beat/bassHit on every detected transient; we use
      // that to set ringPulse=1 and let it decay exponentially so the ring
      // expands outward and fades between beats.
      const triggers = context.shared?.getTriggers?.('tame') ?? null
      const features  = context.shared?.features

      if (triggers?.beat || triggers?.bassHit) this.ringPulse = 1.0
      else this.ringPulse = Math.max(0, this.ringPulse * 0.82)

      const rawBass = features?.bandEnv?.bass ?? features?.bands?.bass ?? 0
      this.bassEnv  = this.bassEnv * 0.65 + rawBass * 0.35

      const pulse   = this.ringPulse
      const bass    = this.bassEnv
      const cx      = W / 2
      const cy      = H / 2
      const minDim  = Math.min(W, H)
      const baseR   = minDim * 0.042

      c.save()

      // Outer beat ring: expands and fades with each pulse
      const beatR = baseR + pulse * minDim * 0.10 + bass * minDim * 0.022
      c.shadowColor = '#00f5d4'
      c.shadowBlur  = 6 + pulse * 22
      c.beginPath()
      c.arc(cx, cy, beatR, 0, Math.PI * 2)
      c.strokeStyle = `rgba(0, 245, 212, ${0.12 + pulse * 0.78})`
      c.lineWidth   = 1.5 + pulse * 3.5
      c.stroke()

      // Steady bass ring: always present when music is playing, violet
      if (bass > 0.03) {
        const bassR = baseR * (0.58 + bass * 0.48)
        c.shadowColor = '#8800ff'
        c.shadowBlur  = 4 + bass * 12
        c.beginPath()
        c.arc(cx, cy, bassR, 0, Math.PI * 2)
        c.strokeStyle = `rgba(136, 0, 255, ${0.18 + bass * 0.55})`
        c.lineWidth   = 1.5
        c.stroke()
      }

      // Core dot: bright center that flashes on beat
      const coreR = baseR * (0.28 + bass * 0.28 + pulse * 0.44)
      if (coreR > 1) {
        c.shadowColor = '#00f5d4'
        c.shadowBlur  = 8 + pulse * 18
        c.beginPath()
        c.arc(cx, cy, coreR, 0, Math.PI * 2)
        c.fillStyle   = `rgba(0, 245, 212, ${0.45 + pulse * 0.50})`
        c.fill()
      }

      c.restore()
    }

    destroy() {
      super.destroy()
      this.offscreen = null
      this.offCtx    = null
    }
  }

  return new EqBarsAnim()
}

export default eqBarsFactory

import type { PaletteColors } from './palettes'

const BARS = 32
const LOW_HZ = 40
const HIGH_HZ = 14000
const GAP_RATIO = 0.22

export type EqWaveState = {
  smooth: Float32Array
  peaks: Float32Array
  binStart: Uint16Array
  binEnd: Uint16Array
  bassEnv: number
  midsEnv: number
  ringPulse: number
  layoutW: number
  layoutH: number
  barW: number
  fillW: number
  gapSide: number
  centerY: number
  maxHalf: number
  binsReady: boolean
}

export function createEqWaveState(): EqWaveState {
  return {
    smooth: new Float32Array(BARS),
    peaks: new Float32Array(BARS),
    binStart: new Uint16Array(BARS),
    binEnd: new Uint16Array(BARS),
    bassEnv: 0,
    midsEnv: 0,
    ringPulse: 0,
    layoutW: 0,
    layoutH: 0,
    barW: 0,
    fillW: 0,
    gapSide: 0,
    centerY: 0,
    maxHalf: 0,
    binsReady: false,
  }
}

function buildBinRanges(state: EqWaveState, binCount: number, sampleRate: number) {
  const hzPerBin = (sampleRate / 2) / binCount
  const logRange = Math.log(HIGH_HZ / LOW_HZ)
  for (let i = 0; i < BARS; i++) {
    const freq0 = LOW_HZ * Math.exp((i / BARS) * logRange)
    const freq1 = LOW_HZ * Math.exp(((i + 1) / BARS) * logRange)
    const b0 = Math.max(0, Math.floor(freq0 / hzPerBin))
    const b1 = Math.min(binCount - 1, Math.ceil(freq1 / hzPerBin) - 1)
    state.binStart[i] = b0
    state.binEnd[i] = Math.max(b0, b1)
  }
  state.binsReady = true
}

function updateLayout(state: EqWaveState, w: number, h: number) {
  if (w === state.layoutW && h === state.layoutH) return
  state.layoutW = w
  state.layoutH = h
  state.barW = w / BARS
  state.fillW = Math.max(1, state.barW * (1 - GAP_RATIO))
  state.gapSide = (state.barW - state.fillW) / 2
  state.centerY = h * 0.82
  state.maxHalf = h * 0.2
}

function syntheticBar(time: number, index: number): number {
  const t = time * 0.001
  return Math.abs(
    Math.sin(t * 2.4 + index * 0.35) * 0.35
    + Math.sin(t * 4.1 + index * 0.18) * 0.22
    + Math.sin(t * 1.1) * 0.12,
  )
}

export type EqWaveUpdate = {
  time: number
  bass: number
  mids: number
  beat: boolean
  bassHit: boolean
}

export function updateEqWave(
  state: EqWaveState,
  analyser: AnalyserNode | null | undefined,
  freqBuf: Uint8Array<ArrayBuffer> | null,
  input: EqWaveUpdate,
) {
  if (analyser && freqBuf && !state.binsReady) {
    buildBinRanges(state, analyser.frequencyBinCount, analyser.context.sampleRate)
  }
  if (analyser && freqBuf) {
    analyser.getByteFrequencyData(freqBuf)
  }

  let bassSum = 0
  let midSum = 0
  for (let i = 0; i < BARS; i++) {
    let raw = 0
    if (freqBuf && state.binsReady) {
      const b0 = state.binStart[i]!
      const b1 = state.binEnd[i]!
      let sum = 0
      for (let j = b0; j <= b1; j++) sum += freqBuf[j]!
      raw = sum / ((b1 - b0 + 1) * 255)
      if (i < BARS * 0.28) bassSum += raw
      else if (i < BARS * 0.62) midSum += raw
    } else {
      raw = syntheticBar(input.time, i)
      if (i < BARS * 0.28) bassSum += raw
      else if (i < BARS * 0.62) midSum += raw
    }

    const prev = state.smooth[i]!
    state.smooth[i] = raw > prev ? prev * 0.08 + raw * 0.92 : prev * 0.55 + raw * 0.45
    state.peaks[i] = Math.max(state.peaks[i]! * 0.96, state.smooth[i]!)
  }

  const bassSlice = Math.max(1, Math.floor(BARS * 0.28))
  const midSlice = Math.max(1, Math.floor(BARS * 0.34))
  const measuredBass = bassSum / bassSlice
  const measuredMids = midSum / midSlice

  state.bassEnv = state.bassEnv * 0.7 + (freqBuf ? measuredBass : input.bass) * 0.3
  state.midsEnv = state.midsEnv * 0.72 + (freqBuf ? measuredMids : input.mids) * 0.28

  if (input.beat || input.bassHit) state.ringPulse = 1
  else state.ringPulse = Math.max(0, state.ringPulse * 0.84)
}

/** Shared breathe multiplier for all stickers on the scene. */
export function collectiveEqPulse(state: EqWaveState): number {
  return 1 + state.bassEnv * 0.28 + state.midsEnv * 0.1 + state.ringPulse * 0.14
}

export function collectiveEqSpinBoost(state: EqWaveState, beat: boolean): number {
  return beat ? 1.8 + state.ringPulse * 2.2 : 1 + state.bassEnv * 0.6
}

type EqDrawOpts = { alpha?: number; reducedMotion?: boolean }

export function drawEqWave(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: EqWaveState,
  palette: PaletteColors,
  opts: EqDrawOpts = {},
) {
  if (w === 0 || h === 0) return
  updateLayout(state, w, h)

  const alpha = opts.alpha ?? 0.72
  const { centerY, maxHalf, barW, fillW, gapSide } = state
  const cx = w / 2

  const grad = ctx.createLinearGradient(0, centerY - maxHalf, 0, centerY + maxHalf)
  grad.addColorStop(0, palette.fill[0]!)
  grad.addColorStop(0.42, palette.accent)
  grad.addColorStop(0.58, palette.accent)
  grad.addColorStop(1, palette.fill[1] ?? palette.fill[0]!)

  ctx.save()
  ctx.globalAlpha = alpha

  ctx.fillStyle = grad
  for (let i = 0; i < BARS; i++) {
    const amp = state.smooth[i]!
    if (amp < 0.01) continue
    const halfH = amp * maxHalf
    ctx.fillRect(i * barW + gapSide, centerY - halfH, fillW, halfH * 2)
  }

  ctx.strokeStyle = `rgba(255,255,255,${0.35 + state.ringPulse * 0.35})`
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < BARS; i++) {
    const peak = state.peaks[i]!
    if (peak < 0.02) continue
    const halfH = peak * maxHalf
    const x1 = i * barW + gapSide
    const x2 = x1 + fillW
    ctx.moveTo(x1, centerY - halfH)
    ctx.lineTo(x2, centerY - halfH)
    ctx.moveTo(x1, centerY + halfH)
    ctx.lineTo(x2, centerY + halfH)
  }
  ctx.stroke()

  const minDim = Math.min(w, h)
  const baseR = minDim * 0.05
  const pulse = state.ringPulse
  const bass = state.bassEnv

  if (pulse > 0.04) {
    const beatR = baseR + pulse * minDim * 0.11
    ctx.beginPath()
    ctx.arc(cx, centerY, beatR, 0, Math.PI * 2)
    ctx.strokeStyle = palette.accent
    ctx.globalAlpha = alpha * (0.15 + pulse * 0.55)
    ctx.lineWidth = 2 + pulse * 3
    ctx.stroke()
  }

  if (bass > 0.04) {
    const bassR = baseR * (0.65 + bass * 0.55)
    ctx.beginPath()
    ctx.arc(cx, centerY, bassR, 0, Math.PI * 2)
    ctx.strokeStyle = palette.fill[2] ?? palette.accent
    ctx.globalAlpha = alpha * (0.12 + bass * 0.4)
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.strokeStyle = palette.accent
  ctx.globalAlpha = alpha * 0.25
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(w, centerY)
  ctx.stroke()

  ctx.restore()
}

import type { PaletteColors } from './palettes'
import { hexToRgb } from './paletteRgb'

export type MacroEffectState = {
  pulse: number
  vignette: number
  zoom: number
}

export function createMacroEffectState(): MacroEffectState {
  return { pulse: 0, vignette: 0, zoom: 0 }
}

export function decayMacroState(state: MacroEffectState, delta: number): MacroEffectState {
  const d = delta * 0.0035
  return {
    pulse: Math.max(0, state.pulse - d * 1.4),
    vignette: Math.max(0, state.vignette - d * 0.9),
    zoom: Math.max(0, state.zoom - d * 1.8),
  }
}

export function bumpMacroState(
  state: MacroEffectState,
  pulse: number,
  vignette: number,
  zoom: number,
): MacroEffectState {
  return {
    pulse: Math.min(1, Math.max(state.pulse, pulse)),
    vignette: Math.min(1, Math.max(state.vignette, vignette)),
    zoom: Math.min(1, Math.max(state.zoom, zoom)),
  }
}

export function drawMacroPulseRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  state: MacroEffectState,
  palette: PaletteColors,
  time: number,
) {
  if (state.pulse < 0.03) return
  const rgb = hexToRgb(palette.accent)
  const baseR = Math.min(w, h) * (0.15 + state.pulse * 0.45)
  const rings = 3
  for (let i = 0; i < rings; i++) {
    const phase = (time * 0.004 + i * 0.33) % 1
    const r = baseR * (0.6 + phase * 0.9)
    const alpha = state.pulse * (1 - phase) * 0.55
    if (alpha < 0.02) continue
    ctx.strokeStyle = `rgba(${rgb},${alpha})`
    ctx.lineWidth = 3 + state.pulse * 10 * (1 - phase)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export function drawMacroVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: MacroEffectState,
  palette: PaletteColors,
) {
  if (state.vignette < 0.03) return
  const cx = w / 2
  const cy = h / 2
  const rgb = hexToRgb(palette.fill[0] ?? palette.accent)
  const g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.15, cx, cy, Math.max(w, h) * 0.72)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.55, `rgba(${rgb},${state.vignette * 0.08})`)
  g.addColorStop(1, `rgba(0,0,0,${state.vignette * 0.55})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function drawMacroFlash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: MacroEffectState,
  palette: PaletteColors,
) {
  const flash = state.pulse * 0.25 + state.zoom * 0.35
  if (flash < 0.04) return
  const rgb = hexToRgb(palette.accent)
  ctx.fillStyle = `rgba(${rgb},${flash * 0.22})`
  ctx.fillRect(0, 0, w, h)
}

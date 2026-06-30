import type { PalettePreset } from './types'

export type PaletteColors = { bg: string[]; fill: string[]; stroke: string; accent: string }

const PALETTES: Record<PalettePreset, PaletteColors> = {
  candy: { bg: ['#ff6bcb', '#6bffb8', '#ffd36b'], fill: ['#ff3d9a', '#3dffc8', '#ff9a3d', '#9a3dff'], stroke: '#ffffff', accent: '#fff59d' },
  toxic: { bg: ['#1a2f0a', '#3d5c0a', '#0a1f00'], fill: ['#7fff00', '#adff2f', '#32cd32', '#9acd32'], stroke: '#ccff00', accent: '#ff00ff' },
  midnight: { bg: ['#0a0a1a', '#12122a', '#1a1a3a'], fill: ['#4a6fa5', '#6b8cae', '#8ba4c4', '#2c3e6b'], stroke: '#a8c0e0', accent: '#e0e8ff' },
  sunset: { bg: ['#ff6b35', '#f7931e', '#c73e1d'], fill: ['#ff9a56', '#ffb347', '#ff6b6b', '#ffd93d'], stroke: '#fff5e6', accent: '#ffecd2' },
  monoChrome: { bg: ['#1a1a1a', '#2d2d2d', '#404040'], fill: ['#ffffff', '#cccccc', '#999999', '#666666'], stroke: '#ffffff', accent: '#eeeeee' },
  acid: { bg: ['#ff00ff', '#00ffff', '#ffff00'], fill: ['#ff0080', '#80ff00', '#0080ff', '#ff8000'], stroke: '#000000', accent: '#ffffff' },
  pastel: { bg: ['#ffd6e8', '#d6e8ff', '#e8ffd6'], fill: ['#ffb3d9', '#b3d9ff', '#d9ffb3', '#ffd9b3'], stroke: '#666688', accent: '#ffffff' },
  poster: { bg: ['#e63946', '#1d3557', '#f4a261'], fill: ['#e63946', '#2a9d8f', '#e9c46a', '#264653'], stroke: '#000000', accent: '#ffffff' },
  chrome: { bg: ['#2b2d42', '#3d405b', '#4a4e69'], fill: ['#c0c0c0', '#a8a8a8', '#d4d4d4', '#909090'], stroke: '#ffffff', accent: '#00d4ff' },
  horror: { bg: ['#1a0000', '#2d0a0a', '#0a0000'], fill: ['#8b0000', '#4a0000', '#cc2222', '#330000'], stroke: '#ff4444', accent: '#ff0000' },
}

export function getPalette(preset: PalettePreset): PaletteColors {
  return PALETTES[preset]
}

export function pickObjectColor(palette: PaletteColors, index: number): string {
  return palette.fill[index % palette.fill.length]!
}

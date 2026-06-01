/** Venue basement palette — flat fills, no per-frame allocation. */
export const palette = {
  void: '#08080c',
  floor: '#211e2a',
  floorLine: '#3e3848',
  floorSheen: '#2e2a38',
  ceiling: '#161220',
  wall: '#2e2840',
  wallDark: '#1c1828',
  wallLight: '#3c3458',
  // Back wall: clearly lighter than everything else so silhouettes read
  backWall: '#3a3254',
  backWallLit: '#4a4268',
  stage: '#28223c',
  stageEdge: '#c48a3a',
  stageLight: '#3a3040',
  ceilingBar: '#6a6080',
  ceilingBarGlow: '#9080b0',
  amber: '#c48a3a',
  amberDim: '#7a6038',
  amberBright: '#e8b050',
  magenta: '#a03878',
  magentaDim: '#602040',
  cyanLeak: '#3a7888',
  grime: 'rgba(40,32,28,0.55)',
  smoke: 'rgba(90,80,100,0.22)',
  // Figures: very dark silhouettes — readable against backWall
  figure: '#100c18',
  figureEdge: '#4a4268',
  bottle: '#1a2e3c',
  bottleHighlight: '#5a7888',
  // Speakers: dark but clearly shaped, cone is lighter
  speaker: '#1e1a2c',
  speakerCone: '#4a4060',
  speakerRing: '#3a3050',
  strobe: '#f0e8ff',
  phrase: '#d8c8b8',
  faceFill: '#221820',
  faceLine: '#7a6878',
  door: '#1c1824',
  doorFrame: '#4a4060',
  doorGlow: 'rgba(200,140,60,0.55)',
} as const

export type SceneKey = 'bandStage' | 'bar' | 'danceFloor' | 'conversation' | 'hallwayCrowd'

/** Per-scene accent colors for stage lights, tints, and atmosphere overlays. */
export const scenePalettes: Record<SceneKey, { ambient: string; accent: string; fog: string; strobe: string }> = {
  bandStage:    { ambient: 'rgba(196,138,58,0.18)',  accent: '#c48a3a', fog: 'rgba(80,40,20,0.12)',  strobe: '#fffbe0' },
  bar:          { ambient: 'rgba(58,106,120,0.14)',  accent: '#3a6a78', fog: 'rgba(20,40,50,0.10)',  strobe: '#d0eaf0' },
  danceFloor:   { ambient: 'rgba(138,56,104,0.20)',  accent: '#8a3868', fog: 'rgba(60,10,50,0.15)',  strobe: '#f0d0ff' },
  conversation: { ambient: 'rgba(104,88,100,0.12)',  accent: '#c8b8a8', fog: 'rgba(30,20,30,0.08)',  strobe: '#e8ddd8' },
  hallwayCrowd: { ambient: 'rgba(30,26,34,0.10)',    accent: '#3a3040', fog: 'rgba(10,8,16,0.18)',   strobe: '#c8c0d0' },
}

/** VoidBloom collapse palette — inverted, bleached, wrong. */
export const voidBloomPalette = {
  flash:   'rgba(255,240,255,0.85)',
  smear:   'rgba(180,100,200,0.55)',
  invert:  'rgba(20,240,200,0.22)',
  collapse: 'rgba(0,0,0,0.92)',
}

/** Passage corridor accent — desaturated, dim, forward-pulling. */
export const passagePalette = {
  fog:   'rgba(60,50,70,0.28)',
  light: 'rgba(120,100,140,0.18)',
  edge:  '#2a2038',
}

/**
 * Cubic ease-in-out for blending between two scene palettes during passage.
 * Input t should be 0→1 across the passage phase duration.
 */
export function passageBlend(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Returns an rgba overlay string for the scene's ambient tint,
 * scaled by a 0–1 intensity value (no allocation — reuses template literals).
 */
export function sceneAmbient(scene: SceneKey, alpha: number): string {
  const sp = scenePalettes[scene]
  // Parse the rgba alpha component and multiply
  const m = sp.ambient.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/)
  if (!m) return sp.ambient
  const a = Math.min(1, parseFloat(m[4]) * alpha * 5).toFixed(2)
  return `rgba(${m[1]},${m[2]},${m[3]},${a})`
}

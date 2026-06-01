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
  bandStage:    { ambient: 'rgba(196,138,58,0.22)',  accent: '#c48a3a', fog: 'rgba(80,40,20,0.15)',  strobe: '#fffbe0' },
  bar:          { ambient: 'rgba(30,80,60,0.22)',    accent: '#2a6040', fog: 'rgba(10,30,20,0.18)',  strobe: '#c0e8d0' },
  danceFloor:   { ambient: 'rgba(160,20,100,0.28)',  accent: '#c01870', fog: 'rgba(80,0,60,0.22)',   strobe: '#ff80e0' },
  conversation: { ambient: 'rgba(160,120,60,0.20)',  accent: '#a07838', fog: 'rgba(60,40,10,0.15)',  strobe: '#f8e8c8' },
  hallwayCrowd: { ambient: 'rgba(40,40,80,0.18)',    accent: '#303860', fog: 'rgba(10,10,30,0.20)',  strobe: '#b0b8d8' },
}

/**
 * Per-scene structural colors — back wall, floor tiles, side-wall patterns, ceiling.
 * These drive the geometry colors of each scene type, not just the post-render tint.
 * Each scene should be immediately identifiable from its room structure alone.
 */
export const sceneStructure: Record<SceneKey, {
  backWall:     string   // back wall base (silhouettes read against this)
  backWallLit:  string   // inner lit stage area
  wallBase:     string   // side wall base fill
  floorAccent:  string   // floor tile / line accent color
  wallBody:     string   // wall pattern body (pipes, slats, bricks, strips)
  wallHi:       string   // wall pattern highlight edge
  ceilBody:     string   // ceiling pattern body
  ceilGlow:     string   // ceiling pattern glow/highlight
}> = {
  // Concert hall: warm amber on deep purple — stage-lit, industrial hardware
  bandStage: {
    backWall:    '#3a3254', backWallLit: '#4e4470',
    wallBase:    '#1c1828',
    floorAccent: '#8a6c3a',
    wallBody:    '#3c3458', wallHi: '#7a6888',
    ceilBody:    '#6a6080', ceilGlow: '#9a88b8',
  },
  // Dive bar: dark bottle-green, teal shadows, tungsten warmth
  bar: {
    backWall:    '#1c2e28', backWallLit: '#2c4038',
    wallBase:    '#141e18',
    floorAccent: '#1a3820',
    wallBody:    '#1e3028', wallHi: '#2e4a38',
    ceilBody:    '#202818', ceilGlow: '#384028',
  },
  // Club: deep UV magenta-purple, electric, synthetic
  danceFloor: {
    backWall:    '#280c3a', backWallLit: '#3c1458',
    wallBase:    '#180820',
    floorAccent: '#a00858',
    wallBody:    '#1e0830', wallHi: '#5a1080',
    ceilBody:    '#7a2898', ceilGlow: '#b840e0',
  },
  // Intimate room: warm sepia-brown, tungsten lamplight, wood and felt
  conversation: {
    backWall:    '#382818', backWallLit: '#4e3828',
    wallBase:    '#201408',
    floorAccent: '#503820',
    wallBody:    '#2e2018', wallHi: '#5e4030',
    ceilBody:    '#281c10', ceilGlow: '#5e4828',
  },
  // Industrial corridor: cold blue-grey concrete, clinical, watching
  hallwayCrowd: {
    backWall:    '#282840', backWallLit: '#383858',
    wallBase:    '#181828',
    floorAccent: '#383860',
    wallBody:    '#282840', wallHi: '#484868',
    ceilBody:    '#505070', ceilGlow: '#8080a0',
  },
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

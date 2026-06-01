import type { LiminalRenderer } from './renderer'
import { palette } from './palette'
import type { SceneType } from './types'
import { hash01 } from './types'

export type FloorPattern = 'grid' | 'checkerboard' | 'stripes' | 'solid'

export const SCENE_FLOOR_MAPPING: Record<SceneType, FloorPattern> = {
  bandStage:    'grid',
  bar:          'stripes',
  danceFloor:   'checkerboard',
  conversation: 'solid',
  hallwayCrowd: 'grid',
}

// Scene-specific floor accent colors — drawn on top of the base floor color.
const FLOOR_ACCENT: Partial<Record<SceneType, string>> = {
  bandStage:    palette.amberDim,       // warm amber grid for stage floor
  danceFloor:   palette.magentaDim,     // magenta checker tiles
  hallwayCrowd: palette.wallLight,      // cool gray grid — clinical, watching
  bar:          palette.wallDark,       // dark stripes, grimy bar floor
}

/**
 * Procedural perspective floor tile generator.
 * z-coords use quadratic scaling for natural depth compression.
 */
export function queueFloorTiles(
  renderer: LiminalRenderer,
  pattern: FloorPattern,
  w: number,
  h: number,
  backL: number,
  backR: number,
  backBot: number,
  sceneType?: SceneType,
  seed = 0,
): void {
  if (pattern === 'solid') return

  const accent = (sceneType && FLOOR_ACCENT[sceneType]) ?? palette.wallLight
  const steps    = 6
  const segments = 6

  // Row y-coordinates — quadratic so near rows are wider (natural perspective)
  const rowY: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = Math.pow(i / steps, 2.0)
    rowY.push(backBot + (h - backBot) * t)
  }

  // Helper: x-coords for a given y (linear interpolation from back wall to screen edge)
  function rowX(y: number): { left: number; right: number } {
    const t = (y - backBot) / (h - backBot)
    return {
      left:  backL + (0    - backL) * t,
      right: backR + (w    - backR) * t,
    }
  }

  if (pattern === 'grid') {
    // Perspective receding grid — lines are more visible than filled cells

    // Horizontal lines (row boundaries) — weight varies per row
    for (let j = 1; j < steps; j++) {
      const y    = rowY[j]
      const { left, right } = rowX(y)
      const lineH = Math.max(0.8, (rowY[j + 1] - y) * (0.06 + hash01(seed, 20 + j) * 0.06))
      renderer.pushShellQuad(0.012 + j * 0.001, [
        [left,  y],
        [right, y],
        [right, y + lineH],
        [left,  y + lineH],
      ], accent)
    }

    // Vertical fan lines — weight varies per column
    for (let i = 1; i < segments; i++) {
      const t    = i / segments
      const bx   = backL + (backR - backL) * t
      const fx   = w * t
      const lineW = 1.0 + hash01(seed, 30 + i) * 1.2   // 1–2.2px
      renderer.pushShellQuad(0.013, [
        [bx - lineW * 0.4, backBot],
        [bx + lineW * 0.6, backBot],
        [fx + lineW,       h],
        [fx,               h],
      ], accent)
    }

  } else if (pattern === 'checkerboard') {
    // Alternating filled tiles — dark tile is the base floor, light tile is the accent
    for (let j = 0; j < steps; j++) {
      const y0 = rowY[j]
      const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = rowX(y0)
      const { left: xl1, right: xr1 } = rowX(y1)

      for (let i = 0; i < segments; i++) {
        if ((i + j) % 2 !== 0) continue   // only draw the accent tiles

        const f0 = i / segments
        const f1 = (i + 1) / segments
        const p0: [number, number] = [xl0 + (xr0 - xl0) * f0, y0]
        const p1: [number, number] = [xl0 + (xr0 - xl0) * f1, y0]
        const p2: [number, number] = [xl1 + (xr1 - xl1) * f1, y1]
        const p3: [number, number] = [xl1 + (xr1 - xl1) * f0, y1]
        // 1px inset so base tile shows as grout line
        renderer.pushShellQuad(0.012 + j * 0.001, [
          [p0[0] + 1, p0[1] + 1],
          [p1[0] - 1, p1[1] + 1],
          [p2[0] - 1, p2[1] - 1],
          [p3[0] + 1, p3[1] - 1],
        ], accent)
      }
    }

  } else if (pattern === 'stripes') {
    // Alternating wide horizontal bands — bar floor, slightly grimy
    for (let j = 0; j < steps; j += 2) {
      if (j + 1 > steps) break
      const y0 = rowY[j]
      const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = rowX(y0)
      const { left: xl1, right: xr1 } = rowX(y1)
      renderer.pushShellQuad(0.012 + j * 0.001, [
        [xl0, y0], [xr0, y0], [xr1, y1], [xl1, y1],
      ], accent)
    }

    // Thin highlight at the junction of each stripe pair — gives grimy tile feel
    for (let j = 1; j < steps; j++) {
      const y   = rowY[j]
      const { left, right } = rowX(y)
      renderer.pushShellQuad(0.013, [
        [left, y - 0.5], [right, y - 0.5],
        [right, y + 1],  [left,  y + 1],
      ], palette.floorLine)
    }
  }
}

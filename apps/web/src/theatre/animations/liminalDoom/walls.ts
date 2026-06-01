import type { LiminalRenderer } from './renderer'
import { palette } from './palette'
import type { SceneType } from './types'
import { hash01 } from './types'

export type WallPattern = 'brick' | 'paneling' | 'pipes' | 'solid'

export const SCENE_WALL_MAPPING: Record<SceneType, WallPattern> = {
  bandStage:    'pipes',
  bar:          'paneling',
  danceFloor:   'solid',
  conversation: 'solid',
  hallwayCrowd: 'brick',
}

/**
 * Procedural side-wall pattern generator.
 * Left wall: x 0→backL.  Right wall: x backR→w.
 */
export function queueWallPatterns(
  renderer: LiminalRenderer,
  pattern: WallPattern,
  w: number,
  _h: number,
  backL: number,
  backR: number,
  backTop: number,
  backBot: number,
  seed = 0,
): void {
  if (pattern === 'solid') return

  const bh = backBot - backTop

  if (pattern === 'pipes') {
    // Two pipe runs — heights vary per room within sensible ranges
    const pipeRuns = [
      {
        yFrac:     0.22 + hash01(seed, 80) * 0.14,   // upper: 22–36%
        h:         Math.max(4, bh * (0.035 + hash01(seed, 81) * 0.02)),
        highlight: palette.ceilingBar,
      },
      {
        yFrac:     0.58 + hash01(seed, 82) * 0.14,   // lower: 58–72%
        h:         Math.max(6, bh * (0.055 + hash01(seed, 83) * 0.025)),
        highlight: palette.wallLight,
      },
    ]

    for (const run of pipeRuns) {
      const py = backTop + bh * run.yFrac
      const ph = run.h

      // Left wall pipe body
      renderer.pushShellQuad(0.032, [
        [0, py], [backL, py], [backL, py + ph], [0, py + ph],
      ], palette.wallLight)
      // Left pipe top highlight
      renderer.pushShellQuad(0.033, [
        [0, py], [backL, py], [backL, py + ph * 0.22], [0, py + ph * 0.22],
      ], run.highlight)

      // Right wall pipe body
      renderer.pushShellQuad(0.032, [
        [backR, py], [w, py], [w, py + ph], [backR, py + ph],
      ], palette.wallLight)
      // Right pipe top highlight
      renderer.pushShellQuad(0.033, [
        [backR, py], [w, py], [w, py + ph * 0.22], [backR, py + ph * 0.22],
      ], run.highlight)

      // Elbow connectors — small squares where pipe meets the wall corner
      const elbowW = ph * 1.4
      const elbowH = ph * 1.4
      // Left elbow at backL
      renderer.pushShellQuad(0.034, [
        [backL - elbowW, py - elbowH * 0.2],
        [backL,          py - elbowH * 0.2],
        [backL,          py + ph + elbowH * 0.2],
        [backL - elbowW, py + ph + elbowH * 0.2],
      ], run.highlight)
      // Right elbow at backR
      renderer.pushShellQuad(0.034, [
        [backR,          py - elbowH * 0.2],
        [backR + elbowW, py - elbowH * 0.2],
        [backR + elbowW, py + ph + elbowH * 0.2],
        [backR,          py + ph + elbowH * 0.2],
      ], run.highlight)
    }

  } else if (pattern === 'paneling') {
    // Slat count varies 4–7 per room
    const slatCount = 4 + Math.floor(hash01(seed, 84) * 4)
    const slatW     = 2.5 + hash01(seed, 85) * 2.0   // width 2.5–4.5px

    for (let i = 1; i < slatCount; i++) {
      const fL = i / slatCount
      const fR = i / slatCount
      const lx = backL * fL
      const rx = backR + (w - backR) * fR

      // Left wall slat
      renderer.pushShellQuad(0.033, [
        [lx - slatW, backTop], [lx + slatW, backTop],
        [lx + slatW, backBot], [lx - slatW, backBot],
      ], palette.wallLight)
      // Left slat right-edge highlight (gives depth to the panel)
      renderer.pushShellQuad(0.034, [
        [lx + slatW * 0.3, backTop], [lx + slatW, backTop],
        [lx + slatW,       backBot], [lx + slatW * 0.3, backBot],
      ], palette.ceilingBar)

      // Right wall slat
      renderer.pushShellQuad(0.033, [
        [rx - slatW, backTop], [rx + slatW, backTop],
        [rx + slatW, backBot], [rx - slatW, backBot],
      ], palette.wallLight)
      // Right slat right-edge highlight
      renderer.pushShellQuad(0.034, [
        [rx + slatW * 0.3, backTop], [rx + slatW, backTop],
        [rx + slatW,       backBot], [rx + slatW * 0.3, backBot],
      ], palette.ceilingBar)
    }

    // Horizontal chair rail halfway up — classic bar trim
    const railY  = backTop + bh * 0.52
    const railH  = Math.max(3, bh * 0.025)
    renderer.pushShellQuad(0.035, [
      [0, railY], [backL, railY], [backL, railY + railH], [0, railY + railH],
    ], palette.amberDim)
    renderer.pushShellQuad(0.035, [
      [backR, railY], [w, railY], [w, railY + railH], [backR, railY + railH],
    ], palette.amberDim)

  } else if (pattern === 'brick') {
    // Row count varies 6–9 per room
    const rows  = 6 + Math.floor(hash01(seed, 86) * 4)
    const colsL = 2 + Math.floor(hash01(seed, 87) * 2)   // 2–3 columns
    const colsR = colsL
    const rowH  = bh / rows
    const mortar = 2

    for (let r = 0; r < rows; r++) {
      const y0 = backTop + r * rowH
      const y1 = y0 + rowH - mortar
      const offset = (r % 2) * 0.5  // stagger alternate rows

      // Left wall bricks
      const colWL = backL / colsL
      for (let c = 0; c < colsL; c++) {
        const brickLeft  = (c + offset) * colWL
        const brickRight = Math.min(backL, brickLeft + colWL - mortar)
        if (brickRight <= brickLeft) continue
        renderer.pushShellQuad(0.031, [
          [brickLeft, y0], [brickRight, y0],
          [brickRight, y1], [brickLeft, y1],
        ], palette.wallLight)
        // Top-edge highlight on brick face
        renderer.pushShellQuad(0.032, [
          [brickLeft, y0], [brickRight, y0],
          [brickRight, y0 + 2], [brickLeft, y0 + 2],
        ], palette.ceilingBar)
      }

      // Right wall bricks
      const colWR = (w - backR) / colsR
      for (let c = 0; c < colsR; c++) {
        const brickLeft  = backR + (c + offset) * colWR
        const brickRight = Math.min(w, brickLeft + colWR - mortar)
        if (brickRight <= brickLeft) continue
        renderer.pushShellQuad(0.031, [
          [brickLeft, y0], [brickRight, y0],
          [brickRight, y1], [brickLeft, y1],
        ], palette.wallLight)
        renderer.pushShellQuad(0.032, [
          [brickLeft, y0], [brickRight, y0],
          [brickRight, y0 + 2], [brickLeft, y0 + 2],
        ], palette.ceilingBar)
      }
    }
  }
}

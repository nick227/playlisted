import type { LiminalRenderer } from '../render/renderer'
import { palette, sceneStructure } from '../core/palette'
import type { SceneKey } from '../core/palette'
import type { SceneType } from '../core/types'
import { hash01 } from '../core/math'

export type WallPattern = 'brick' | 'paneling' | 'pipes' | 'wallpaper' | 'panels' | 'solid'

export const SCENE_WALL_VARIANTS: Record<SceneType, WallPattern[]> = {
  bandStage:    ['pipes'],
  bar:          ['paneling'],
  danceFloor:   ['panels', 'panels'],   // always panels — clubs always have them
  conversation: ['wallpaper'],
  hallwayCrowd: ['brick'],
}

const VARIANT_SALT = 251

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
  sceneType?: SceneType,
): void {
  if (pattern === 'solid') return

  const sc  = sceneType ? sceneStructure[sceneType as SceneKey] : null
  const body = sc?.wallBody ?? palette.wallLight
  const hi   = sc?.wallHi   ?? palette.ceilingBar
  const bh   = backBot - backTop

  if (pattern === 'pipes') {
    // Industrial conduit pipes — band stage.
    const runs = [
      { yFrac: 0.22 + hash01(seed, 80) * 0.14, thick: Math.max(4, bh * (0.035 + hash01(seed, 81) * 0.02)) },
      { yFrac: 0.58 + hash01(seed, 82) * 0.14, thick: Math.max(6, bh * (0.055 + hash01(seed, 83) * 0.025)) },
    ]
    for (const run of runs) {
      const py = backTop + bh * run.yFrac
      const ph = run.thick
      // Left pipe body + highlight
      renderer.pushShellQuad(0.032, [[0, py], [backL, py], [backL, py + ph], [0, py + ph]], body)
      renderer.pushShellQuad(0.033, [[0, py], [backL, py], [backL, py + ph * 0.22], [0, py + ph * 0.22]], hi)
      // Right pipe body + highlight
      renderer.pushShellQuad(0.032, [[backR, py], [w, py], [w, py + ph], [backR, py + ph]], body)
      renderer.pushShellQuad(0.033, [[backR, py], [w, py], [w, py + ph * 0.22], [backR, py + ph * 0.22]], hi)
      // Elbow connectors at wall-junction
      const ew = ph * 1.4; const eh = ph * 1.4
      renderer.pushShellQuad(0.034, [
        [backL - ew, py - eh * 0.2], [backL, py - eh * 0.2],
        [backL, py + ph + eh * 0.2], [backL - ew, py + ph + eh * 0.2],
      ], hi)
      renderer.pushShellQuad(0.034, [
        [backR, py - eh * 0.2], [backR + ew, py - eh * 0.2],
        [backR + ew, py + ph + eh * 0.2], [backR, py + ph + eh * 0.2],
      ], hi)
    }

  } else if (pattern === 'paneling') {
    // Vertical wood/metal panels — bar aesthetic.
    const slatCount = 4 + Math.floor(hash01(seed, 84) * 4)
    const slatW     = 2.5 + hash01(seed, 85) * 2.0
    for (let i = 1; i < slatCount; i++) {
      const fL = i / slatCount
      const lx = backL * fL
      const rx = backR + (w - backR) * fL
      renderer.pushShellQuad(0.033, [[lx - slatW, backTop], [lx + slatW, backTop], [lx + slatW, backBot], [lx - slatW, backBot]], body)
      renderer.pushShellQuad(0.034, [[lx + slatW * 0.3, backTop], [lx + slatW, backTop], [lx + slatW, backBot], [lx + slatW * 0.3, backBot]], hi)
      renderer.pushShellQuad(0.033, [[rx - slatW, backTop], [rx + slatW, backTop], [rx + slatW, backBot], [rx - slatW, backBot]], body)
      renderer.pushShellQuad(0.034, [[rx + slatW * 0.3, backTop], [rx + slatW, backTop], [rx + slatW, backBot], [rx + slatW * 0.3, backBot]], hi)
    }
    // Horizontal chair rail
    const railY = backTop + bh * 0.52; const railH = Math.max(3, bh * 0.025)
    renderer.pushShellQuad(0.035, [[0, railY], [backL, railY], [backL, railY + railH], [0, railY + railH]], palette.amberDim)
    renderer.pushShellQuad(0.035, [[backR, railY], [w, railY], [w, railY + railH], [backR, railY + railH]], palette.amberDim)

  } else if (pattern === 'brick') {
    // Exposed brick — hallway crowd.
    const rows  = 6 + Math.floor(hash01(seed, 86) * 4)
    const colsL = 2 + Math.floor(hash01(seed, 87) * 2)
    const colsR = colsL
    const rowH  = bh / rows; const mortar = 2
    for (let r = 0; r < rows; r++) {
      const y0 = backTop + r * rowH; const y1 = y0 + rowH - mortar
      const off = (r % 2) * 0.5
      const colWL = backL / colsL; const colWR = (w - backR) / colsR
      for (let c = 0; c < colsL; c++) {
        const bl = (c + off) * colWL; const br = Math.min(backL, bl + colWL - mortar)
        if (br <= bl) continue
        renderer.pushShellQuad(0.031, [[bl, y0], [br, y0], [br, y1], [bl, y1]], body)
        renderer.pushShellQuad(0.032, [[bl, y0], [br, y0], [br, y0 + 2], [bl, y0 + 2]], hi)
      }
      for (let c = 0; c < colsR; c++) {
        const bl = backR + (c + off) * colWR; const br = Math.min(w, bl + colWR - mortar)
        if (br <= bl) continue
        renderer.pushShellQuad(0.031, [[bl, y0], [br, y0], [br, y1], [bl, y1]], body)
        renderer.pushShellQuad(0.032, [[bl, y0], [br, y0], [br, y0 + 2], [bl, y0 + 2]], hi)
      }
    }

  } else if (pattern === 'wallpaper') {
    // Heavy vertical strips — conversation scene, intimate felt-covered walls.
    // Alternating slightly different shades + small horizontal detail marks.
    const stripCount = 5 + Math.floor(hash01(seed, 90) * 4)
    for (let side = 0; side < 2; side++) {
      const x0 = side === 0 ? 0 : backR
      const x1 = side === 0 ? backL : w
      const wallW = x1 - x0
      for (let i = 0; i < stripCount; i++) {
        const sx0 = x0 + wallW * (i / stripCount)
        const sx1 = x0 + wallW * ((i + 1) / stripCount)
        const isAlt = i % 2 === 0
        renderer.pushShellQuad(0.031, [[sx0, backTop], [sx1, backTop], [sx1, backBot], [sx0, backBot]], isAlt ? body : hi)
        // Small horizontal decorative marks at regular intervals
        const markCount = 3 + Math.floor(hash01(seed, 91 + i + side * 20) * 3)
        for (let k = 0; k < markCount; k++) {
          const my = backTop + ((k + 0.5) / markCount) * bh
          const mh = Math.max(1, bh * 0.012)
          const mx0 = sx0 + wallW * 0.08 / stripCount
          const mx1 = sx1 - wallW * 0.08 / stripCount
          renderer.pushShellQuad(0.032, [[mx0, my], [mx1, my], [mx1, my + mh], [mx0, my + mh]], isAlt ? hi : body)
        }
      }
    }

  } else if (pattern === 'panels') {
    // Reflective club panels — dance floor.
    // Rectangular panels like mirror tiles, with bright edge highlights
    // suggesting reflective/metallic surfaces under UV light.
    const panelCols  = 3 + Math.floor(hash01(seed, 92) * 2)   // 3–4 columns
    const panelRows  = 2 + Math.floor(hash01(seed, 93) * 2)   // 2–3 rows
    for (let side = 0; side < 2; side++) {
      const x0   = side === 0 ? 0 : backR
      const x1   = side === 0 ? backL : w
      const wallW = x1 - x0
      const gap   = 3
      const cellW = (wallW - gap * (panelCols + 1)) / panelCols
      const cellH = (bh    - gap * (panelRows + 1)) / panelRows
      for (let col = 0; col < panelCols; col++) {
        for (let row = 0; row < panelRows; row++) {
          const px = x0 + gap + col * (cellW + gap)
          const py = backTop + gap + row * (cellH + gap)
          // Panel body — very dark base
          renderer.pushShellQuad(0.031, [[px, py], [px + cellW, py], [px + cellW, py + cellH], [px, py + cellH]], body)
          // Right-edge highlight — the "reflection" strip
          const hiW = Math.max(2, cellW * 0.08)
          renderer.pushShellQuad(0.032, [[px + cellW - hiW, py + 2], [px + cellW, py + 2], [px + cellW, py + cellH - 2], [px + cellW - hiW, py + cellH - 2]], hi)
          // Top-edge subtle highlight
          const hiH = Math.max(1.5, cellH * 0.05)
          renderer.pushShellQuad(0.032, [[px + 2, py], [px + cellW - 2, py], [px + cellW - 2, py + hiH], [px + 2, py + hiH]], hi)
        }
      }
    }
  }
}

/** Pick a wall pattern for the given scene type using the room seed. */
export function pickWallPattern(sceneType: SceneType, seed: number): WallPattern {
  const variants = SCENE_WALL_VARIANTS[sceneType]
  if (variants.length === 1) return variants[0]
  return variants[Math.floor(hash01(seed, VARIANT_SALT) * variants.length)]
}

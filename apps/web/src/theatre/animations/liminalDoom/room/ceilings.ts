import type { LiminalRenderer } from '../render/renderer'
import { palette, sceneStructure } from '../core/palette'
import type { SceneKey } from '../core/palette'
import type { SceneType } from '../core/types'
import { hash01 } from '../core/math'

export type CeilingPattern = 'beams' | 'grate' | 'truss' | 'pendant' | 'acoustic' | 'solid'

export const SCENE_CEILING_VARIANTS: Record<SceneType, CeilingPattern[]> = {
  bandStage:    ['truss'],
  bar:          ['acoustic'],
  danceFloor:   ['grate'],
  conversation: ['pendant'],
  hallwayCrowd: ['beams'],
}

const VARIANT_SALT = 252

export function queueCeilingPatterns(
  renderer: LiminalRenderer,
  pattern: CeilingPattern,
  w: number,
  _h: number,
  backL: number,
  backR: number,
  backTop: number,
  seed = 0,
  sceneType?: SceneType,
): void {
  if (pattern === 'solid') return

  const sc      = sceneType ? sceneStructure[sceneType as SceneKey] : null
  const body    = sc?.ceilBody ?? palette.ceilingBar
  const glow    = sc?.ceilGlow ?? palette.ceilingBarGlow

  const steps = 6

  // Row y-coords recede from near (y=0) to far (y=backTop)
  const rowY: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = Math.pow(i / steps, 1.8)
    rowY.push(backTop * (1 - t))
  }

  function ceilX(y: number): { left: number; right: number } {
    const t = (backTop - y) / backTop
    return { left: backL * (1 - t), right: backR + (w - backR) * t }
  }

  if (pattern === 'beams') {
    // Receding structural beams — hallway crowd
    for (let j = 0; j < steps; j += 2) {
      if (j + 1 > steps) break
      const y0 = rowY[j]; const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = ceilX(y0)
      const { left: xl1, right: xr1 } = ceilX(y1)
      renderer.pushShellQuad(0.021 + j * 0.001, [[xl0, y0], [xr0, y0], [xr1, y1], [xl1, y1]], body)
      const edgeH = (y1 - y0) * 0.15
      renderer.pushShellQuad(0.022 + j * 0.001, [[xl1, y1 - edgeH], [xr1, y1 - edgeH], [xr1, y1], [xl1, y1]], palette.wallDark)
    }

  } else if (pattern === 'grate') {
    // Industrial vent grating — dance floor.
    // Checker grid with UV-colored highlights on each bar.
    const segments = 4
    for (let j = 0; j < steps; j++) {
      const y0 = rowY[j]; const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = ceilX(y0)
      const { left: xl1, right: xr1 } = ceilX(y1)
      for (let i = 0; i < segments; i++) {
        const f0 = i / segments; const f1 = (i + 1) / segments
        const p0: [number, number] = [xl0 + (xr0 - xl0) * f0, y0]
        const p1: [number, number] = [xl0 + (xr0 - xl0) * f1, y0]
        const p2: [number, number] = [xl1 + (xr1 - xl1) * f1, y1]
        const p3: [number, number] = [xl1 + (xr1 - xl1) * f0, y1]
        if ((i + j) % 2 === 0) {
          renderer.pushShellQuad(0.021 + j * 0.001, [
            [p0[0] + 1.5, p0[1] + 1.5], [p1[0] - 1.5, p1[1] + 1.5],
            [p2[0] - 1.5, p2[1] - 1.5], [p3[0] + 1.5, p3[1] - 1.5],
          ], body)
          // UV glow strip on each grate bar
          renderer.pushShellQuad(0.022 + j * 0.001, [
            [p0[0] + 1.5, p0[1] + 1.5], [p1[0] - 1.5, p1[1] + 1.5],
            [p2[0] - 1.5, p0[1] + 1.5 + (p2[1] - p3[1]) * 0.28],
            [p3[0] + 1.5, p0[1] + 1.5 + (p2[1] - p3[1]) * 0.28],
          ], glow)
        }
      }
    }

  } else if (pattern === 'truss') {
    // Stage lighting truss — band stage.
    // Two horizontal bars at varying heights, with diagonal braces and hanging par cans.
    const trussFracs = [
      0.22 + hash01(seed, 90) * 0.14,
      0.50 + hash01(seed, 91) * 0.14,
    ]
    for (const frac of trussFracs) {
      const ty0 = backTop * frac; const ty1 = backTop * (frac + 0.07)
      const { left: xl0, right: xr0 } = ceilX(ty0)
      const { left: xl1, right: xr1 } = ceilX(ty1)
      renderer.pushShellQuad(0.023, [[xl0, ty0], [xr0, ty0], [xr1, ty1], [xl1, ty1]], body)
      renderer.pushShellQuad(0.024, [[xl0, ty0], [xr0, ty0], [xr1, ty0 + (ty1 - ty0) * 0.3], [xl1, ty0 + (ty1 - ty0) * 0.3]], glow)
      // Diagonal braces
      const braceCount = 3
      for (let b = 0; b < braceCount; b++) {
        const bt = (b + 0.5) / braceCount
        const bspan = (xr0 - xl0) / braceCount
        const bx0 = xl0 + (xr0 - xl0) * bt - bspan * 0.15
        const bx1 = xl0 + (xr0 - xl0) * bt + bspan * 0.15
        renderer.pushShellQuad(0.025, [[bx0 - 2.5, ty0], [bx0 + 2.5, ty0], [bx1 + 2.5, ty1], [bx1 - 2.5, ty1]], body)
      }
      // Par cans
      const canCount = 2 + Math.floor(hash01(seed + Math.floor(frac * 100), 92) * 4)
      const canOffX  = (hash01(seed, 93) - 0.5) * (xr0 - xl0) * 0.08
      const canH = Math.max(4, (ty1 - ty0) * 0.8); const canW = canH * 0.7
      for (let c = 0; c < canCount; c++) {
        const ct = (c + 0.5) / canCount
        const cx = xl0 + (xr0 - xl0) * ct + canOffX
        const cHang = ty1 + canH * 1.2
        renderer.pushShellQuad(0.026, [[cx - canW * 0.5, ty1], [cx + canW * 0.5, ty1], [cx + canW * 0.5, cHang], [cx - canW * 0.5, cHang]], palette.amberDim)
        renderer.pushShellQuad(0.027, [[cx - canW * 0.3, cHang - canH * 0.25], [cx + canW * 0.3, cHang - canH * 0.25], [cx + canW * 0.3, cHang], [cx - canW * 0.3, cHang]], palette.amberBright)
      }
    }

  } else if (pattern === 'pendant') {
    // Single pendant lamp — conversation scene.
    // A cord dropping from ceiling center, then a lamp shade.
    // Simple but immediately reads as "intimate room."
    const cx = (backL + backR) * 0.5
    const cordTop  = 0
    const cordBot  = backTop * (0.55 + hash01(seed, 95) * 0.2)  // varies how low it hangs
    const cordW    = 2
    const shadeTop = cordBot
    const shadeH   = Math.max(12, backTop * 0.18)
    const shadeWTop = Math.max(8, backTop * 0.08)
    const shadeWBot = Math.max(16, backTop * 0.18)

    // Cord
    renderer.pushShellQuad(0.023, [
      [cx - cordW * 0.5, cordTop], [cx + cordW * 0.5, cordTop],
      [cx + cordW * 0.5, cordBot], [cx - cordW * 0.5, cordBot],
    ], body)

    // Shade body (trapezoid, wider at bottom)
    renderer.pushShellQuad(0.024, [
      [cx - shadeWTop, shadeTop],
      [cx + shadeWTop, shadeTop],
      [cx + shadeWBot, shadeTop + shadeH],
      [cx - shadeWBot, shadeTop + shadeH],
    ], body)

    // Shade rim — bright lip at bottom edge
    const rimH = Math.max(2, shadeH * 0.12)
    renderer.pushShellQuad(0.025, [
      [cx - shadeWBot,           shadeTop + shadeH - rimH],
      [cx + shadeWBot,           shadeTop + shadeH - rimH],
      [cx + shadeWBot + 2,       shadeTop + shadeH],
      [cx - shadeWBot - 2,       shadeTop + shadeH],
    ], glow)

    // Bulb — tiny bright ellipse at cord-shade junction
    renderer.pushShellQuad(0.026, [
      [cx - 4, cordBot - 4], [cx + 4, cordBot - 4],
      [cx + 4, cordBot + 4], [cx - 4, cordBot + 4],
    ], glow)

    // Optional: second pendant offset if seed allows
    if (hash01(seed, 96) > 0.45) {
      const cx2   = cx + (hash01(seed, 97) - 0.5) * (backR - backL) * 0.35
      const drop2 = cordBot * (0.6 + hash01(seed, 98) * 0.3)
      renderer.pushShellQuad(0.023, [
        [cx2 - cordW * 0.5, cordTop], [cx2 + cordW * 0.5, cordTop],
        [cx2 + cordW * 0.5, drop2],   [cx2 - cordW * 0.5, drop2],
      ], body)
      const sw2 = shadeWTop * 0.75; const sb2 = shadeWBot * 0.75; const sh2 = shadeH * 0.75
      renderer.pushShellQuad(0.024, [
        [cx2 - sw2, drop2], [cx2 + sw2, drop2],
        [cx2 + sb2, drop2 + sh2], [cx2 - sb2, drop2 + sh2],
      ], body)
      renderer.pushShellQuad(0.025, [
        [cx2 - sb2, drop2 + sh2 - rimH], [cx2 + sb2, drop2 + sh2 - rimH],
        [cx2 + sb2 + 2, drop2 + sh2], [cx2 - sb2 - 2, drop2 + sh2],
      ], glow)
    }

  } else if (pattern === 'acoustic') {
    // Acoustic ceiling tiles — bar scene.
    // Regular grid of inset rectangular tiles, like a suspended venue ceiling.
    // All tiles the same color (not checker) — reads as a paneled surface.
    const tileCols = 4 + Math.floor(hash01(seed, 100) * 2)  // 4–5 columns
    const gap = 3

    for (let j = 0; j < steps; j++) {
      const y0 = rowY[j]
      const { left: xl0, right: xr0 } = ceilX(y0)
      // Row-height is often too thin for acoustic tiles — only draw every-other row
      if (j % 2 !== 0) continue
      // Use the next row as the tile bottom
      const y1b = rowY[Math.min(j + 2, steps)]
      const { left: xl1b, right: xr1b } = ceilX(y1b)

      for (let i = 0; i < tileCols; i++) {
        const f0 = i / tileCols; const f1 = (i + 1) / tileCols
        const p0: [number, number] = [xl0 + (xr0 - xl0) * f0 + gap, y0 + gap]
        const p1: [number, number] = [xl0 + (xr0 - xl0) * f1 - gap, y0 + gap]
        const p2: [number, number] = [xl1b + (xr1b - xl1b) * f1 - gap, y1b - gap]
        const p3: [number, number] = [xl1b + (xr1b - xl1b) * f0 + gap, y1b - gap]

        // Tile surface
        renderer.pushShellQuad(0.021 + j * 0.001, [p0, p1, p2, p3], body)

        // Tile edge highlight (top + left edges) — gives the raised-frame look
        const edgeH = (y1b - y0) * 0.08
        const edgeW = (p1[0] - p0[0]) * 0.06
        renderer.pushShellQuad(0.022 + j * 0.001, [
          [p0[0], p0[1]], [p1[0], p1[1]],
          [p1[0], p1[1] + edgeH], [p0[0], p0[1] + edgeH],
        ], glow)
        renderer.pushShellQuad(0.022 + j * 0.001, [
          [p0[0], p0[1]], [p0[0] + edgeW, p0[1]],
          [p3[0] + edgeW, p3[1]], [p3[0], p3[1]],
        ], glow)
      }
    }
  }
}

/** Pick a ceiling pattern for the given scene type using the room seed. */
export function pickCeilingPattern(sceneType: SceneType, seed: number): CeilingPattern {
  const variants = SCENE_CEILING_VARIANTS[sceneType]
  if (variants.length === 1) return variants[0]
  return variants[Math.floor(hash01(seed, VARIANT_SALT) * variants.length)]
}

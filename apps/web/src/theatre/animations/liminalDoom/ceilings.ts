import type { LiminalRenderer } from './renderer'
import { palette } from './palette'
import type { SceneType } from './types'
import { hash01 } from './types'

export type CeilingPattern = 'beams' | 'grate' | 'truss' | 'solid'

export const SCENE_CEILING_MAPPING: Record<SceneType, CeilingPattern> = {
  bandStage:    'truss',
  bar:          'solid',
  danceFloor:   'grate',
  conversation: 'solid',
  hallwayCrowd: 'beams',
}

/**
 * Procedural ceiling pattern generator.
 * Perspective z-coords recede from the screen top (near) to backTop (far).
 */
export function queueCeilingPatterns(
  renderer: LiminalRenderer,
  pattern: CeilingPattern,
  w: number,
  _h: number,
  backL: number,
  backR: number,
  backTop: number,
  seed = 0,
): void {
  if (pattern === 'solid') return

  const steps = 6 + Math.floor(hash01(seed, 3) * 2)

  // Row y-coordinates: near edge (y=0) to back wall top (y=backTop)
  // Quadratic so near rows are spaced further apart (natural perspective)
  const rowY: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = Math.pow(i / steps, 1.8)
    rowY.push(backTop * (1 - t))   // 0 at far, backTop at near
  }

  // For a given y on the ceiling, compute left/right x (perspective fan)
  function ceilX(y: number): { left: number; right: number } {
    const t = (backTop - y) / backTop   // 0 at far, 1 at near
    return {
      left:  backL * (1 - t),           // fans to 0 at near
      right: backR + (w - backR) * t,   // fans to w at near
    }
  }

  if (pattern === 'beams') {
    // Solid receding horizontal ceiling beams — hallway crowd.
    // Alternating wide/narrow bands give structural rhythm.
    for (let j = 0; j < steps; j += 2) {
      if (j + 1 > steps) break
      const y0 = rowY[j]
      const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = ceilX(y0)
      const { left: xl1, right: xr1 } = ceilX(y1)

      // Beam face (top surface — slightly lighter)
      renderer.pushShellQuad(0.021 + j * 0.001, [
        [xl0, y0], [xr0, y0], [xr1, y1], [xl1, y1],
      ], palette.ceilingBar)

      // Bottom edge of beam — darker, creates shadow under beam
      const edgeH = (y1 - y0) * 0.15
      renderer.pushShellQuad(0.022 + j * 0.001, [
        [xl1, y1 - edgeH], [xr1, y1 - edgeH],
        [xr1, y1],         [xl1, y1],
      ], palette.wallDark)
    }

  } else if (pattern === 'grate') {
    // Industrial vent grating — dance floor.
    // Checker grid of lighter tiles with visible frame lines.
    const segments = 4

    for (let j = 0; j < steps; j++) {
      const y0 = rowY[j]
      const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = ceilX(y0)
      const { left: xl1, right: xr1 } = ceilX(y1)

      for (let i = 0; i < segments; i++) {
        const f0 = i / segments
        const f1 = (i + 1) / segments
        const p0: [number, number] = [xl0 + (xr0 - xl0) * f0, y0]
        const p1: [number, number] = [xl0 + (xr0 - xl0) * f1, y0]
        const p2: [number, number] = [xl1 + (xr1 - xl1) * f1, y1]
        const p3: [number, number] = [xl1 + (xr1 - xl1) * f0, y1]

        if ((i + j) % 2 === 0) {
          // Light tile — grate bar surface
          renderer.pushShellQuad(0.021 + j * 0.001, [
            [p0[0] + 1.5, p0[1] + 1.5],
            [p1[0] - 1.5, p1[1] + 1.5],
            [p2[0] - 1.5, p2[1] - 1.5],
            [p3[0] + 1.5, p3[1] - 1.5],
          ], palette.ceilingBar)
          // Grate highlight strip (top edge of each bar)
          renderer.pushShellQuad(0.022 + j * 0.001, [
            [p0[0] + 1.5, p0[1] + 1.5],
            [p1[0] - 1.5, p1[1] + 1.5],
            [p2[0] - 1.5, p2[1] + (p2[1] - p3[1]) * 0.25],
            [p3[0] + 1.5, p3[1] + (p2[1] - p3[1]) * 0.25],
          ], palette.ceilingBarGlow)
        }
      }
    }

  } else if (pattern === 'truss') {
    // Truss bar vertical positions vary per room
    const trussFracs = [
      0.22 + hash01(seed, 90) * 0.14,   // upper: 22–36% of backTop
      0.50 + hash01(seed, 91) * 0.14,   // lower: 50–64%
    ]
    for (const frac of trussFracs) {
      const ty0 = backTop * frac
      const ty1 = backTop * (frac + 0.07)
      const { left: xl0, right: xr0 } = ceilX(ty0)
      const { left: xl1, right: xr1 } = ceilX(ty1)

      // Truss body
      renderer.pushShellQuad(0.023, [
        [xl0, ty0], [xr0, ty0], [xr1, ty1], [xl1, ty1],
      ], palette.wallLight)
      // Truss top highlight
      renderer.pushShellQuad(0.024, [
        [xl0, ty0], [xr0, ty0],
        [xr1, ty0 + (ty1 - ty0) * 0.3], [xl1, ty0 + (ty1 - ty0) * 0.3],
      ], palette.ceilingBarGlow)

      // Diagonal braces — 3 diagonal struts spaced along the bar
      const braceCount = 3
      for (let b = 0; b < braceCount; b++) {
        const bt = (b + 0.5) / braceCount
        const bw = (xr0 - xl0) / braceCount
        const bx0 = xl0 + (xr0 - xl0) * bt - bw * 0.15
        const bx1 = xl0 + (xr0 - xl0) * bt + bw * 0.15
        const braceThick = 2.5
        renderer.pushShellQuad(0.025, [
          [bx0 - braceThick, ty0],
          [bx0 + braceThick, ty0],
          [bx1 + braceThick, ty1],
          [bx1 - braceThick, ty1],
        ], palette.ceilingBar)
      }

      // Par can count varies 2–5 per truss
      const canCount  = 2 + Math.floor(hash01(seed + Math.floor(frac * 100), 92) * 4)
      const canOffX   = (hash01(seed, 93) - 0.5) * (xr0 - xl0) * 0.08
      const canH = Math.max(4, (ty1 - ty0) * 0.8)
      const canW = canH * 0.7
      for (let c = 0; c < canCount; c++) {
        const ct = (c + 0.5) / canCount
        const cx = xl0 + (xr0 - xl0) * ct + canOffX
        const cHang = ty1 + canH * 1.2
        renderer.pushShellQuad(0.026, [
          [cx - canW * 0.5, ty1],
          [cx + canW * 0.5, ty1],
          [cx + canW * 0.5, cHang],
          [cx - canW * 0.5, cHang],
        ], palette.amberDim)
        // Can lens face — lightest point
        renderer.pushShellQuad(0.027, [
          [cx - canW * 0.3, cHang - canH * 0.25],
          [cx + canW * 0.3, cHang - canH * 0.25],
          [cx + canW * 0.3, cHang],
          [cx - canW * 0.3, cHang],
        ], palette.amberBright)
      }
    }
  }
}

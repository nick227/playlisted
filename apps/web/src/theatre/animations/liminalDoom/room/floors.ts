import type { LiminalRenderer } from '../render/renderer'
import { palette, sceneStructure } from '../core/palette'
import type { SceneKey } from '../core/palette'
import type { SceneType } from '../core/types'
import { hash01 } from '../core/math'

export type FloorPattern = 'grid' | 'checkerboard' | 'stripes' | 'planks' | 'tiles' | 'solid'

/**
 * Multiple pattern variants per scene — picked per-room from the seed.
 * Having ≥2 options per scene type means the same sceneType never looks
 * structurally identical across room visits.
 */
export const SCENE_FLOOR_VARIANTS: Record<SceneType, FloorPattern[]> = {
  bandStage:    ['grid', 'planks'],
  bar:          ['tiles', 'stripes'],
  danceFloor:   ['checkerboard'],
  conversation: ['planks', 'tiles'],
  hallwayCrowd: ['grid'],
}

// Salt chosen to not collide with roomShell or ceiling salts
const VARIANT_SALT = 250

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

  const sc   = sceneType ? sceneStructure[sceneType as SceneKey] : null
  const accent = sc?.floorAccent ?? palette.amberDim
  const dark   = sc?.wallBase   ?? palette.floor

  const steps    = 6
  const segments = 6

  // Row y-coordinates — quadratic for natural depth compression near horizon
  const rowY: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = Math.pow(i / steps, 2.0)
    rowY.push(backBot + (h - backBot) * t)
  }

  function rowX(y: number): { left: number; right: number } {
    const t = (y - backBot) / (h - backBot)
    return { left: backL + (0 - backL) * t, right: backR + (w - backR) * t }
  }

  if (pattern === 'grid') {
    // Perspective receding grid lines — amber for bandStage, cool grey for hallway
    for (let j = 1; j < steps; j++) {
      const y   = rowY[j]
      const { left, right } = rowX(y)
      const lineH = Math.max(0.8, (rowY[j + 1] - y) * (0.06 + hash01(seed, 20 + j) * 0.06))
      renderer.pushShellQuad(0.012 + j * 0.001, [
        [left, y], [right, y], [right, y + lineH], [left, y + lineH],
      ], accent)
    }
    for (let i = 1; i < segments; i++) {
      const t   = i / segments
      const bx  = backL + (backR - backL) * t
      const fx  = w * t
      const lw  = 1.0 + hash01(seed, 30 + i) * 1.2
      renderer.pushShellQuad(0.013, [
        [bx - lw * 0.4, backBot], [bx + lw * 0.6, backBot],
        [fx + lw, h],             [fx, h],
      ], accent)
    }

  } else if (pattern === 'checkerboard') {
    // Vivid alternating tiles — electric for danceFloor
    for (let j = 0; j < steps; j++) {
      const y0 = rowY[j]; const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = rowX(y0)
      const { left: xl1, right: xr1 } = rowX(y1)
      for (let i = 0; i < segments; i++) {
        if ((i + j) % 2 !== 0) continue
        const f0 = i / segments; const f1 = (i + 1) / segments
        const p0: [number, number] = [xl0 + (xr0 - xl0) * f0, y0]
        const p1: [number, number] = [xl0 + (xr0 - xl0) * f1, y0]
        const p2: [number, number] = [xl1 + (xr1 - xl1) * f1, y1]
        const p3: [number, number] = [xl1 + (xr1 - xl1) * f0, y1]
        renderer.pushShellQuad(0.012 + j * 0.001, [
          [p0[0] + 1, p0[1] + 1], [p1[0] - 1, p1[1] + 1],
          [p2[0] - 1, p2[1] - 1], [p3[0] + 1, p3[1] - 1],
        ], accent)
      }
    }

  } else if (pattern === 'stripes') {
    // Alternating horizontal bands — every-other row filled
    for (let j = 0; j < steps; j += 2) {
      if (j + 1 > steps) break
      const y0 = rowY[j]; const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = rowX(y0)
      const { left: xl1, right: xr1 } = rowX(y1)
      renderer.pushShellQuad(0.012 + j * 0.001, [
        [xl0, y0], [xr0, y0], [xr1, y1], [xl1, y1],
      ], accent)
    }
    // Thin junction highlights
    for (let j = 1; j < steps; j++) {
      const y = rowY[j]
      const { left, right } = rowX(y)
      renderer.pushShellQuad(0.013, [
        [left, y - 0.5], [right, y - 0.5], [right, y + 1], [left, y + 1],
      ], palette.floorLine)
    }

  } else if (pattern === 'planks') {
    // Horizontal wood planks receding in perspective.
    // Each plank is a full-width band; alternating planks vary slightly in shade.
    // Thin dark gap between each plank (mortar/gap line).
    for (let j = 0; j < steps; j++) {
      const y0 = rowY[j]; const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = rowX(y0)
      const { left: xl1, right: xr1 } = rowX(y1)
      // Alternate: every other plank slightly lighter
      const isLight = (j + Math.floor(hash01(seed, 80) * 2)) % 2 === 0
      renderer.pushShellQuad(0.012 + j * 0.001, [
        [xl0, y0], [xr0, y0], [xr1, y1], [xl1, y1],
      ], isLight ? accent : dark)

      // Plank gap — thin dark line at top edge of each plank
      const gapH = Math.max(1, (y1 - y0) * 0.06)
      renderer.pushShellQuad(0.013, [
        [xl0, y0], [xr0, y0], [xr0, y0 + gapH], [xl0, y0 + gapH],
      ], dark)

      // Occasional grain mark (a thin vertical scratch on some planks)
      if (hash01(seed, 85 + j) > 0.55) {
        const gx  = xl0 + (xr0 - xl0) * (0.15 + hash01(seed, 86 + j) * 0.65)
        const gw  = 0.8 + hash01(seed, 87 + j) * 0.6
        renderer.pushShellQuad(0.014, [
          [gx - gw, y0 + gapH * 2], [gx + gw, y0 + gapH * 2],
          [gx + gw, y1 - gapH], [gx - gw, y1 - gapH],
        ], dark)
      }
    }

  } else if (pattern === 'tiles') {
    // Square bar/bathroom tiles — ALL cells filled, 2px dark mortar between.
    // Unlike checkerboard, every tile is the same accent color so it reads
    // as a tiled surface rather than a pattern.
    for (let j = 0; j < steps; j++) {
      const y0 = rowY[j]; const y1 = rowY[j + 1]
      const { left: xl0, right: xr0 } = rowX(y0)
      const { left: xl1, right: xr1 } = rowX(y1)
      for (let i = 0; i < segments; i++) {
        const f0 = i / segments; const f1 = (i + 1) / segments
        const p0: [number, number] = [xl0 + (xr0 - xl0) * f0, y0]
        const p1: [number, number] = [xl0 + (xr0 - xl0) * f1, y0]
        const p2: [number, number] = [xl1 + (xr1 - xl1) * f1, y1]
        const p3: [number, number] = [xl1 + (xr1 - xl1) * f0, y1]
        // 2px inset = mortar line
        renderer.pushShellQuad(0.012 + j * 0.001, [
          [p0[0] + 2, p0[1] + 2], [p1[0] - 2, p1[1] + 2],
          [p2[0] - 2, p2[1] - 2], [p3[0] + 2, p3[1] - 2],
        ], accent)
      }
    }
  }
}

/** Pick a floor pattern for the given scene type using the room seed. */
export function pickFloorPattern(sceneType: SceneType, seed: number): FloorPattern {
  const variants = SCENE_FLOOR_VARIANTS[sceneType]
  if (variants.length === 1) return variants[0]
  return variants[Math.floor(hash01(seed, VARIANT_SALT) * variants.length)]
}

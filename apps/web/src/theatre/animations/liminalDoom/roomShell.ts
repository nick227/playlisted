import { palette } from './palette'
import type { LiminalRenderer } from './renderer'
import { SCENE_FLOOR_MAPPING, queueFloorTiles } from './floors'
import { SCENE_WALL_MAPPING, queueWallPatterns } from './walls'
import { SCENE_CEILING_MAPPING, queueCeilingPatterns } from './ceilings'
import type { SceneType } from './types'
import { hash01 } from './types'

// Edge colors to pick from per room — stage front strip varies
const EDGE_COLORS = [
  palette.stageEdge,   // amber
  palette.magenta,     // magenta
  palette.cyanLeak,    // teal
  palette.amberBright, // brighter amber
] as const

/**
 * Venue room shell — all geometry is pre-computed flat quads.
 * Key constraint: back wall must be visibly lighter than figures (silhouette reads).
 * Ceiling fixtures and stage edge anchor the perspective read within 2 seconds.
 * seed drives per-room structural variation — same seed = identical room.
 */
export function queueRoomShell(renderer: LiminalRenderer, w: number, h: number, sceneType?: SceneType, seed = 0) {
  const backTop = h * 0.2
  const backBot = h * 0.68
  const backL   = w * 0.14
  const backR   = w * 0.86
  const bw      = backR - backL
  const bh      = backBot - backTop

  // ── Floor (receding trapezoid with perspective sheen strip) ─────────────
  renderer.pushShellQuad(0.01, [
    [0, backBot], [w, backBot], [w, h], [0, h],
  ], palette.floor)
  // Sheen strip at floor-wall junction — makes the depth readable
  renderer.pushShellQuad(0.015, [
    [backL - 20, backBot], [backR + 20, backBot],
    [backR + 20, backBot + h * 0.04], [backL - 20, backBot + h * 0.04],
  ], palette.floorSheen)

  // Scene-specific procedural tiles
  if (sceneType) {
    const pattern = SCENE_FLOOR_MAPPING[sceneType] ?? 'solid'
    queueFloorTiles(renderer, pattern, w, h, backL, backR, backBot, sceneType, seed)
  }

  // ── Ceiling (receding trapezoid) ─────────────────────────────────────────
  renderer.pushShellQuad(0.02, [
    [0, 0], [w, 0], [backR, backTop], [backL, backTop],
  ], palette.ceiling)

  if (sceneType) {
    const pattern = SCENE_CEILING_MAPPING[sceneType] ?? 'solid'
    queueCeilingPatterns(renderer, pattern, w, h, backL, backR, backTop, seed)
  }

  // ── Side walls ───────────────────────────────────────────────────────────
  renderer.pushShellQuad(0.03, [
    [0, backTop], [backL, backTop], [backL, backBot], [0, backBot],
  ], palette.wallDark)
  renderer.pushShellQuad(0.03, [
    [backR, backTop], [w, backTop], [w, backBot], [backR, backBot],
  ], palette.wallDark)

  if (sceneType) {
    const pattern = SCENE_WALL_MAPPING[sceneType] ?? 'solid'
    queueWallPatterns(renderer, pattern, w, h, backL, backR, backTop, backBot)
  }

  // ── Back wall — noticeably lighter so silhouettes read ───────────────────
  renderer.pushShellQuad(0.04, [
    [backL, backTop], [backR, backTop], [backR, backBot], [backL, backBot],
  ], palette.backWall)

  // Inner lit stage area — inset amount varies slightly per room
  const sx = bw * (0.05 + hash01(seed, 1) * 0.03)
  const sy = bh * (0.05 + hash01(seed, 2) * 0.025)
  renderer.pushShellQuad(0.045, [
    [backL + sx, backTop + sy],
    [backR - sx, backTop + sy],
    [backR - sx, backBot - sy * 0.5],
    [backL + sx, backBot - sy * 0.5],
  ], palette.backWallLit)

  // ── Ceiling light bars — y-position and horizontal span vary per room ────
  const barFrac = 0.04 + hash01(seed, 3) * 0.03   // 4–7% of bh
  const barY0   = backTop
  const barY1   = backTop + bh * barFrac
  // Left bar x-span varies (slight shift left or right)
  const lb0 = 0.16 + hash01(seed, 4) * 0.04
  const lb1 = 0.40 + hash01(seed, 5) * 0.04
  const rb0 = 0.56 + hash01(seed, 6) * 0.04
  const rb1 = 0.80 + hash01(seed, 7) * 0.04
  renderer.pushShellQuad(0.05, [
    [backL + bw * lb0, barY0], [backL + bw * lb1, barY0],
    [backL + bw * (lb1 - 0.01), barY1], [backL + bw * (lb0 + 0.01), barY1],
  ], palette.ceilingBar)
  renderer.pushShellQuad(0.05, [
    [backL + bw * rb0, barY0], [backL + bw * rb1, barY0],
    [backL + bw * (rb1 - 0.01), barY1], [backL + bw * (rb0 + 0.01), barY1],
  ], palette.ceilingBar)
  renderer.pushShellQuad(0.051, [
    [backL + bw * lb0, barY1], [backL + bw * lb1, barY1],
    [backL + bw * (lb1 + 0.01), barY1 + bh * 0.025],
    [backL + bw * (lb0 - 0.01), barY1 + bh * 0.025],
  ], palette.ceilingBarGlow)
  renderer.pushShellQuad(0.051, [
    [backL + bw * rb0, barY1], [backL + bw * rb1, barY1],
    [backL + bw * (rb1 + 0.01), barY1 + bh * 0.025],
    [backL + bw * (rb0 - 0.01), barY1 + bh * 0.025],
  ], palette.ceilingBarGlow)

  // ── Stage front edge — color picks from 4 options per room ──────────────
  const edgeH    = Math.max(3, bh * (0.02 + hash01(seed, 8) * 0.015))
  const edgeCol  = EDGE_COLORS[Math.floor(hash01(seed, 9) * EDGE_COLORS.length)]
  renderer.pushShellQuad(0.052, [
    [backL, backBot - edgeH], [backR, backBot - edgeH],
    [backR, backBot],         [backL, backBot],
  ], edgeCol)
  renderer.pushShellQuad(0.053, [
    [backL - 4, backBot], [backR + 4, backBot],
    [backR + 4, backBot + edgeH * 0.8], [backL - 4, backBot + edgeH * 0.8],
  ], palette.amberDim)

  // ── Floor perspective lines — count varies 5–9 per room ──────────────────
  const lineCount = 5 + Math.floor(hash01(seed, 10) * 5)   // 5, 6, 7, 8, or 9
  for (let i = 0; i <= lineCount; i++) {
    const t  = i / lineCount
    const bx = backL + bw * t
    const fx = w * t
    // Line weight also varies slightly per line
    const lw  = 1 + hash01(seed, 11 + i) * 1.5
    renderer.pushShellQuad(0.06, [
      [bx - lw * 0.4, backBot], [bx + lw * 0.6, backBot],
      [fx + lw,       h],       [fx,             h],
    ], palette.floorLine)
  }

  // ── Side wall corner accent strips ───────────────────────────────────────
  // Vertical lines where side wall meets back wall — reinforces perspective
  renderer.pushShellQuad(0.065, [
    [backL - 3, backTop], [backL + 3, backTop],
    [backL + 3, backBot], [backL - 3, backBot],
  ], palette.wallLight)
  renderer.pushShellQuad(0.065, [
    [backR - 3, backTop], [backR + 3, backTop],
    [backR + 3, backBot], [backR - 3, backBot],
  ], palette.wallLight)
}

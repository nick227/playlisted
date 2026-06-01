import { palette, sceneStructure } from '../core/palette'
import type { SceneKey } from '../core/palette'
import type { LiminalRenderer } from '../render/renderer'
import { pickFloorPattern, queueFloorTiles } from './floors'
import { pickWallPattern, queueWallPatterns } from './walls'
import { pickCeilingPattern, queueCeilingPatterns } from './ceilings'
import type { SceneType } from '../core/types'
import { hash01 } from '../core/math'

// Stage-edge accent colors — drawn at the very front of the back wall
const EDGE_COLORS = [
  palette.stageEdge,
  palette.magenta,
  palette.cyanLeak,
  palette.amberBright,
] as const

/**
 * Venue room shell — floor, ceiling, side walls, back wall.
 * All colors and pattern variants are derived from (sceneType, seed) so the
 * same sceneType always reads as the same venue identity, but no two rooms
 * of that type look structurally identical.
 */
export function queueRoomShell(
  renderer: LiminalRenderer,
  w: number,
  h: number,
  sceneType?: SceneType,
  seed = 0,
) {
  const backTop = h * 0.2
  const backBot = h * 0.68
  const backL   = w * 0.14
  const backR   = w * 0.86
  const bw      = backR - backL
  const bh      = backBot - backTop

  // Scene-specific structural colors — makes each venue type immediately distinct
  const sc       = sceneType ? sceneStructure[sceneType as SceneKey] : null
  const backWall    = sc?.backWall    ?? palette.backWall
  const backWallLit = sc?.backWallLit ?? palette.backWallLit
  const wallBase    = sc?.wallBase    ?? palette.wallDark
  const ceilBody    = sc?.ceilBody    ?? palette.ceilingBar
  const ceilGlow    = sc?.ceilGlow    ?? palette.ceilingBarGlow

  // ── Floor ────────────────────────────────────────────────────────────────
  renderer.pushShellQuad(0.01, [
    [0, backBot], [w, backBot], [w, h], [0, h],
  ], palette.floor)
  renderer.pushShellQuad(0.015, [
    [backL - 20, backBot], [backR + 20, backBot],
    [backR + 20, backBot + h * 0.04], [backL - 20, backBot + h * 0.04],
  ], palette.floorSheen)

  if (sceneType) {
    const pattern = pickFloorPattern(sceneType, seed)
    queueFloorTiles(renderer, pattern, w, h, backL, backR, backBot, sceneType, seed)
  }

  // ── Ceiling ───────────────────────────────────────────────────────────────
  renderer.pushShellQuad(0.02, [
    [0, 0], [w, 0], [backR, backTop], [backL, backTop],
  ], palette.ceiling)

  if (sceneType) {
    const pattern = pickCeilingPattern(sceneType, seed)
    queueCeilingPatterns(renderer, pattern, w, h, backL, backR, backTop, seed, sceneType)
  }

  // ── Side walls — filled in scene color then patterned ────────────────────
  renderer.pushShellQuad(0.03, [
    [0, backTop], [backL, backTop], [backL, backBot], [0, backBot],
  ], wallBase)
  renderer.pushShellQuad(0.03, [
    [backR, backTop], [w, backTop], [w, backBot], [backR, backBot],
  ], wallBase)

  if (sceneType) {
    const pattern = pickWallPattern(sceneType, seed)
    queueWallPatterns(renderer, pattern, w, h, backL, backR, backTop, backBot, seed, sceneType)
  }

  // ── Back wall — scene-colored so each venue reads differently ────────────
  renderer.pushShellQuad(0.04, [
    [backL, backTop], [backR, backTop], [backR, backBot], [backL, backBot],
  ], backWall)

  // Inner lit stage area — slightly lighter, inset varies
  const sx = bw * (0.05 + hash01(seed, 1) * 0.03)
  const sy = bh * (0.05 + hash01(seed, 2) * 0.025)
  renderer.pushShellQuad(0.045, [
    [backL + sx, backTop + sy],
    [backR - sx, backTop + sy],
    [backR - sx, backBot - sy * 0.5],
    [backL + sx, backBot - sy * 0.5],
  ], backWallLit)

  // ── Ceiling light bars — position and span vary, color from scene ─────────
  const barFrac = 0.04 + hash01(seed, 3) * 0.03
  const barY0   = backTop
  const barY1   = backTop + bh * barFrac
  const lb0 = 0.16 + hash01(seed, 4) * 0.04
  const lb1 = 0.40 + hash01(seed, 5) * 0.04
  const rb0 = 0.56 + hash01(seed, 6) * 0.04
  const rb1 = 0.80 + hash01(seed, 7) * 0.04
  renderer.pushShellQuad(0.05, [
    [backL + bw * lb0, barY0], [backL + bw * lb1, barY0],
    [backL + bw * (lb1 - 0.01), barY1], [backL + bw * (lb0 + 0.01), barY1],
  ], ceilBody)
  renderer.pushShellQuad(0.05, [
    [backL + bw * rb0, barY0], [backL + bw * rb1, barY0],
    [backL + bw * (rb1 - 0.01), barY1], [backL + bw * (rb0 + 0.01), barY1],
  ], ceilBody)
  renderer.pushShellQuad(0.051, [
    [backL + bw * lb0, barY1], [backL + bw * lb1, barY1],
    [backL + bw * (lb1 + 0.01), barY1 + bh * 0.025],
    [backL + bw * (lb0 - 0.01), barY1 + bh * 0.025],
  ], ceilGlow)
  renderer.pushShellQuad(0.051, [
    [backL + bw * rb0, barY1], [backL + bw * rb1, barY1],
    [backL + bw * (rb1 + 0.01), barY1 + bh * 0.025],
    [backL + bw * (rb0 - 0.01), barY1 + bh * 0.025],
  ], ceilGlow)

  // ── Stage front edge — color varies per room ──────────────────────────────
  const edgeH   = Math.max(3, bh * (0.02 + hash01(seed, 8) * 0.015))
  const edgeCol = EDGE_COLORS[Math.floor(hash01(seed, 9) * EDGE_COLORS.length)]
  renderer.pushShellQuad(0.052, [
    [backL, backBot - edgeH], [backR, backBot - edgeH],
    [backR, backBot],         [backL, backBot],
  ], edgeCol)
  renderer.pushShellQuad(0.053, [
    [backL - 4, backBot], [backR + 4, backBot],
    [backR + 4, backBot + edgeH * 0.8], [backL - 4, backBot + edgeH * 0.8],
  ], palette.amberDim)

  // ── Floor perspective lines — count and weight vary per room ──────────────
  const lineCount = 5 + Math.floor(hash01(seed, 10) * 5)
  for (let i = 0; i <= lineCount; i++) {
    const t  = i / lineCount
    const bx = backL + bw * t
    const fx = w * t
    const lw = 1 + hash01(seed, 11 + i) * 1.5
    renderer.pushShellQuad(0.06, [
      [bx - lw * 0.4, backBot], [bx + lw * 0.6, backBot],
      [fx + lw, h],             [fx, h],
    ], palette.floorLine)
  }

  // ── Corner accent strips — reinforce the wall-meets-back-wall angle ───────
  renderer.pushShellQuad(0.065, [
    [backL - 3, backTop], [backL + 3, backTop],
    [backL + 3, backBot], [backL - 3, backBot],
  ], palette.wallLight)
  renderer.pushShellQuad(0.065, [
    [backR - 3, backTop], [backR + 3, backTop],
    [backR + 3, backBot], [backR - 3, backBot],
  ], palette.wallLight)
}

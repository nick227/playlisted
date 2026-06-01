import { palette } from './palette'
import type { LiminalRenderer } from './renderer'

/** Cheap venue shell — floor, ceiling, side walls, back wall plane. */
export function queueRoomShell(renderer: LiminalRenderer, w: number, h: number) {
  const backTop = h * 0.2
  const backBot = h * 0.68
  const backL = w * 0.14
  const backR = w * 0.86

  renderer.pushShellQuad(0.01, [
    [0, backBot], [w, backBot], [w, h], [0, h],
  ], palette.floor)
  renderer.pushShellQuad(0.02, [
    [0, 0], [w, 0], [backR, backTop], [backL, backTop],
  ], palette.ceiling)
  renderer.pushShellQuad(0.03, [
    [0, backTop], [backL, backTop], [backL, backBot], [0, backBot],
  ], palette.wallDark)
  renderer.pushShellQuad(0.03, [
    [backR, backTop], [w, backTop], [w, backBot], [backR, backBot],
  ], palette.wallDark)
  renderer.pushShellQuad(0.04, [
    [backL, backTop], [backR, backTop], [backR, backBot], [backL, backBot],
  ], palette.wall)
  renderer.pushShellQuad(0.05, [
    [backL + 4, backTop + 4], [backR - 4, backTop + 4],
    [backR - 4, backBot - 4], [backL + 4, backBot - 4],
  ], palette.stage)

  const gridY = backBot
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    const x = backL + (backR - backL) * t
    renderer.pushShellQuad(0.06, [
      [x, gridY], [x + 6, h], [x + 14, h], [x + 8, gridY],
    ], palette.floorLine)
  }
}

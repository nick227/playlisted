import { projectTile } from '../world/coords'
import type { StreetProp } from '../world/cityProps'
import type { CameraState } from '../world/types'

export function drawStreetFurniture(
  ctx: CanvasRenderingContext2D,
  props: StreetProp[],
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
) {
  for (const prop of props) {
    const p = projectTile(prop.gx, prop.gy, 0.04, cam)
    if (prop.kind === 'lamp') drawLamp(ctx, p.sx, p.sy, elapsed, reducedMotion, prop.seed)
    else if (prop.kind === 'hydrant') drawHydrant(ctx, p.sx, p.sy)
    else if (prop.kind === 'barrier') drawBarrier(ctx, p.sx, p.sy)
    else drawDumpster(ctx, p.sx, p.sy)
  }
}

function drawLamp(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  elapsed: number,
  reducedMotion: boolean,
  seed: number,
) {
  const flicker = reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 0.006 + seed)
  ctx.fillStyle = '#3a3a44'
  ctx.fillRect(sx - 1, sy - 10, 2, 10)
  ctx.fillStyle = '#ffb347'
  ctx.globalAlpha = flicker
  ctx.fillRect(sx - 2, sy - 12, 4, 3)
  const cone = ctx.createRadialGradient(sx, sy + 2, 0, sx, sy + 8, 22)
  cone.addColorStop(0, `rgba(255, 180, 80, ${0.22 * flicker})`)
  cone.addColorStop(1, 'rgba(255, 140, 40, 0)')
  ctx.fillStyle = cone
  ctx.beginPath()
  ctx.ellipse(sx, sy + 6, 18, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawHydrant(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = '#aa3322'
  ctx.fillRect(sx - 2, sy - 4, 4, 4)
}

function drawBarrier(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = '#ccaa22'
  ctx.fillRect(sx - 3, sy - 3, 6, 2)
  ctx.fillStyle = '#222'
  ctx.fillRect(sx - 1, sy - 6, 2, 4)
}

function drawDumpster(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = '#2a4a2a'
  ctx.fillRect(sx - 3, sy - 4, 6, 4)
}

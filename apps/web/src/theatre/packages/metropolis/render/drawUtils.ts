import { projectTile } from '../world/coords'
import type { CameraState } from '../world/types'

export function tileCorners(gx: number, gy: number, elev: number, cam: CameraState) {
  return [
    projectTile(gx, gy, elev, cam),
    projectTile(gx + 1, gy, elev, cam),
    projectTile(gx + 1, gy + 1, elev, cam),
    projectTile(gx, gy + 1, elev, cam),
  ]
}

export function fillQuad(ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[], color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(pts[0].sx, pts[0].sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy)
  ctx.closePath()
  ctx.fill()
}

export function shade(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + amt))))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

export function blackoutDim(
  gx: number,
  gy: number,
  size: number,
  wave: number,
  rolling: boolean,
  globalBlackout: number,
): number {
  let dim = 1 - globalBlackout * 0.85
  if (rolling && wave > 0) {
    const k = (gx * 0.35 + gy * 0.65) / size
    if (k < wave) dim *= 0.08 + Math.min(1, (wave - k) * 3) * 0.12
  }
  return Math.max(0.05, dim)
}

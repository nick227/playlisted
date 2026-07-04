import { projectTile } from '../world/coords'
import { DISTRICTS } from '../world/districts'
import { rand01 } from '../world/rng'
import type { CityGrid } from '../world/cityGen'
import type { CameraState, MetropolisAudio } from '../world/types'

const ROAD = { dark: '#1a1a22', light: '#2a2a34', line: '#444455', wet: '#333348' }
const WATER = { deep: '#060810', mid: '#0a1420', spec: '#4488aa' }

export function drawCity(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
) {
  const { size, cells } = grid
  for (let sum = 0; sum < size * 2; sum++) {
    for (let gx = 0; gx <= sum; gx++) {
      const gy = sum - gx
      if (gx >= size || gy >= size) continue
      const cell = cells[gy][gx]
      if (cell.water) drawWaterCell(ctx, gx, gy, cam)
      else if (cell.road) drawRoadCell(ctx, gx, gy, cam, gx, gy)
      else if (cell.floors > 0) {
        drawBuilding(ctx, gx, gy, cell.floors, cell.district, cell.seed, cam, elapsed, audio, reducedMotion)
      } else drawLot(ctx, gx, gy, cell.district, cam)
    }
  }
}

function tileCorners(gx: number, gy: number, elev: number, cam: CameraState) {
  return [
    projectTile(gx, gy, elev, cam),
    projectTile(gx + 1, gy, elev, cam),
    projectTile(gx + 1, gy + 1, elev, cam),
    projectTile(gx, gy + 1, elev, cam),
  ]
}

function fillQuad(ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[], color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(pts[0].sx, pts[0].sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy)
  ctx.closePath()
  ctx.fill()
}

function drawWaterCell(ctx: CanvasRenderingContext2D, gx: number, gy: number, cam: CameraState) {
  const base = tileCorners(gx, gy, 0, cam)
  fillQuad(ctx, base, WATER.mid)
  const spec = rand01(0, gx, gy)
  if (spec > 0.7) {
    ctx.fillStyle = WATER.spec
    ctx.globalAlpha = 0.15
    fillQuad(ctx, base, WATER.spec)
    ctx.globalAlpha = 1
  }
}

function drawRoadCell(ctx: CanvasRenderingContext2D, gx: number, gy: number, cam: CameraState, _x: number, _y: number) {
  const base = tileCorners(gx, gy, 0, cam)
  fillQuad(ctx, base, (gx + gy) % 2 === 0 ? ROAD.dark : ROAD.light)
}

function drawLot(ctx: CanvasRenderingContext2D, gx: number, gy: number, district: keyof typeof DISTRICTS, cam: CameraState) {
  const style = DISTRICTS[district]
  const base = tileCorners(gx, gy, 0, cam)
  fillQuad(ctx, base, style.base)
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  district: keyof typeof DISTRICTS,
  seed: number,
  cam: CameraState,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
) {
  const style = DISTRICTS[district]
  const h = floors * 0.35
  const base = tileCorners(gx, gy, 0, cam)
  const roof = tileCorners(gx, gy, h, cam)

  fillQuad(ctx, base, style.base)

  const leftWall = [base[0], base[3], roof[3], roof[0]]
  const rightWall = [base[1], base[2], roof[2], roof[1]]
  fillQuad(ctx, leftWall, shade(style.base, -0.08))
  fillQuad(ctx, rightWall, shade(style.top, 0.05))
  fillQuad(ctx, roof, style.top)

  drawWindows(ctx, gx, gy, floors, style, seed, leftWall, rightWall, elapsed, audio, reducedMotion)
}

function shade(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + amt))))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  gx: number,
  _gy: number,
  floors: number,
  style: (typeof DISTRICTS)[keyof typeof DISTRICTS],
  seed: number,
  left: { sx: number; sy: number }[],
  right: { sx: number; sy: number }[],
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
) {
  const pulse = reducedMotion ? 0.5 : 0.35 + audio.bass * 0.65
  for (let f = 0; f < floors; f++) {
    const lit = rand01(seed, f, 1) > 0.35
    if (!lit) continue
    const flicker = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 0.003 + seed + f + gx)
    const t = (f + 0.5) / floors
    const lx = left[0].sx + (left[3].sx - left[0].sx) * t
    const ly = left[0].sy + (left[3].sy - left[0].sy) * t
    const rx = right[0].sx + (right[3].sx - right[0].sx) * t
    const ry = right[0].sy + (right[3].sy - right[0].sy) * t
    ctx.fillStyle = style.window
    ctx.globalAlpha = pulse * flicker * 0.9
    ctx.fillRect(lx, ly - 2, 2, 2)
    ctx.fillRect(rx, ry - 2, 2, 2)
    ctx.globalAlpha = 1
  }
}

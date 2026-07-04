import { DISTRICTS } from '../world/districts'
import type { CityGrid } from '../world/cityGen'
import type { CameraState } from '../world/types'
import { drawFireEscape, drawStaticRoofClutter } from './buildingDetails'
import { fillQuad, shade, tileCorners } from './drawUtils'

const ROAD = { dark: '#1a1a22', light: '#2a2a34' }
const WATER = { mid: '#0a1420' }

export function drawCityStatic(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
) {
  const { size, cells } = grid
  for (let sum = 0; sum < size * 2; sum++) {
    for (let gx = 0; gx <= sum; gx++) {
      const gy = sum - gx
      if (gx >= size || gy >= size) continue
      const cell = cells[gy][gx]
      if (cell.water) drawWaterCell(ctx, gx, gy, cam)
      else if (cell.road) drawRoadCell(ctx, gx, gy, cam)
      else if (cell.floors > 0) drawBuildingShell(ctx, gx, gy, cell.floors, cell.district, cell.seed, cam)
      else drawLot(ctx, gx, gy, cell.district, cam)
    }
  }
}

function drawWaterCell(ctx: CanvasRenderingContext2D, gx: number, gy: number, cam: CameraState) {
  fillQuad(ctx, tileCorners(gx, gy, 0, cam), WATER.mid)
}

function drawRoadCell(ctx: CanvasRenderingContext2D, gx: number, gy: number, cam: CameraState) {
  fillQuad(ctx, tileCorners(gx, gy, 0, cam), (gx + gy) % 2 === 0 ? ROAD.dark : ROAD.light)
}

function drawLot(ctx: CanvasRenderingContext2D, gx: number, gy: number, district: keyof typeof DISTRICTS, cam: CameraState) {
  fillQuad(ctx, tileCorners(gx, gy, 0, cam), DISTRICTS[district].base)
}

function drawBuildingShell(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  district: keyof typeof DISTRICTS,
  seed: number,
  cam: CameraState,
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
  drawFireEscape(ctx, gx, gy, floors, seed, leftWall, cam)
  drawStaticRoofClutter(ctx, gx, gy, floors, district, seed, cam)
}

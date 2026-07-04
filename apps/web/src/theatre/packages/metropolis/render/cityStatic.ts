import { buildVisibleChunks, iterateVisibleCells } from '../world/chunks'
import type { CityGrid } from '../world/cityGen'
import type { CameraState } from '../world/types'
import { drawArchetypeShell } from './archetypeShell'
import { drawFireEscape, drawStaticRoofClutter } from './buildingDetails'
import { drawLotDressing } from './lotDressing'
import { fillQuad, tileCorners } from './drawUtils'
import { roadKind } from '../world/roads'
import { archetypeById } from '../world/buildingArchetypes'
import { DISTRICTS } from '../world/districts'

const ROAD = {
  dark: '#1a1a22',
  light: '#2a2a34',
  highway: '#222230',
  rail: '#2a2838',
}
const WATER = { mid: '#0a1420' }

export function drawCityStatic(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  cssW: number,
  cssH: number,
) {
  const visible = buildVisibleChunks(grid.size, cam, cssW, cssH)
  iterateVisibleCells(grid.size, visible, (gx, gy) => {
    const cell = grid.cells[gy][gx]
    if (cell.water) fillQuad(ctx, tileCorners(gx, gy, 0, cam), WATER.mid)
    else if (cell.rail) fillQuad(ctx, tileCorners(gx, gy, 0, cam), ROAD.rail)
    else if (cell.road) drawRoadCell(ctx, gx, gy, cam, grid.size)
    else if (cell.floors > 0) drawBuildingStatic(ctx, gx, gy, cell, cam)
    else {
      fillQuad(ctx, tileCorners(gx, gy, 0, cam), DISTRICTS[cell.district].base)
      drawLotDressing(ctx, gx, gy, cell, cam)
    }
  })
}

function drawRoadCell(ctx: CanvasRenderingContext2D, gx: number, gy: number, cam: CameraState, size: number) {
  const kind = roadKind(gx, gy, size)
  const color = kind === 'highway' ? ROAD.highway : (gx + gy) % 2 === 0 ? ROAD.dark : ROAD.light
  fillQuad(ctx, tileCorners(gx, gy, 0, cam), color)
}

function drawBuildingStatic(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cell: CityGrid['cells'][0][0],
  cam: CameraState,
) {
  const arch = archetypeById(cell.archetypeId)
  drawArchetypeShell(ctx, gx, gy, cell.floors, cell.district, cell.archetypeId, cam)
  if (arch.hasFireEscape) {
    const h = cell.floors * 0.35
    const inset = arch.inset
    const base = tileCorners(gx + inset, gy + inset, 0, cam)
    const roof = tileCorners(gx + inset, gy + inset, h, cam)
    const leftWall = [base[0], base[3], roof[3], roof[0]]
    drawFireEscape(ctx, gx, gy, cell.floors, cell.seed, leftWall, cam)
  }
  drawStaticRoofClutter(ctx, gx, gy, cell.floors, cell.district, cell.seed, cam)
}

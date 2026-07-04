import { buildingElevation } from '../world/coords'
import { buildVisibleChunks, iterateVisibleCells } from '../world/chunks'
import {
  districtHorrorIntensity,
  districtStrobeIntensity,
  isHorrorDistrict,
  isNightlifeDistrict,
} from '../world/districtAudio'
import type { CityGrid } from '../world/cityGen'
import type { CameraState, DistrictId } from '../world/types'
import { tileCorners, fillQuad } from './drawUtils'
import type { DirectorState } from '../director/MetropolisDirector'

export function drawLocalizedEvents(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  cssW: number,
  cssH: number,
  director: DirectorState,
  elapsed: number,
  reducedMotion: boolean,
) {
  if (director.strobe <= 0 && director.horror <= 0) return
  const visible = buildVisibleChunks(grid.size, cam, cssW, cssH)
  iterateVisibleCells(grid.size, visible, (gx, gy) => {
    const cell = grid.cells[gy][gx]
    if (cell.floors <= 0) return
    if (director.strobe > 0 && isNightlifeDistrict(cell.district)) {
      drawStrobeSpill(ctx, gx, gy, cell.floors, cell.district, cam, director, elapsed, reducedMotion)
    }
    if (director.horror > 0 && isHorrorDistrict(cell.district)) {
      drawHorrorSpill(ctx, gx, gy, cell.floors, cell.district, cam, director, elapsed, reducedMotion)
    }
  })
}

function drawStrobeSpill(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  district: DistrictId,
  cam: CameraState,
  director: DirectorState,
  elapsed: number,
  reducedMotion: boolean,
) {
  const intensity = districtStrobeIntensity(district, director.strobe)
  if (intensity <= 0) return
  const flash = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsed * 0.035 + gx)
  const h = buildingElevation(floors)
  const base = tileCorners(gx, gy, 0, cam)
  const roof = tileCorners(gx, gy, h, cam)
  const left = [base[0], base[3], roof[3], roof[0]]
  ctx.fillStyle = `rgba(180,255,220,${intensity * flash * 0.22})`
  ctx.beginPath()
  ctx.moveTo(left[0].sx, left[0].sy)
  ctx.lineTo(left[1].sx, left[1].sy)
  ctx.lineTo(left[2].sx, left[2].sy)
  ctx.lineTo(left[3].sx, left[3].sy)
  ctx.closePath()
  ctx.fill()
}

function drawHorrorSpill(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  district: DistrictId,
  cam: CameraState,
  director: DirectorState,
  elapsed: number,
  reducedMotion: boolean,
) {
  const intensity = districtHorrorIntensity(district, director.horror)
  if (intensity <= 0) return
  const flicker = reducedMotion ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(elapsed * 0.04 + gy))
  ctx.globalAlpha = intensity * flicker * 0.35
  fillQuad(ctx, tileCorners(gx, gy, buildingElevation(floors) * 0.5, cam), '#224422')
  ctx.globalAlpha = 1
}

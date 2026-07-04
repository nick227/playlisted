import { DISTRICTS } from '../world/districts'
import { rand01 } from '../world/rng'
import type { CityGrid } from '../world/cityGen'
import type { CameraState, MetropolisAudio } from '../world/types'
import { drawNeonSign, drawTheatreMarquee } from './buildingDetails'
import { blackoutDim, fillQuad, tileCorners } from './drawUtils'

const WATER = { spec: '#4488aa' }
const ROAD = { wet: '#333348', line: '#444455' }

type DirectorFx = { blackout: number; blackoutWave: number; blackoutRolling: boolean }

export function drawCityDynamic(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
  director: DirectorFx,
) {
  const { size, cells } = grid
  for (let sum = 0; sum < size * 2; sum++) {
    for (let gx = 0; gx <= sum; gx++) {
      const gy = sum - gx
      if (gx >= size || gy >= size) continue
      const cell = cells[gy][gx]
      const dim = blackoutDim(gx, gy, size, director.blackoutWave, director.blackoutRolling, director.blackout)
      if (cell.water) drawWaterShimmer(ctx, gx, gy, cam, elapsed, reducedMotion, dim)
      else if (cell.road) drawWetRoad(ctx, gx, gy, cam, elapsed, reducedMotion, dim)
      else if (cell.floors > 0) {
        drawBuildingDynamic(ctx, gx, gy, cell.floors, cell.district, cell.seed, cam, elapsed, audio, reducedMotion, dim)
      }
    }
  }
}

function drawWaterShimmer(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
  dim: number,
) {
  const wave = reducedMotion ? 0.2 : 0.15 + 0.1 * Math.sin(elapsed * 0.002 + gx * 0.3)
  ctx.globalAlpha = wave * dim
  fillQuad(ctx, tileCorners(gx, gy, 0, cam), WATER.spec)
  ctx.globalAlpha = 1
}

function drawWetRoad(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
  dim: number,
) {
  const shimmer = reducedMotion ? 0.15 : 0.08 + 0.06 * Math.sin(elapsed * 0.004 + gx + gy)
  ctx.globalAlpha = shimmer * dim
  fillQuad(ctx, tileCorners(gx, gy, 0.02, cam), ROAD.wet)
  if ((gx + gy) % 8 === 0) {
    ctx.globalAlpha = 0.25 * dim
    fillQuad(ctx, tileCorners(gx, gy, 0.03, cam), ROAD.line)
  }
  ctx.globalAlpha = 1
}

function drawBuildingDynamic(
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
  dim: number,
) {
  const style = DISTRICTS[district]
  const h = floors * 0.35
  const base = tileCorners(gx, gy, 0, cam)
  const roof = tileCorners(gx, gy, h, cam)
  const leftWall = [base[0], base[3], roof[3], roof[0]]
  const rightWall = [base[1], base[2], roof[2], roof[1]]
  drawWindows(ctx, gx, floors, style, seed, leftWall, rightWall, elapsed, audio, reducedMotion, dim)
  drawNeonSign(ctx, gx, gy, floors, district, seed, rightWall, elapsed, reducedMotion)
  drawTheatreMarquee(ctx, district, seed, rightWall, elapsed, reducedMotion)
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  gx: number,
  floors: number,
  style: (typeof DISTRICTS)[keyof typeof DISTRICTS],
  seed: number,
  left: { sx: number; sy: number }[],
  right: { sx: number; sy: number }[],
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
  dim: number,
) {
  const pulse = reducedMotion ? 0.5 : 0.35 + audio.bass * 0.65
  for (let f = 0; f < floors; f++) {
    if (rand01(seed, f, 1) <= 0.35) continue
    const flicker = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 0.003 + seed + f + gx)
    const t = (f + 0.5) / floors
    const lx = left[0].sx + (left[3].sx - left[0].sx) * t
    const ly = left[0].sy + (left[3].sy - left[0].sy) * t
    const rx = right[0].sx + (right[3].sx - right[0].sx) * t
    const ry = right[0].sy + (right[3].sy - right[0].sy) * t
    ctx.fillStyle = style.window
    ctx.globalAlpha = pulse * flicker * 0.9 * dim
    ctx.fillRect(lx, ly - 2, 2, 2)
    ctx.fillRect(rx, ry - 2, 2, 2)
  }
  ctx.globalAlpha = 1
}

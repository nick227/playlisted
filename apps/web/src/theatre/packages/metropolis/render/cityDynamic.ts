import { METRO_SETTINGS } from '../world/constants'
import { districtAudioPulse, districtNeonBoost, districtChaosFlicker, isWaterfrontDistrict } from '../world/districtAudio'
import { buildVisibleChunks, iterateVisibleCells } from '../world/chunks'
import { archetypeById } from '../world/buildingArchetypes'
import { DISTRICTS } from '../world/districts'
import { rand01 } from '../world/rng'
import type { CityGrid } from '../world/cityGen'
import type { CameraState, MetropolisAudio } from '../world/types'
import { archetypeLeftRightWalls } from './archetypeShell'
import { drawNeonSign, drawTheatreMarquee } from './buildingDetails'
import { drawBoardedWindow, drawWindowGlow, shouldBoardWindow } from './facadeGrime'
import { blackoutDim, fillQuad, tileCorners } from './drawUtils'

const WATER = { spec: '#4488aa' }
const ROAD = { wet: '#333348', line: '#444455' }

type DirectorFx = {
  blackout: number
  blackoutWave: number
  blackoutRolling: boolean
  horror: number
  neonSurge: number
}

export function drawCityDynamic(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  cssW: number,
  cssH: number,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
  director: DirectorFx,
) {
  const visible = buildVisibleChunks(grid.size, cam, cssW, cssH)
  iterateVisibleCells(grid.size, visible, (gx, gy) => {
    const cell = grid.cells[gy][gx]
    const dim = blackoutDim(gx, gy, grid.size, director.blackoutWave, director.blackoutRolling, director.blackout)
    if (cell.water) drawWaterShimmer(ctx, gx, gy, cell.district, cam, elapsed, audio, reducedMotion, dim)
    else if (cell.road || cell.rail) drawWetRoad(ctx, gx, gy, cam, elapsed, reducedMotion, dim)
    else if (cell.floors > 0 && METRO_SETTINGS.renderMode !== 'graphicNovel') {
      drawBuildingDynamic(ctx, gx, gy, cell, cam, elapsed, audio, reducedMotion, dim, director)
    }
  })
}

function drawWaterShimmer(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  district: CityGrid['cells'][0][0]['district'],
  cam: CameraState,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
  dim: number,
) {
  const highsBoost = isWaterfrontDistrict(district) ? 1 + audio.highs * 0.5 : 1
  const wave = reducedMotion ? 0.2 : (0.15 + 0.1 * Math.sin(elapsed * 0.002 + gx * 0.3)) * highsBoost
  ctx.globalAlpha = Math.min(1, wave * dim)
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
  cell: CityGrid['cells'][0][0],
  cam: CameraState,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
  dim: number,
  director: DirectorFx,
) {
  const style = DISTRICTS[cell.district]
  const arch = archetypeById(cell.archetypeId)
  const { left, right } = archetypeLeftRightWalls(gx, gy, cell.floors, cell.archetypeId, cam)
  const chaosMul = districtChaosFlicker(cell.district, audio.chaos)
  const horrorFlicker = cell.district === 'horror' && director.horror > 0
    ? (reducedMotion ? 1 : 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 0.05 + cell.seed)))
    : 1
  drawWindows(
    ctx, gx, cell.floors, style, cell.district, cell.seed, arch.windowSparse,
    left, right, cam, elapsed, audio, reducedMotion, dim * horrorFlicker * chaosMul,
  )
  const neonBoost = districtNeonBoost(cell.district, director.neonSurge)
  drawNeonSign(ctx, gx, gy, cell.floors, cell.district, cell.seed, right, elapsed, reducedMotion, neonBoost)
  drawTheatreMarquee(ctx, cell.district, cell.seed, right, elapsed, reducedMotion)
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  gx: number,
  floors: number,
  style: (typeof DISTRICTS)[keyof typeof DISTRICTS],
  district: (typeof DISTRICTS)[keyof typeof DISTRICTS]['id'],
  seed: number,
  windowSparse: number,
  left: { sx: number; sy: number }[],
  right: { sx: number; sy: number }[],
  cam: CameraState,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
  dim: number,
) {
  const districtPulse = districtAudioPulse(district, audio)
  const pulse = reducedMotion ? 0.5 : districtPulse
  for (let f = 0; f < floors; f++) {
    const t = (f + 0.5) / floors
    const lx = left[0].sx + (left[3].sx - left[0].sx) * t
    const ly = left[0].sy + (left[3].sy - left[0].sy) * t
    const rx = right[0].sx + (right[3].sx - right[0].sx) * t
    const ry = right[0].sy + (right[3].sy - right[0].sy) * t
    if (shouldBoardWindow(style.id, seed, f)) {
      drawBoardedWindow(ctx, lx, ly)
      drawBoardedWindow(ctx, rx, ry)
      continue
    }
    if (rand01(seed, f, 1) <= windowSparse) continue
    const flicker = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 0.003 + seed + f + gx)
    const p = pulse * flicker * 0.9 * dim
    const win = Math.max(2, Math.round(2 * cam.zoom))
    if (f === 0 && (style.id === 'clubRow' || style.id === 'strip')) {
      drawWindowGlow(ctx, lx, ly, style.window, p * 1.2, cam.zoom)
      drawWindowGlow(ctx, rx, ry, style.window, p * 1.2, cam.zoom)
      continue
    }
    ctx.fillStyle = style.window
    ctx.globalAlpha = p
    ctx.fillRect(lx, ly - win, win, win)
    ctx.fillRect(rx, ry - win, win, win)
  }
  ctx.globalAlpha = 1
}

import { projectTile } from '../world/coords'
import type { CityGrid } from '../world/cityGen'
import type { CameraState, MetropolisAudio } from '../world/types'
import type { DirectorState } from '../director/MetropolisDirector'
import { smoothEntityPosition } from '../motion/entitySmooth'
import type { HumanDramaState, HumanFigure } from './humanFigure'
import {
  applyBeatReactions,
  applyBlackoutFreeze,
  applyChaosScatter,
  applyFireworksGaze,
  applyNeonArms,
  applySirenScatter,
  decayBob,
  decayVelocity,
  integrateScatter,
} from './humanReactions'
import { isOnRoadOrWater, queueReturnPull } from '../world/humanSpawn'

export type HumanBeatContext = {
  grid: CityGrid
  audio: MetropolisAudio
  director: DirectorState
  deltaMs: number
  reducedMotion: boolean
}

export function updateHumanDrama(state: HumanDramaState, ctx: HumanBeatContext) {
  const { grid, audio, director, deltaMs, reducedMotion } = ctx
  if (reducedMotion) return

  for (const fig of state.figures) {
    applyBeatReactions(fig, audio, deltaMs)
    applyNeonArms(fig, director.neonSurge, deltaMs)
    applyFireworksGaze(fig, director.fireworks, deltaMs)
    applyChaosScatter(fig, audio, deltaMs)
    applySirenScatter(fig, state.projectsGx, state.projectsGy, director.siren, deltaMs)
    decayBob(fig, deltaMs)

    const frozen = applyBlackoutFreeze(
      fig, fig.gx, fig.gy, grid.size,
      director, deltaMs,
    )

    if (!frozen) {
      if (fig.role === 'wanderer') updateWanderer(fig, grid, deltaMs, audio)
      else if (fig.role === 'queue') {
        queueReturnPull(fig, deltaMs, director.neonSurge)
        if (director.strobe > 0.5 && !reducedMotion) {
          fig.gx += Math.sin(fig.seed + director.elapsed * 0.02) * 0.002
        }
      }
      integrateScatter(fig, deltaMs)
      decayVelocity(fig, deltaMs)
    }

    ;[fig.displayGx, fig.displayGy] = smoothEntityPosition(
      fig.displayGx, fig.displayGy, fig.gx, fig.gy, deltaMs,
      fig.role === 'queue' ? 42 : 58,
    )
  }
}

function updateWanderer(fig: HumanFigure, grid: CityGrid, deltaMs: number, audio: MetropolisAudio) {
  const dt = deltaMs / 16.667
  const speedMul = 0.3 + audio.energy * 0.7
  let nx = fig.gx
  let ny = fig.gy
  if (fig.dir === 0 || fig.dir === 2) nx += fig.speed * speedMul * dt * (fig.dir === 2 ? -1 : 1)
  else ny += fig.speed * speedMul * dt * (fig.dir === 3 ? -1 : 1)

  if (isOnRoadOrWater(grid, nx, ny)) {
    fig.dir = ((fig.dir + 2) % 4) as HumanFigure['dir']
  } else {
    fig.gx = nx
    fig.gy = ny
  }
  if (fig.gx < 2 || fig.gx > grid.size - 3) fig.dir = (fig.dir === 0 ? 2 : 0) as HumanFigure['dir']
  if (fig.gy < 2 || fig.gy > grid.size - 3) fig.dir = (fig.dir === 1 ? 3 : 1) as HumanFigure['dir']
}

export function drawHumanDrama(
  ctx: CanvasRenderingContext2D,
  state: HumanDramaState,
  grid: CityGrid,
  cam: CameraState,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
) {
  for (const fig of state.figures) {
    const cell = grid.cells[Math.floor(fig.gy)]?.[Math.floor(fig.gx)]
    const elev = fig.role === 'rooftop'
      ? (cell?.floors ?? 1) * 0.35 + 0.05
      : 0.03
    const bob = reducedMotion ? 0 : fig.bob * Math.sin(elapsed * 0.012 + fig.seed)
    const p = projectTile(fig.displayGx, fig.displayGy, elev - bob, cam)
    drawFigure(ctx, p.sx, p.sy, fig, audio)
  }
}

function drawFigure(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  fig: HumanFigure,
  audio: MetropolisAudio,
) {
  const tint = fig.role === 'queue' ? '#d8c8b8' : fig.role === 'rooftop' ? '#8898a8' : '#b0a898'
  ctx.fillStyle = tint
  const h = fig.role === 'rooftop' ? 4 : 3
  ctx.fillRect(sx - 1, sy - h, 2, h)
  if (fig.armsUp > 0.2) {
    ctx.globalAlpha = fig.armsUp
    ctx.fillRect(sx - 2, sy - h - 2, 1, 2)
    ctx.fillRect(sx + 1, sy - h - 2, 1, 2)
    ctx.globalAlpha = 1
  }
  if (fig.freezeMs > 0) {
    ctx.fillStyle = `rgba(200,200,220,${0.25})`
    ctx.fillRect(sx - 2, sy - h - 1, 4, h + 2)
  }
  if (audio.beat && fig.role === 'queue') {
    ctx.fillStyle = `rgba(255,200,180,${0.15 + audio.bass * 0.2})`
    ctx.fillRect(sx - 2, sy + 1, 4, 1)
  }
}

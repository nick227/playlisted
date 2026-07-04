import type { CityGrid } from '../world/cityGen'
import type { HeroLandmark } from '../world/heroLandmarks'
import { cellAt } from '../world/cityGen'
import { rand01 } from '../world/rng'
import type { HumanFigure, HumanDramaState, HumanRole } from './humanFigure'
import { METRO_SETTINGS } from '../world/constants'

const QUEUE_HEROES = new Set(['clubFacade', 'grandTheatre', 'motelNeon'])

function pushFigure(
  out: HumanFigure[],
  id: number,
  gx: number,
  gy: number,
  role: HumanRole,
  seed: number,
  extra: Partial<HumanFigure> = {},
): number {
  out.push({
    id,
    gx,
    gy,
    displayGx: gx,
    displayGy: gy,
    role,
    dir: 1,
    speed: role === 'wanderer' ? 0.004 + (seed % 3) * 0.002 : 0,
    vx: 0,
    vy: 0,
    freezeMs: 0,
    scatterMs: 0,
    bob: 0,
    armsUp: 0,
    seed,
    queueSlot: 0,
    anchorGx: gx,
    anchorGy: gy,
    ...extra,
  })
  return id + 1
}

function spawnQueueAtHero(out: HumanFigure[], id: number, hero: HeroLandmark, length: number): number {
  for (let i = 0; i < length; i++) {
    const gx = hero.gx + 1.15 + i * 0.32
    const gy = hero.gy + 0.55 + (i % 2) * 0.08
    id = pushFigure(out, id, gx, gy, 'queue', hero.seed + i * 17, {
      queueSlot: i,
      anchorGx: gx,
      anchorGy: gy,
      dir: 0,
      speed: 0,
    })
  }
  return id
}

function spawnRooftops(out: HumanFigure[], id: number, grid: CityGrid): number {
  const { cells, size } = grid
  let count = 0
  for (let gy = 2; gy < size - 2 && count < 8; gy++) {
    for (let gx = 2; gx < size - 2 && count < 8; gx++) {
      const cell = cells[gy][gx]
      if (cell.floors < 4 || cell.road || cell.water) continue
      if (rand01(cell.seed, 21) > 0.94) continue
      const n = 1 + (cell.seed % 2)
      for (let i = 0; i < n; i++) {
        id = pushFigure(out, id, gx + 0.35 + i * 0.25, gy + 0.35, 'rooftop', cell.seed + i, {
          speed: 0,
          dir: 1,
        })
        count++
      }
    }
  }
  return id
}

function spawnWanderers(out: HumanFigure[], id: number, grid: CityGrid, count: number): number {
  let wanderers = 0
  for (let gy = 1; gy < grid.size - 1 && wanderers < count; gy++) {
    for (let gx = 1; gx < grid.size - 1 && wanderers < count; gx++) {
      const cell = grid.cells[gy][gx]
      if (cell.road || cell.water || cell.floors === 0) continue
      if ((gx * gy + id) % 11 !== 0) continue
      id = pushFigure(out, id, gx + 0.5, gy + 0.5, 'wanderer', cell.seed, {
        dir: (id % 4) as HumanFigure['dir'],
      })
      wanderers++
    }
  }
  return id
}

export function spawnHumanDrama(grid: CityGrid): HumanDramaState {
  const figures: HumanFigure[] = []
  let id = 0
  for (const hero of grid.heroes) {
    if (QUEUE_HEROES.has(hero.kind)) {
      id = spawnQueueAtHero(figures, id, hero, hero.kind === 'grandTheatre' ? 10 : 8)
    }
  }
  id = spawnRooftops(figures, id, grid)
  id = spawnWanderers(figures, id, grid, METRO_SETTINGS.pedestrianCount)

  const projects = grid.heroes.find((h) => h.kind === 'projectsYard')
  const projectsGx = projects?.gx ?? Math.floor(grid.size * 0.28)
  const projectsGy = projects?.gy ?? Math.floor(grid.size * 0.52)

  return { figures, projectsGx, projectsGy }
}

export function queueReturnPull(fig: HumanFigure, deltaMs: number, neonSurge: number) {
  if (fig.role !== 'queue') return
  const pull = deltaMs * 0.00002 * (1 + neonSurge * 0.5)
  fig.gx += (fig.anchorGx - fig.gx) * pull
  fig.gy += (fig.anchorGy - fig.gy) * pull
}

export function isOnRoadOrWater(grid: CityGrid, gx: number, gy: number): boolean {
  const cell = cellAt(grid, Math.floor(gx), Math.floor(gy))
  return cell?.road === true || cell?.water === true
}

import type { CityGrid } from '../world/cityGen'
import { cellAt } from '../world/cityGen'
import { projectTile } from '../world/coords'
import { smoothEntityPosition } from '../motion/entitySmooth'
import type { CameraState, PedestrianState } from '../world/types'

export function spawnPedestrians(grid: CityGrid, count: number): PedestrianState[] {
  const peds: PedestrianState[] = []
  let id = 0
  for (let gy = 1; gy < grid.size - 1 && peds.length < count; gy++) {
    for (let gx = 1; gx < grid.size - 1 && peds.length < count; gx++) {
      const cell = grid.cells[gy][gx]
      if (cell.road || cell.water || cell.floors === 0) continue
      if ((gx * gy + id) % 11 !== 0) continue
      const gx0 = gx + 0.5
      const gy0 = gy + 0.5
      peds.push({
        id: id++,
        gx: gx0,
        gy: gy0,
        displayGx: gx0,
        displayGy: gy0,
        dir: (id % 4) as PedestrianState['dir'],
        speed: 0.004 + (id % 3) * 0.002,
      })
    }
  }
  return peds
}

export function updatePedestrians(peds: PedestrianState[], grid: CityGrid, deltaMs: number) {
  const dt = deltaMs / 16.667
  for (const ped of peds) {
    const ix = Math.floor(ped.gx)
    const iy = Math.floor(ped.gy)
    let nx = ped.gx
    let ny = ped.gy
    if (ped.dir === 0 || ped.dir === 2) nx += ped.speed * dt * (ped.dir === 2 ? -1 : 1)
    else ny += ped.speed * dt * (ped.dir === 3 ? -1 : 1)

    const nix = Math.floor(nx)
    const niy = Math.floor(ny)
    const next = cellAt(grid, nix, niy)
    if (next?.road || next?.water) {
      ped.dir = ((ped.dir + 2) % 4) as PedestrianState['dir']
    } else {
      ped.gx = nx
      ped.gy = ny
    }

    if (ped.gx < 2 || ped.gx > grid.size - 3) {
      ped.dir = (ped.dir === 0 ? 2 : 0) as PedestrianState['dir']
    }
    if (ped.gy < 2 || ped.gy > grid.size - 3) {
      ped.dir = (ped.dir === 1 ? 3 : 1) as PedestrianState['dir']
    }

    ;[ped.displayGx, ped.displayGy] = smoothEntityPosition(
      ped.displayGx, ped.displayGy, ped.gx, ped.gy, deltaMs, 65,
    )
  }
}

export function drawPedestrians(
  ctx: CanvasRenderingContext2D,
  peds: PedestrianState[],
  cam: CameraState,
) {
  for (const ped of peds) {
    const p = projectTile(ped.displayGx, ped.displayGy, 0.02, cam)
    ctx.fillStyle = 'rgba(180,170,160,0.75)'
    ctx.fillRect(p.sx - 1, p.sy - 1, 2, 2)
  }
}

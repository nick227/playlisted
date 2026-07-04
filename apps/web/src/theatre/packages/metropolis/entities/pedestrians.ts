import type { CityGrid } from '../world/cityGen'
import { cellAt } from '../world/cityGen'
import { projectTile } from '../world/coords'
import type { CameraState, PedestrianState } from '../world/types'

export function spawnPedestrians(grid: CityGrid, count: number): PedestrianState[] {
  const peds: PedestrianState[] = []
  let id = 0
  for (let gy = 1; gy < grid.size - 1 && peds.length < count; gy++) {
    for (let gx = 1; gx < grid.size - 1 && peds.length < count; gx++) {
      const cell = grid.cells[gy][gx]
      if (cell.road || cell.water || cell.floors === 0) continue
      if ((gx * gy + id) % 11 !== 0) continue
      peds.push({
        id: id++,
        gx: gx + 0.5,
        gy: gy + 0.5,
        dir: (id % 4) as PedestrianState['dir'],
        speed: 0.004 + (id % 3) * 0.002,
      })
    }
  }
  return peds
}

export function updatePedestrians(peds: PedestrianState[], grid: CityGrid, dt: number) {
  for (const ped of peds) {
    if (ped.dir === 0 || ped.dir === 2) ped.gx += ped.speed * dt * (ped.dir === 2 ? -1 : 1)
    else ped.gy += ped.speed * dt * (ped.dir === 3 ? -1 : 1)
    const ix = Math.floor(ped.gx)
    const iy = Math.floor(ped.gy)
    const cell = cellAt(grid, ix, iy)
    if (cell?.road || cell?.water) {
      ped.dir = ((ped.dir + 2) % 4) as PedestrianState['dir']
    }
    if (ped.gx < 2 || ped.gx > grid.size - 3) ped.dir = (ped.dir === 0 ? 2 : 0) as PedestrianState['dir']
    if (ped.gy < 2 || ped.gy > grid.size - 3) ped.dir = (ped.dir === 1 ? 3 : 1) as PedestrianState['dir']
  }
}

export function drawPedestrians(
  ctx: CanvasRenderingContext2D,
  peds: PedestrianState[],
  cam: CameraState,
) {
  for (const ped of peds) {
    const p = projectTile(ped.gx, ped.gy, 0.02, cam)
    ctx.fillStyle = 'rgba(180,170,160,0.75)'
    ctx.fillRect(p.sx - 1, p.sy - 1, 2, 2)
  }
}

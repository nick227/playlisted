import type { CityGrid } from '../world/cityGen'
import { cellAt } from '../world/cityGen'
import { projectTile } from '../world/coords'
import { smoothEntityPosition } from '../motion/entitySmooth'
import type { CameraState, CarState } from '../world/types'

const CAR_COLORS = ['#cc2222', '#dddddd', '#2222aa', '#222222', '#c8a020']
const DIRS: CarState['dir'][] = [0, 1, 2, 3]

function deltaForDir(dir: CarState['dir']): [number, number] {
  if (dir === 0) return [1, 0]
  if (dir === 2) return [-1, 0]
  if (dir === 1) return [0, 1]
  return [0, -1]
}

function isRoadAt(grid: CityGrid, gx: number, gy: number): boolean {
  return cellAt(grid, gx, gy)?.road === true
}

function pickDir(grid: CityGrid, gx: number, gy: number, prefer: CarState['dir']): CarState['dir'] {
  const [pdx, pdy] = deltaForDir(prefer)
  if (isRoadAt(grid, gx + pdx, gy + pdy)) return prefer
  for (const d of DIRS) {
    const [dx, dy] = deltaForDir(d)
    if (isRoadAt(grid, gx + dx, gy + dy)) return d
  }
  return prefer
}

export function spawnTraffic(grid: CityGrid, count: number): CarState[] {
  const cars: CarState[] = []
  let id = 0
  for (let gy = 0; gy < grid.size && cars.length < count; gy++) {
    for (let gx = 0; gx < grid.size && cars.length < count; gx++) {
      const cell = grid.cells[gy][gx]
      if (!cell.road) continue
      if ((gx + gy + id) % 4 !== 0) continue
      const gx0 = gx + 0.5
      const gy0 = gy + 0.5
      cars.push({
        id: id++,
        gx: gx0,
        gy: gy0,
        displayGx: gx0,
        displayGy: gy0,
        dir: (gx % 2 === 0 ? 1 : 0) as 0 | 1,
        speed: 0.015 + (id % 4) * 0.004,
        headlight: id % 3 !== 0,
        trailX: gx0,
        trailY: gy0,
      })
    }
  }
  return cars
}

export function updateTraffic(
  cars: CarState[],
  grid: CityGrid,
  deltaMs: number,
  densityBoost = 0,
) {
  const dt = deltaMs / 16.667
  const speedMul = 1 + densityBoost * 0.35
  for (const car of cars) {
    car.trailX = car.displayGx
    car.trailY = car.displayGy

    const ix = Math.floor(car.gx)
    const iy = Math.floor(car.gy)
    const [dx, dy] = deltaForDir(car.dir)
    if (!isRoadAt(grid, ix + dx, iy + dy)) {
      car.dir = pickDir(grid, ix, iy, car.dir)
    }

    const [mx, my] = deltaForDir(car.dir)
    const spd = car.speed * speedMul * dt
    car.gx += mx * spd
    car.gy += my * spd

    if (car.gx < 1) car.gx += grid.size - 3
    if (car.gy < 1) car.gy += grid.size - 3
    if (car.gx > grid.size - 1) car.gx -= grid.size - 3
    if (car.gy > grid.size - 1) car.gy -= grid.size - 3

    ;[car.displayGx, car.displayGy] = smoothEntityPosition(
      car.displayGx, car.displayGy, car.gx, car.gy, deltaMs, 48,
    )
  }
}

export function drawTraffic(
  ctx: CanvasRenderingContext2D,
  cars: CarState[],
  cam: CameraState,
) {
  for (const car of cars) {
    const p = projectTile(car.displayGx, car.displayGy, 0.05, cam)
    const t = projectTile(car.trailX, car.trailY, 0.05, cam)
    if (car.headlight) {
      ctx.strokeStyle = 'rgba(255,220,160,0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(t.sx, t.sy)
      ctx.lineTo(p.sx, p.sy)
      ctx.stroke()
    }
    ctx.fillStyle = CAR_COLORS[car.id % CAR_COLORS.length]
    ctx.fillRect(p.sx - 3, p.sy - 2, 6, 3)
    if (car.headlight) {
      ctx.fillStyle = 'rgba(255,240,200,0.85)'
      const [mx, my] = deltaForDir(car.dir)
      ctx.fillRect(p.sx + (mx < 0 ? -5 : mx > 0 ? 3 : -1), p.sy + (my < 0 ? -3 : my > 0 ? 1 : -1), 2, 1)
    }
  }
}

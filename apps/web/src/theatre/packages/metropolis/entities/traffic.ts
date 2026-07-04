import type { CityGrid } from '../world/cityGen'
import { cellAt } from '../world/cityGen'
import { projectTile } from '../world/coords'
import type { CameraState, CarState } from '../world/types'

const CAR_COLORS = ['#cc2222', '#dddddd', '#2222aa', '#222222', '#c8a020']

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

export function updateTraffic(cars: CarState[], grid: CityGrid, dt: number, densityBoost = 0) {
  const speedMul = 1 + densityBoost * 0.35
  for (const car of cars) {
    car.trailX = car.gx
    car.trailY = car.gy
    const spd = car.speed * speedMul
    if (car.dir === 0 || car.dir === 2) car.gx += spd * dt * (car.dir === 2 ? -1 : 1)
    else car.gy += spd * dt * (car.dir === 3 ? -1 : 1)

    const ix = Math.floor(car.gx)
    const iy = Math.floor(car.gy)
    const cell = cellAt(grid, ix, iy)
    if (!cell?.road) {
      car.dir = ((car.dir + 1) % 4) as CarState['dir']
      car.gx = ix + 0.5
      car.gy = iy + 0.5
    }

    if (car.gx < 1) { car.gx = grid.size - 2; car.dir = 0 }
    if (car.gy < 1) { car.gy = grid.size - 2; car.dir = 1 }
    if (car.gx > grid.size - 1) { car.gx = 1; car.dir = 2 }
    if (car.gy > grid.size - 1) { car.gy = 1; car.dir = 3 }
  }
}

export function drawTraffic(
  ctx: CanvasRenderingContext2D,
  cars: CarState[],
  cam: CameraState,
) {
  for (const car of cars) {
    const p = projectTile(car.gx, car.gy, 0.05, cam)
    const t = projectTile(car.trailX, car.trailY, 0.05, cam)
    if (car.headlight) {
      ctx.strokeStyle = 'rgba(255,220,160,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(t.sx, t.sy)
      ctx.lineTo(p.sx, p.sy)
      ctx.stroke()
    }
    const color = CAR_COLORS[car.id % CAR_COLORS.length]
    ctx.fillStyle = color
    ctx.fillRect(p.sx - 3, p.sy - 2, 6, 3)
    if (car.headlight) {
      ctx.fillStyle = 'rgba(255,240,200,0.85)'
      ctx.fillRect(p.sx + (car.dir === 2 ? -5 : 3), p.sy - 1, 2, 1)
    }
  }
}

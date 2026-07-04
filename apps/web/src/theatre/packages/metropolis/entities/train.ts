import { METRO_SETTINGS } from '../world/constants'
import { projectTile } from '../world/coords'
import type { CityGrid } from '../world/cityGen'
import type { CameraState } from '../world/types'

export type TrainState = { progress: number; active: number }

export function createTrain(): TrainState {
  return { progress: 0, active: 0 }
}

export function updateTrain(state: TrainState, deltaMs: number, trainSignal: number): TrainState {
  let { progress, active } = state
  if (trainSignal > active) active = trainSignal
  active = Math.max(0, active - deltaMs * 0.00008)
  if (active > 0.05) progress += deltaMs * 0.000045
  if (progress > 1.15) progress = 0
  return { progress, active }
}

export function drawTrain(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  state: TrainState,
) {
  if (state.active <= 0.05) return
  const gy = METRO_SETTINGS.trainTrackGy
  const gx = state.progress * (grid.size + 4) - 2
  const elev = 0.12
  const front = projectTile(gx + 2.4, gy + 0.5, elev, cam)
  const back = projectTile(gx, gy + 0.5, elev, cam)
  const topF = projectTile(gx + 2.4, gy + 0.5, elev + 0.28, cam)
  const topB = projectTile(gx, gy + 0.5, elev + 0.28, cam)

  ctx.fillStyle = '#334455'
  ctx.beginPath()
  ctx.moveTo(back.sx, back.sy)
  ctx.lineTo(front.sx, front.sy)
  ctx.lineTo(topF.sx, topF.sy)
  ctx.lineTo(topB.sx, topB.sy)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#ffcc66'
  ctx.globalAlpha = state.active * 0.9
  ctx.fillRect(front.sx - 2, front.sy - 2, 3, 2)
  ctx.globalAlpha = state.active * 0.22
  ctx.fillStyle = '#ffeeaa'
  ctx.beginPath()
  ctx.moveTo(front.sx, front.sy)
  ctx.lineTo(front.sx + 22, front.sy - 10)
  ctx.lineTo(front.sx + 22, front.sy + 10)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

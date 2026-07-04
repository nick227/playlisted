import { DISTRICTS } from '../world/districts'
import type { CityCell } from '../world/types'
import { fillQuad, tileCorners } from './drawUtils'
import type { CameraState } from '../world/types'

export function drawLotDressing(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cell: CityCell,
  cam: CameraState,
) {
  if (cell.floors > 0 || cell.road || cell.water) return
  const base = tileCorners(gx, gy, 0, cam)
  if (cell.district === 'strip' || cell.district === 'rust') {
    drawParkingLot(ctx, base, cell.seed)
  } else if (cell.district === 'projects') {
    drawRubble(ctx, base, cell.seed)
  } else if (cell.district === 'park') {
    drawParkTrees(ctx, base, cell.seed)
  } else if (cell.district === 'industrial') {
    drawChainFence(ctx, base)
  }
}

function drawParkingLot(
  ctx: CanvasRenderingContext2D,
  base: { sx: number; sy: number }[],
  seed: number,
) {
  fillQuad(ctx, base, '#141418')
  ctx.strokeStyle = '#333340'
  ctx.lineWidth = 1
  const cx = (base[0].sx + base[2].sx) * 0.5
  const cy = (base[0].sy + base[2].sy) * 0.5
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 4 + (seed % 3)
    ctx.strokeRect(cx + ox - 2, cy - 3, 4, 6)
  }
}

function drawRubble(
  ctx: CanvasRenderingContext2D,
  base: { sx: number; sy: number }[],
  seed: number,
) {
  const cx = (base[0].sx + base[2].sx) * 0.5
  const cy = (base[0].sy + base[2].sy) * 0.5
  ctx.fillStyle = '#2a2820'
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx + (seed + i) % 5 - 2, cy + (seed >> i) % 4 - 2, 2, 2)
  }
}

function drawParkTrees(
  ctx: CanvasRenderingContext2D,
  base: { sx: number; sy: number }[],
  seed: number,
) {
  const cx = (base[0].sx + base[2].sx) * 0.5
  const cy = (base[0].sy + base[2].sy) * 0.5
  if (seed % 3 === 0) return
  ctx.fillStyle = '#1a3a1a'
  ctx.beginPath()
  ctx.arc(cx, cy - 3, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2a2018'
  ctx.fillRect(cx, cy - 1, 1, 3)
}

function drawChainFence(ctx: CanvasRenderingContext2D, base: { sx: number; sy: number }[]) {
  ctx.strokeStyle = '#4a5058'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(base[0].sx, base[0].sy)
  ctx.lineTo(base[1].sx, base[1].sy)
  ctx.stroke()
}

import type { DistrictId } from '../world/types'

const GRIME_DISTRICTS: DistrictId[] = ['rust', 'projects', 'horror']

export function shouldBoardWindow(district: DistrictId, seed: number, floor: number): boolean {
  if (!GRIME_DISTRICTS.includes(district)) return false
  const threshold = district === 'rust' ? 0.55 : district === 'projects' ? 0.45 : 0.35
  return ((seed + floor * 31) % 100) / 100 < threshold
}

export function drawBoardedWindow(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
) {
  ctx.fillStyle = '#3a3530'
  ctx.fillRect(sx - 2, sy - 3, 4, 4)
  ctx.strokeStyle = '#2a2520'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(sx - 2, sy - 3)
  ctx.lineTo(sx + 2, sy + 1)
  ctx.moveTo(sx + 2, sy - 3)
  ctx.lineTo(sx - 2, sy + 1)
  ctx.stroke()
}

export function drawWindowGlow(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  color: string,
  alpha: number,
  zoom = 1,
) {
  const size = Math.max(3, Math.round(3 * zoom))
  const glowR = 4 + zoom * 5
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  ctx.fillRect(sx - size * 0.5, sy - size * 0.5, size, size)
  ctx.globalAlpha = alpha * 0.28
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(sx, sy, glowR, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

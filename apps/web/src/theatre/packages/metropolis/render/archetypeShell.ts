import { archetypeById } from '../world/buildingArchetypes'
import { DISTRICTS } from '../world/districts'
import type { DistrictId } from '../world/types'
import { buildingElevation } from '../world/coords'
import { fillQuad, shade, tileCorners } from './drawUtils'
import type { CameraState } from '../world/types'

type Pt = { sx: number; sy: number }

export function drawArchetypeShell(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  district: DistrictId,
  archetypeId: number,
  cam: CameraState,
) {
  const arch = archetypeById(archetypeId)
  const style = DISTRICTS[district]
  const inset = arch.inset
  const h = buildingElevation(floors, cam.zoom)
  const base = tileCorners(gx + inset, gy + inset, 0, cam)
  const roof = tileCorners(gx + inset, gy + inset, h, cam)
  const leftWall = [base[0], base[3], roof[3], roof[0]]
  const rightWall = [base[1], base[2], roof[2], roof[1]]
  fillQuad(ctx, leftWall, shade(style.base, -0.22))
  fillQuad(ctx, rightWall, shade(style.top, -0.06))

  if (arch.roofStyle === 'peaked') {
    drawPeakedRoof(ctx, roof, style.top, cam.zoom)
  } else if (arch.roofStyle === 'tar') {
    fillQuad(ctx, roof, shade(style.top, -0.18))
    ctx.fillStyle = '#1a1a1a'
    ctx.globalAlpha = 0.35
    fillQuad(ctx, roof, '#1a1a1a')
    ctx.globalAlpha = 1
  } else {
    fillQuad(ctx, roof, shade(style.top, 0.12))
  }
  strokeRoofEdge(ctx, roof, style.accent)

  if (arch.hasBillboard) drawBillboard(ctx, rightWall, style.accent, cam.zoom)
  if (arch.hasAntenna) drawAntenna(ctx, roof, cam.zoom)
}

function strokeRoofEdge(ctx: CanvasRenderingContext2D, roof: Pt[], accent: string) {
  ctx.strokeStyle = shade(accent, -0.35)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(roof[0].sx, roof[0].sy)
  for (let i = 1; i < roof.length; i++) ctx.lineTo(roof[i].sx, roof[i].sy)
  ctx.closePath()
  ctx.stroke()
}

function drawPeakedRoof(ctx: CanvasRenderingContext2D, roof: Pt[], color: string, zoom: number) {
  const peakLift = 4 + zoom * 8
  const peak = {
    sx: (roof[0].sx + roof[2].sx) * 0.5,
    sy: (roof[0].sy + roof[2].sy) * 0.5 - peakLift,
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(roof[0].sx, roof[0].sy)
  ctx.lineTo(peak.sx, peak.sy)
  ctx.lineTo(roof[1].sx, roof[1].sy)
  ctx.lineTo(roof[2].sx, roof[2].sy)
  ctx.closePath()
  ctx.fill()
}

function drawBillboard(ctx: CanvasRenderingContext2D, rightWall: Pt[], accent: string, zoom: number) {
  const w = 6 + zoom * 4
  const sx = rightWall[1].sx - w
  const sy = rightWall[1].sy - 10 - zoom * 4
  ctx.fillStyle = '#222'
  ctx.fillRect(sx, sy, w + 2, 4 + zoom * 2)
  ctx.fillStyle = accent
  ctx.fillRect(sx + 1, sy + 1, w, 2 + zoom)
}

function drawAntenna(ctx: CanvasRenderingContext2D, roof: Pt[], zoom: number) {
  const cx = (roof[0].sx + roof[2].sx) * 0.5
  const cy = (roof[0].sy + roof[2].sy) * 0.5
  const h = 8 + zoom * 10
  ctx.strokeStyle = '#667788'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy - h)
  ctx.stroke()
}

export function archetypeLeftRightWalls(
  gx: number,
  gy: number,
  floors: number,
  archetypeId: number,
  cam: CameraState,
): { left: Pt[]; right: Pt[] } {
  const inset = archetypeById(archetypeId).inset
  const h = buildingElevation(floors, cam.zoom)
  const base = tileCorners(gx + inset, gy + inset, 0, cam)
  const roof = tileCorners(gx + inset, gy + inset, h, cam)
  return {
    left: [base[0], base[3], roof[3], roof[0]],
    right: [base[1], base[2], roof[2], roof[1]],
  }
}

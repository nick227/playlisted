import { buildingElevation } from '../world/coords'
import type { ComposedBlock } from '../world/composedScene'
import { panelDistrictStyle } from '../world/composedScene'
import type { CameraState } from '../world/types'
import { fillQuad, shade, tileCorners } from './drawUtils'

type Pt = { sx: number; sy: number }

function blockFootprint(gx: number, gy: number, tw: number, td: number, elev: number, cam: CameraState): Pt[] {
  return [
    tileCorners(gx, gy, elev, cam)[0],
    tileCorners(gx + tw, gy, elev, cam)[1],
    tileCorners(gx + tw, gy + td, elev, cam)[2],
    tileCorners(gx, gy + td, elev, cam)[3],
  ]
}

function blockWalls(
  block: ComposedBlock,
  cam: CameraState,
): { left: Pt[]; right: Pt[]; roof: Pt[]; base: Pt[]; h: number } {
  const h = buildingElevation(block.floors, cam.zoom)
  const base = blockFootprint(block.gx, block.gy, block.tw, block.td, 0, cam)
  const roof = blockFootprint(block.gx, block.gy, block.tw, block.td, h, cam)
  return {
    base,
    roof,
    h,
    left: [base[0], base[3], roof[3], roof[0]],
    right: [base[1], base[2], roof[2], roof[1]],
  }
}

function outlineQuad(ctx: CanvasRenderingContext2D, pts: Pt[], color = '#06060c') {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pts[0].sx, pts[0].sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy)
  ctx.closePath()
  ctx.stroke()
}

function drawBlockMass(ctx: CanvasRenderingContext2D, block: ComposedBlock, cam: CameraState) {
  const style = panelDistrictStyle(block.district)
  const { left, right, roof } = blockWalls(block, cam)
  fillQuad(ctx, left, shade(style.base, -0.28))
  fillQuad(ctx, right, shade(style.top, -0.1))
  fillQuad(ctx, roof, shade(style.top, 0.15))
  outlineQuad(ctx, left)
  outlineQuad(ctx, right)
  outlineQuad(ctx, roof)
}

export function drawGraphicNovelBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: ComposedBlock[],
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
) {
  const sorted = [...blocks].sort((a, b) => a.gx + a.gy - (b.gx + b.gy))
  for (const block of sorted) {
    if (block.kind === 'alleyGap') {
      drawAlley(ctx, block, cam)
      continue
    }
    drawBlockMass(ctx, block, cam)
    switch (block.kind) {
      case 'grandTheatre': drawTheatreIllustration(ctx, block, cam, elapsed, reducedMotion); break
      case 'clubFacade': drawClubIllustration(ctx, block, cam, elapsed, reducedMotion); break
      case 'motelNeon': drawMotelIllustration(ctx, block, cam, elapsed, reducedMotion); break
      case 'projectsBlock': drawProjectsIllustration(ctx, block, cam, elapsed, reducedMotion); break
      case 'cornerDiner': drawDinerIllustration(ctx, block, cam, elapsed); break
      case 'walkupRow': drawWalkupSilhouette(ctx, block, cam); break
      case 'skylineTower': drawTowerSilhouette(ctx, block, cam); break
    }
  }
}

function drawAlley(ctx: CanvasRenderingContext2D, block: ComposedBlock, cam: CameraState) {
  const base = blockFootprint(block.gx, block.gy, block.tw, block.td, 0, cam)
  fillQuad(ctx, base, '#050508')
  const cx = (base[0].sx + base[2].sx) * 0.5
  const cy = (base[0].sy + base[2].sy) * 0.5
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40)
  g.addColorStop(0, 'rgba(255,180,100,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(cx - 40, cy - 30, 80, 60)
}

function drawTheatreIllustration(
  ctx: CanvasRenderingContext2D,
  block: ComposedBlock,
  cam: CameraState,
  elapsed: number,
  reduced: boolean,
) {
  const { right, roof, h } = blockWalls(block, cam)
  const pulse = reduced ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 0.004)
  const marqueeY = right[1].sy - h * cam.zoom * 0.35
  const mx = right[1].sx - 28
  ctx.fillStyle = '#1a0810'
  ctx.fillRect(mx, marqueeY, 56, 14)
  ctx.strokeStyle = '#08060a'
  ctx.lineWidth = 2
  ctx.strokeRect(mx, marqueeY, 56, 14)
  ctx.fillStyle = '#ff2244'
  ctx.globalAlpha = pulse
  ctx.fillRect(mx + 4, marqueeY + 3, 48, 8)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffcc88'
  ctx.font = 'bold 9px monospace'
  ctx.fillText('PALACE', mx + 10, marqueeY + 10)
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 4
    const px = right[0].sx + (right[1].sx - right[0].sx) * t
    const py = right[0].sy + (right[1].sy - right[0].sy) * t
    ctx.fillStyle = '#ccb8a0'
    ctx.fillRect(px - 2, py - h * cam.zoom * 0.5, 4, h * cam.zoom * 0.45)
  }
  ctx.fillStyle = '#ffeecc'
  ctx.fillRect(roof[0].sx + 8, roof[0].sy - 24, 4, 20)
}

function drawClubIllustration(
  ctx: CanvasRenderingContext2D,
  block: ComposedBlock,
  cam: CameraState,
  elapsed: number,
  reduced: boolean,
) {
  const { right, h } = blockWalls(block, cam)
  const strobe = reduced ? 0.5 : 0.45 + 0.55 * Math.abs(Math.sin(elapsed * 0.018))
  const sx = right[0].sx + 4
  const sy = right[0].sy - h * cam.zoom * 0.55
  ctx.fillStyle = '#0a1818'
  ctx.fillRect(sx, sy, 22, h * cam.zoom * 0.5)
  ctx.strokeStyle = '#06060c'
  ctx.lineWidth = 2
  ctx.strokeRect(sx, sy, 22, h * cam.zoom * 0.5)
  ctx.fillStyle = `rgba(0,255,200,${strobe * 0.85})`
  ctx.fillRect(sx + 2, sy + 4, 18, 6)
  ctx.fillStyle = `rgba(255,0,180,${strobe * 0.5})`
  ctx.fillRect(sx + 4, sy + 14, 14, 4)
}

function drawMotelIllustration(
  ctx: CanvasRenderingContext2D,
  block: ComposedBlock,
  cam: CameraState,
  elapsed: number,
  reduced: boolean,
) {
  const { right, h } = blockWalls(block, cam)
  const flicker = reduced ? 1 : 0.82 + 0.18 * Math.sin(elapsed * 0.009 + block.seed)
  const sx = right[1].sx - 36
  const sy = right[1].sy - h * cam.zoom * 0.65
  ctx.fillStyle = '#ff44cc'
  ctx.globalAlpha = flicker * 0.35
  ctx.fillRect(sx - 4, sy - 6, 44, 16)
  ctx.globalAlpha = flicker
  ctx.fillRect(sx, sy, 36, 8)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffe0f8'
  ctx.font = 'bold 8px monospace'
  ctx.fillText('MOTEL', sx + 4, sy + 7)
}

function drawProjectsIllustration(
  ctx: CanvasRenderingContext2D,
  block: ComposedBlock,
  cam: CameraState,
  elapsed: number,
  reduced: boolean,
) {
  const { left, h } = blockWalls(block, cam)
  const flicker = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(elapsed * 0.007)
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 5
    const px = left[0].sx + (left[3].sx - left[0].sx) * t
    const py = left[0].sy + (left[3].sy - left[0].sy) * t
    ctx.fillStyle = '#2a2830'
    ctx.fillRect(px - 5, py - h * cam.zoom * 0.35, 10, h * cam.zoom * 0.3)
    ctx.fillStyle = `rgba(255,140,40,${flicker * 0.8})`
    ctx.fillRect(px - 2, py - h * cam.zoom * 0.25, 4, 4)
  }
}

function drawDinerIllustration(ctx: CanvasRenderingContext2D, block: ComposedBlock, cam: CameraState, elapsed: number) {
  const { right, roof } = blockWalls(block, cam)
  const sx = (right[0].sx + right[1].sx) * 0.5 - 14
  const sy = roof[0].sy - 8
  ctx.fillStyle = '#886644'
  ctx.beginPath()
  ctx.arc(sx + 14, sy, 12, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#06060c'
  ctx.lineWidth = 2
  ctx.stroke()
  const glow = 0.5 + 0.5 * Math.sin(elapsed * 0.005)
  ctx.fillStyle = `rgba(255,200,120,${glow * 0.9})`
  ctx.fillRect(sx + 4, sy + 2, 20, 3)
}

function drawWalkupSilhouette(ctx: CanvasRenderingContext2D, block: ComposedBlock, cam: CameraState) {
  const { left, right, roof } = blockWalls(block, cam)
  ctx.fillStyle = '#181420'
  fillQuad(ctx, left, '#141018')
  fillQuad(ctx, right, '#1a1420')
  fillQuad(ctx, roof, '#221828')
  outlineQuad(ctx, roof, '#0a0810')
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6
    const lx = left[0].sx + (left[3].sx - left[0].sx) * t
    const ly = left[0].sy + (left[3].sy - left[0].sy) * t
    ctx.fillStyle = '#554466'
    ctx.fillRect(lx - 2, ly - 6, 3, 4)
  }
}

function drawTowerSilhouette(ctx: CanvasRenderingContext2D, block: ComposedBlock, cam: CameraState) {
  const { roof, h } = blockWalls(block, cam)
  const cx = (roof[0].sx + roof[2].sx) * 0.5
  const cy = roof[0].sy
  ctx.fillStyle = '#0c1018'
  ctx.fillRect(cx - 6, cy - h * cam.zoom - 20, 12, h * cam.zoom + 20)
  ctx.strokeStyle = '#6688aa'
  ctx.lineWidth = 1
  ctx.strokeRect(cx - 6, cy - h * cam.zoom - 20, 12, h * cam.zoom + 20)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#aaccff'
    ctx.fillRect(cx - 3, cy - i * 14 - 8, 6, 3)
  }
}

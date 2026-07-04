import { projectTile } from '../world/coords'
import type { HeroLandmark } from '../world/heroLandmarks'
import type { CityGrid } from '../world/cityGen'
import type { CameraState } from '../world/types'
import { archetypeLeftRightWalls } from './archetypeShell'

export function drawHeroLandmarks(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
) {
  for (const hero of grid.heroes) {
    const cell = grid.cells[hero.gy][hero.gx]
    if (cell.floors <= 0) continue
    const { right } = archetypeLeftRightWalls(hero.gx, hero.gy, cell.floors, cell.archetypeId, cam)
    const roof = projectTile(hero.gx + 0.5, hero.gy + 0.5, cell.floors * 0.35, cam)
    switch (hero.kind) {
      case 'grandTheatre': drawGrandTheatre(ctx, right, roof, elapsed, reducedMotion); break
      case 'motelNeon': drawMotelNeon(ctx, right, elapsed, reducedMotion, hero.seed); break
      case 'hospital': drawHospital(ctx, right, roof, elapsed, reducedMotion); break
      case 'skylineTower': drawSkylineTower(ctx, roof, cell.floors); break
      case 'clubFacade': drawClubFacade(ctx, right, elapsed, reducedMotion); break
      case 'projectsYard': drawProjectsYard(ctx, hero.gx, hero.gy, cam, elapsed, reducedMotion); break
      case 'waterfrontPier': drawWaterfrontPier(ctx, hero.gx, hero.gy, cam); break
      case 'industrialStack': drawIndustrialStack(ctx, roof); break
    }
  }
}

type Pt = { sx: number; sy: number }

function drawGrandTheatre(ctx: CanvasRenderingContext2D, right: Pt[], roof: Pt, elapsed: number, reduced: boolean) {
  const pulse = reduced ? 1 : 0.65 + 0.35 * Math.sin(elapsed * 0.004)
  const sx = right[1].sx - 10
  const sy = right[1].sy - 14
  ctx.fillStyle = '#ff2244'
  ctx.globalAlpha = pulse
  ctx.fillRect(sx, sy, 18, 4)
  ctx.fillStyle = '#ffcc88'
  ctx.fillRect(sx + 2, sy + 6, 14, 3)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffeecc'
  ctx.fillRect(roof.sx - 1, roof.sy - 16, 3, 12)
}

function drawMotelNeon(ctx: CanvasRenderingContext2D, right: Pt[], elapsed: number, reduced: boolean, seed: number) {
  const flicker = reduced ? 1 : 0.8 + 0.2 * Math.sin(elapsed * 0.009 + seed)
  const sx = right[0].sx + 2
  const sy = right[0].sy - 12
  ctx.fillStyle = '#ff44cc'
  ctx.globalAlpha = flicker * 0.4
  ctx.fillRect(sx - 2, sy - 4, 22, 8)
  ctx.globalAlpha = flicker
  ctx.fillRect(sx, sy - 2, 18, 4)
  ctx.globalAlpha = 1
}

function drawHospital(ctx: CanvasRenderingContext2D, right: Pt[], roof: Pt, elapsed: number, reduced: boolean) {
  const pulse = reduced ? 1 : 0.5 + 0.5 * Math.sin(elapsed * 0.006)
  const cx = (roof.sx + right[1].sx) * 0.5
  const cy = roof.sy - 8
  ctx.fillStyle = `rgba(80,200,80,${0.25 * pulse})`
  ctx.beginPath()
  ctx.arc(cx, cy, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#cc2222'
  ctx.fillRect(cx - 5, cy - 1, 10, 2)
  ctx.fillRect(cx - 1, cy - 5, 2, 10)
}

function drawSkylineTower(ctx: CanvasRenderingContext2D, roof: Pt, floors: number) {
  const cx = roof.sx
  const cy = roof.sy
  ctx.strokeStyle = '#6688aa'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy - 18 - floors)
  ctx.stroke()
  ctx.fillStyle = '#aaccff'
  ctx.fillRect(cx - 2, cy - 6, 4, 3)
}

function drawClubFacade(ctx: CanvasRenderingContext2D, right: Pt[], elapsed: number, reduced: boolean) {
  const strobe = reduced ? 0.5 : 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 0.02))
  ctx.fillStyle = `rgba(0,255,180,${strobe * 0.5})`
  ctx.fillRect(right[0].sx, right[0].sy - 16, 8, 14)
}

function drawProjectsYard(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cam: CameraState,
  elapsed: number,
  reduced: boolean,
) {
  const p = projectTile(gx + 0.7, gy + 0.7, 0.05, cam)
  const flicker = reduced ? 0.7 : 0.5 + 0.5 * Math.sin(elapsed * 0.007)
  ctx.fillStyle = `rgba(255,120,40,${flicker * 0.7})`
  ctx.beginPath()
  ctx.arc(p.sx, p.sy, 4, 0, Math.PI * 2)
  ctx.fill()
}

function drawWaterfrontPier(ctx: CanvasRenderingContext2D, gx: number, gy: number, cam: CameraState) {
  const a = projectTile(gx, gy + 1, 0, cam)
  const b = projectTile(gx + 1.5, gy + 1.2, 0, cam)
  ctx.strokeStyle = '#556677'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(a.sx, a.sy)
  ctx.lineTo(b.sx, b.sy)
  ctx.stroke()
  for (let i = 0; i < 4; i++) {
    const t = i / 3
    const px = a.sx + (b.sx - a.sx) * t
    const py = a.sy + (b.sy - a.sy) * t
    ctx.fillRect(px - 1, py - 4, 2, 4)
  }
}

function drawIndustrialStack(ctx: CanvasRenderingContext2D, roof: Pt) {
  ctx.fillStyle = '#3a3a40'
  ctx.fillRect(roof.sx - 3, roof.sy - 20, 6, 18)
  ctx.fillStyle = '#555560'
  ctx.fillRect(roof.sx - 2, roof.sy - 22, 4, 3)
}

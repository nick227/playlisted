import { projectTile } from '../world/coords'
import type { Landmark } from '../world/cityProps'
import type { CameraState } from '../world/types'

export function drawWaterfrontLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
) {
  for (const lm of landmarks) {
    if (lm.kind === 'crane') drawCrane(ctx, lm.gx, lm.gy, cam, elapsed, reducedMotion)
    else if (lm.kind === 'boat') drawBoat(ctx, lm.gx, lm.gy, cam, elapsed, reducedMotion)
    else if (lm.kind === 'spotlight') drawSpotlight(ctx, lm.gx, lm.gy, cam, elapsed, reducedMotion, lm.seed)
    else drawBillboardTower(ctx, lm.gx, lm.gy, cam)
  }
}

function drawCrane(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
) {
  const base = projectTile(gx, gy, 0, cam)
  const top = projectTile(gx, gy, 1.8, cam)
  const arm = projectTile(gx + 0.8, gy - 0.3, 1.6, cam)
  ctx.strokeStyle = '#556677'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(base.sx, base.sy)
  ctx.lineTo(top.sx, top.sy)
  ctx.lineTo(arm.sx, arm.sy)
  ctx.stroke()
  const swing = reducedMotion ? 0 : Math.sin(elapsed * 0.0008 + gx) * 0.15
  const hook = projectTile(gx + 0.8 + swing, gy - 0.3, 0.6, cam)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(arm.sx, arm.sy)
  ctx.lineTo(hook.sx, hook.sy)
  ctx.stroke()
}

function drawBoat(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
) {
  const bob = reducedMotion ? 0 : Math.sin(elapsed * 0.001 + gy) * 0.04
  const stern = projectTile(gx, gy + bob, 0.05, cam)
  const bow = projectTile(gx + 0.7, gy + bob, 0.05, cam)
  ctx.fillStyle = '#1a2838'
  ctx.beginPath()
  ctx.moveTo(stern.sx, stern.sy)
  ctx.lineTo(bow.sx, bow.sy - 2)
  ctx.lineTo(bow.sx, bow.sy + 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#8899aa'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(bow.sx - 4, bow.sy - 6)
  ctx.lineTo(bow.sx - 4, bow.sy)
  ctx.stroke()
}

function drawSpotlight(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cam: CameraState,
  elapsed: number,
  reducedMotion: boolean,
  seed: number,
) {
  const p = projectTile(gx, gy, 0.5, cam)
  const angle = reducedMotion ? 0.4 : 0.4 + Math.sin(elapsed * 0.0006 + seed) * 0.35
  ctx.fillStyle = 'rgba(255,255,240,0.08)'
  ctx.beginPath()
  ctx.moveTo(p.sx, p.sy)
  ctx.lineTo(p.sx + Math.cos(angle) * 80, p.sy + Math.sin(angle) * 40 - 30)
  ctx.lineTo(p.sx + Math.cos(angle + 0.12) * 80, p.sy + Math.sin(angle + 0.12) * 40 - 30)
  ctx.closePath()
  ctx.fill()
}

function drawBillboardTower(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cam: CameraState,
) {
  const base = projectTile(gx, gy, 0, cam)
  const top = projectTile(gx, gy, 2.2, cam)
  ctx.fillStyle = '#222'
  ctx.fillRect(base.sx - 2, top.sy, 4, base.sy - top.sy)
  ctx.fillStyle = '#ff4488'
  ctx.fillRect(top.sx - 6, top.sy - 4, 12, 5)
}

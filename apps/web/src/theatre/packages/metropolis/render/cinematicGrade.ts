import { hash2 } from '../world/rng'

export type CinematicFx = {
  neonSurge: number
  energy: number
}

export function drawCinematicGrade(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  fx: CinematicFx,
  reducedMotion: boolean,
) {
  drawColorGrade(ctx, w, h, fx)
  if (!reducedMotion) drawFilmGrain(ctx, w, h, elapsed)
  drawLetterbox(ctx, w, h)
  drawEpicVignette(ctx, w, h)
  if (fx.neonSurge > 0.2) drawAnamorphicStreak(ctx, w, h, fx.neonSurge)
}

function drawColorGrade(ctx: CanvasRenderingContext2D, w: number, h: number, fx: CinematicFx) {
  const warm = 0.04 + fx.energy * 0.06 + fx.neonSurge * 0.05
  ctx.fillStyle = `rgba(255, 140, 60, ${warm})`
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = `rgba(20, 40, 80, ${0.06 + fx.neonSurge * 0.04})`
  ctx.fillRect(0, h * 0.5, w, h * 0.5)
}

function drawFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number, elapsed: number) {
  const frame = Math.floor(elapsed / 33)
  const step = 4
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const n = hash2(x, y + frame * 17) % 100
      if (n > 88) {
        ctx.fillStyle = `rgba(255,255,255,${(n - 88) / 600})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}

function drawLetterbox(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bar = h * 0.055
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, w, bar)
  ctx.fillRect(0, h - bar, w, bar)
}

function drawEpicVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w * 0.5
  const cy = h * 0.52
  const r = Math.max(w, h) * 0.78
  const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.65, 'rgba(0,0,16,0.15)')
  g.addColorStop(1, 'rgba(0,0,20,0.62)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function drawAnamorphicStreak(ctx: CanvasRenderingContext2D, w: number, h: number, surge: number) {
  const mx = w * 0.78
  const my = h * 0.12
  const grad = ctx.createLinearGradient(mx - 120, my, mx + 120, my)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.45, `rgba(255,100,200,${0.08 * surge})`)
  grad.addColorStop(0.5, `rgba(255,255,255,${0.18 * surge})`)
  grad.addColorStop(0.55, `rgba(100,200,255,${0.08 * surge})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(mx - 140, my - 2, 280, 4)
}

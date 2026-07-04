import { hash2 } from '../world/rng'

export const SKY = {
  top: '#020208',
  mid: '#0a0a18',
  horizon: '#141428',
  haze: '#1a1830',
  moon: '#e8e4d0',
  moonGlow: 'rgba(220, 210, 180, 0.25)',
} as const

export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  horizonY: number,
  cityGlow: number,
  reducedMotion: boolean,
  moonCover = 0,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY)
  grad.addColorStop(0, SKY.top)
  grad.addColorStop(0.45, SKY.mid)
  grad.addColorStop(0.85, SKY.horizon)
  grad.addColorStop(1, SKY.haze)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const glow = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 80)
  glow.addColorStop(0, `rgba(255, 180, 100, ${0.08 + cityGlow * 0.18})`)
  glow.addColorStop(1, 'rgba(8, 8, 16, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, horizonY - 60, w, 140)

  drawStars(ctx, w, horizonY, elapsed, reducedMotion)
  drawMoon(ctx, w, horizonY, elapsed, reducedMotion, moonCover)
  drawClouds(ctx, w, horizonY, elapsed, reducedMotion, moonCover)
}

const STAR_SEED = 0x5a751

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  elapsed: number,
  reducedMotion: boolean,
) {
  const count = 120
  for (let i = 0; i < count; i++) {
    const sx = hash2(STAR_SEED, i, 0) % w
    const sy = hash2(STAR_SEED, i, 1) % Math.floor(horizonY * 0.85)
    const tw = reducedMotion ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(elapsed * 0.001 + i))
    const size = (hash2(STAR_SEED, i, 2) % 3) === 0 ? 1.5 : 1
    ctx.fillStyle = `rgba(255,255,255,${tw * 0.85})`
    ctx.fillRect(sx, sy, size, size)
  }
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  elapsed: number,
  reducedMotion: boolean,
  moonCover: number,
) {
  const mx = w * 0.78 + (reducedMotion ? 0 : Math.sin(elapsed * 0.00008) * 12)
  const my = horizonY * 0.22
  const r = 22
  const vis = 1 - moonCover * 0.85
  const glow = ctx.createRadialGradient(mx, my, r * 0.2, mx, my, r * 3.5)
  glow.addColorStop(0, SKY.moonGlow.replace('0.25', String(0.25 * vis)))
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(mx, my, r * 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = vis
  ctx.fillStyle = SKY.moon
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  elapsed: number,
  reducedMotion: boolean,
  moonCover: number,
) {
  const drift = reducedMotion ? 0 : elapsed * 0.008
  const density = 5 + Math.floor(moonCover * 4)
  for (let c = 0; c < density; c++) {
    const cx = ((c * 280 + drift * (0.4 + c * 0.1)) % (w + 200)) - 100
    const cy = horizonY * (0.12 + c * 0.06)
    ctx.fillStyle = `rgba(30, 28, 48, ${0.25 + c * 0.04 + moonCover * 0.15})`
    ctx.beginPath()
    ctx.ellipse(cx, cy, 90 + c * 20 + moonCover * 30, 18 + c * 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

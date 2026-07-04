import { hash2 } from '../world/rng'

export const SKY = {
  top: '#010106',
  mid: '#080818',
  horizon: '#12122a',
  haze: '#181830',
  moon: '#e8e4d0',
  moonGlow: 'rgba(220, 210, 180, 0.25)',
} as const

export type SkyMood = {
  cityGlow: number
  neonSurge: number
  moonCover: number
}

export function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  horizonY: number,
  mood: SkyMood,
  reducedMotion: boolean,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY)
  grad.addColorStop(0, SKY.top)
  grad.addColorStop(0.4, SKY.mid)
  grad.addColorStop(0.82, SKY.horizon)
  grad.addColorStop(1, SKY.haze)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const glowStr = 0.1 + mood.cityGlow * 0.22 + mood.neonSurge * 0.12
  const glow = ctx.createLinearGradient(0, horizonY - 60, 0, horizonY + 100)
  glow.addColorStop(0, `rgba(255, 160, 90, ${glowStr})`)
  glow.addColorStop(0.4, `rgba(255, 60, 180, ${mood.neonSurge * 0.08})`)
  glow.addColorStop(1, 'rgba(8, 8, 16, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, horizonY - 80, w, 180)

  drawStars(ctx, w, horizonY, elapsed, reducedMotion)
  drawMoon(ctx, w, horizonY, elapsed, reducedMotion, mood.moonCover)
  drawClouds(ctx, w, horizonY, elapsed, reducedMotion, mood.moonCover)
}

const STAR_SEED = 0x5a751

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  elapsed: number,
  reducedMotion: boolean,
) {
  drawStarLayer(ctx, w, horizonY, elapsed, reducedMotion, 160, 0.0006, 1, 0.85)
  drawStarLayer(ctx, w, horizonY, elapsed, reducedMotion, 60, 0.0012, 1.8, 0.65)
}

function drawStarLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  elapsed: number,
  reducedMotion: boolean,
  count: number,
  parallax: number,
  sizeMul: number,
  alphaMul: number,
) {
  const drift = reducedMotion ? 0 : elapsed * parallax
  for (let i = 0; i < count; i++) {
    const sx = (hash2(STAR_SEED, i, 0) % w + drift * (0.2 + (i % 5) * 0.05)) % w
    const sy = hash2(STAR_SEED, i, 1) % Math.floor(horizonY * 0.88)
    const tw = reducedMotion ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(elapsed * 0.001 + i))
    const size = ((hash2(STAR_SEED, i, 2) % 3) === 0 ? 1.5 : 1) * sizeMul
    ctx.fillStyle = `rgba(255,255,255,${tw * alphaMul})`
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
  const mx = w * 0.78 + (reducedMotion ? 0 : Math.sin(elapsed * 0.00008) * 14)
  const my = horizonY * 0.2
  const r = 24
  const vis = 1 - moonCover * 0.85
  const glow = ctx.createRadialGradient(mx, my, r * 0.2, mx, my, r * 4.2)
  glow.addColorStop(0, `rgba(220, 210, 180, ${0.28 * vis})`)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(mx, my, r * 4.2, 0, Math.PI * 2)
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
  const layers = [
    { speed: 0.006, alpha: 0.22, scale: 1 },
    { speed: 0.012, alpha: 0.18, scale: 0.85 },
    { speed: 0.02, alpha: 0.14, scale: 0.7 },
  ]
  let idx = 0
  for (const layer of layers) {
    const drift = reducedMotion ? 0 : elapsed * layer.speed
    const count = 3 + Math.floor(moonCover * 2)
    for (let c = 0; c < count; c++) {
      const cx = ((idx * 220 + drift * 80 + c * 140) % (w + 240)) - 120
      const cy = horizonY * (0.1 + (idx % 5) * 0.05)
      ctx.fillStyle = `rgba(28, 26, 46, ${layer.alpha + moonCover * 0.12})`
      ctx.beginPath()
      ctx.ellipse(
        cx, cy,
        (90 + idx * 12) * layer.scale + moonCover * 20,
        (16 + idx * 3) * layer.scale,
        0, 0, Math.PI * 2,
      )
      ctx.fill()
      idx++
    }
  }
}

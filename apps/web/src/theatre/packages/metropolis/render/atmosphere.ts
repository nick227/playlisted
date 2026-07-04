import { hash2 } from '../world/rng'

type SmogParticle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number }

const POOL_SIZE = 48

function seedParticles(w: number, h: number): SmogParticle[] {
  const out: SmogParticle[] = []
  for (let i = 0; i < POOL_SIZE; i++) {
    const h2 = hash2(i * 17, i * 31)
    out.push({
      x: (h2 % 1000) / 1000 * w,
      y: h * 0.4 + ((h2 >> 10) % 1000) / 1000 * h * 0.55,
      vx: ((h2 >> 5) % 100) / 100 * 0.15 - 0.05,
      vy: -0.08 - ((h2 >> 15) % 100) / 100 * 0.12,
      size: 2 + (h2 % 4),
      alpha: 0.04 + (h2 % 30) / 300,
    })
  }
  return out
}

export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  cityGlow: number,
  reducedMotion: boolean,
  particleScale: number,
) {
  if (particleScale <= 0) return
  drawSmog(ctx, w, h, elapsed, reducedMotion, particleScale)
  drawNeonBleed(ctx, w, h, cityGlow)
  drawVignette(ctx, w, h)
}

function drawSmog(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  reducedMotion: boolean,
  scale: number,
) {
  const particles = seedParticles(w, h)
  const t = reducedMotion ? 0 : elapsed * 0.02
  for (const p of particles) {
    let x = (p.x + p.vx * t * 60) % w
    if (x < 0) x += w
    let y = p.y + p.vy * t * 60
    if (y < h * 0.25) y += h * 0.55
    ctx.fillStyle = `rgba(80,70,100,${p.alpha * scale})`
    ctx.fillRect(x, y, p.size, p.size)
  }
}

function drawNeonBleed(ctx: CanvasRenderingContext2D, w: number, h: number, cityGlow: number) {
  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h)
  grad.addColorStop(0, 'rgba(255,0,180,0)')
  grad.addColorStop(0.5, `rgba(255,40,200,${0.03 + cityGlow * 0.04})`)
  grad.addColorStop(1, `rgba(0,255,180,${0.02 + cityGlow * 0.03})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.5, w, h * 0.5)
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w * 0.5
  const cy = h * 0.55
  const r = Math.max(w, h) * 0.72
  const g = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,12,0.45)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

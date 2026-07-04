import type { MetropolisAudio } from '../world/types'
import type { DirectorState } from '../director/MetropolisDirector'

type Pt = { x: number; y: number }

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, streetY: number) {
  const grad = ctx.createLinearGradient(0, h * 0.28, 0, h)
  grad.addColorStop(0, '#06050c')
  grad.addColorStop(0.45, '#0c0a14')
  grad.addColorStop(1, '#121018')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.28, w, h * 0.72)
  ctx.fillStyle = '#08070e'
  ctx.fillRect(0, streetY, w, h - streetY)
}

function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, streetY: number) {
  const shapes = [
    { x: 0.08, hw: 0.14, hh: 0.22 },
    { x: 0.22, hw: 0.1, hh: 0.28 },
    { x: 0.38, hw: 0.08, hh: 0.35 },
    { x: 0.52, hw: 0.06, hh: 0.4 },
    { x: 0.66, hw: 0.1, hh: 0.26 },
    { x: 0.82, hw: 0.12, hh: 0.2 },
  ]
  for (const s of shapes) {
    const cx = w * s.x
    const bw = w * s.hw
    const top = streetY - streetY * s.hh
    ctx.fillStyle = '#141018'
    ctx.fillRect(cx - bw * 0.5, top, bw, streetY - top)
    ctx.strokeStyle = '#060508'
    ctx.lineWidth = 2
    ctx.strokeRect(cx - bw * 0.5, top, bw, streetY - top)
    ctx.fillStyle = '#221828'
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cx - bw * 0.3 + i * (bw * 0.18), top + 12 + i * 14, 5, 6)
    }
  }
}

function drawStreet(ctx: CanvasRenderingContext2D, w: number, streetY: number, elapsed: number, reduced: boolean) {
  const topW = w * 0.28
  const botW = w * 0.92
  const topY = streetY - 8
  const botY = streetY + 48
  const cx = w * 0.5
  ctx.fillStyle = '#1a1a24'
  ctx.beginPath()
  ctx.moveTo(cx - topW * 0.5, topY)
  ctx.lineTo(cx + topW * 0.5, topY)
  ctx.lineTo(cx + botW * 0.5, botY)
  ctx.lineTo(cx - botW * 0.5, botY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#08080c'
  ctx.lineWidth = 2
  ctx.stroke()

  const shimmer = reduced ? 0.15 : 0.08 + 0.06 * Math.sin(elapsed * 0.003)
  ctx.fillStyle = `rgba(100,120,180,${shimmer})`
  ctx.fillRect(cx - botW * 0.42, streetY + 6, botW * 0.84, 3)

  ctx.strokeStyle = '#444455'
  ctx.lineWidth = 1
  ctx.setLineDash([12, 16])
  ctx.beginPath()
  ctx.moveTo(cx, topY + 4)
  ctx.lineTo(cx, botY - 4)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawBuildingMass(
  ctx: CanvasRenderingContext2D,
  x: number,
  streetY: number,
  bw: number,
  bh: number,
  face: string,
  side: string,
  roof: string,
) {
  const depth = bw * 0.22
  const top = streetY - bh
  ctx.fillStyle = side
  ctx.beginPath()
  ctx.moveTo(x, top + depth)
  ctx.lineTo(x + depth, top)
  ctx.lineTo(x + bw + depth, top)
  ctx.lineTo(x + bw, top + depth)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = face
  ctx.fillRect(x, top + depth, bw, bh - depth)
  ctx.fillStyle = roof
  ctx.fillRect(x - 2, top + depth - 6, bw + 4, 8)
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.strokeRect(x, top + depth, bw, bh - depth)
}

function drawTheatre(ctx: CanvasRenderingContext2D, x: number, streetY: number, elapsed: number, reduced: boolean) {
  drawBuildingMass(ctx, x, streetY, 118, 195, '#281828', '#181018', '#3a2030')
  const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 0.004)
  const my = streetY - 175
  ctx.fillStyle = '#120810'
  ctx.fillRect(x - 8, my, 134, 22)
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.strokeRect(x - 8, my, 134, 22)
  ctx.fillStyle = '#ff2244'
  ctx.globalAlpha = pulse
  ctx.fillRect(x - 4, my + 5, 126, 12)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffe8cc'
  ctx.font = 'bold 13px monospace'
  ctx.fillText('PALACE', x + 18, my + 15)
  ctx.fillStyle = '#ccb8a0'
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 12 + i * 26, streetY - 95, 8, 70)
  }
}

function drawClub(ctx: CanvasRenderingContext2D, x: number, streetY: number, elapsed: number, reduced: boolean) {
  drawBuildingMass(ctx, x, streetY, 96, 180, '#102820', '#081810', '#183828')
  const strobe = reduced ? 0.5 : 0.45 + 0.55 * Math.abs(Math.sin(elapsed * 0.018))
  ctx.fillStyle = '#081410'
  ctx.fillRect(x + 28, streetY - 155, 40, 130)
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 28, streetY - 155, 40, 130)
  ctx.fillStyle = `rgba(0,255,200,${strobe * 0.9})`
  ctx.fillRect(x + 32, streetY - 145, 32, 14)
  ctx.fillStyle = `rgba(255,0,160,${strobe * 0.55})`
  ctx.fillRect(x + 36, streetY - 120, 24, 8)
  ctx.fillStyle = '#00ffcc'
  ctx.font = 'bold 10px monospace'
  ctx.fillText('CLUB', x + 38, streetY - 100)
}

function drawMotel(ctx: CanvasRenderingContext2D, x: number, streetY: number, elapsed: number, reduced: boolean) {
  drawBuildingMass(ctx, x, streetY, 110, 165, '#281028', '#180818', '#381838')
  const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(elapsed * 0.009)
  const sy = streetY - 155
  ctx.fillStyle = '#ff44cc'
  ctx.globalAlpha = flicker * 0.35
  ctx.fillRect(x + 4, sy - 8, 102, 24)
  ctx.globalAlpha = flicker
  ctx.fillRect(x + 8, sy, 94, 14)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffe0f8'
  ctx.font = 'bold 12px monospace'
  ctx.fillText('MOTEL', x + 28, sy + 11)
}

function drawProjects(ctx: CanvasRenderingContext2D, x: number, streetY: number, elapsed: number, reduced: boolean) {
  drawBuildingMass(ctx, x, streetY, 130, 175, '#222028', '#141018', '#2a2830')
  const flicker = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(elapsed * 0.007)
  for (let i = 0; i < 5; i++) {
    const px = x + 14 + i * 22
    ctx.fillStyle = '#2a2830'
    ctx.fillRect(px, streetY - 120, 14, 90)
    ctx.fillStyle = `rgba(255,130,40,${flicker * 0.85})`
    ctx.fillRect(px + 4, streetY - 80 + (i % 2) * 20, 6, 6)
  }
}

function drawDiner(ctx: CanvasRenderingContext2D, x: number, streetY: number, elapsed: number) {
  drawBuildingMass(ctx, x, streetY, 88, 140, '#282018', '#181410', '#382818')
  const glow = 0.5 + 0.5 * Math.sin(elapsed * 0.005)
  ctx.fillStyle = '#886644'
  ctx.beginPath()
  ctx.arc(x + 44, streetY - 125, 28, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = `rgba(255,200,120,${glow * 0.95})`
  ctx.fillRect(x + 20, streetY - 118, 48, 6)
}

function drawPanelCars(ctx: CanvasRenderingContext2D, w: number, streetY: number, elapsed: number, reduced: boolean) {
  const lanes = [0.32, 0.48, 0.64]
  for (let i = 0; i < lanes.length; i++) {
    const t = reduced ? 0.5 : (elapsed * 0.00004 + i * 0.28) % 1
    const x = lerp(w * 0.08, w * 0.88, t)
    const y = streetY + 18 + i * 8
    ctx.fillStyle = i === 1 ? '#882244' : '#334455'
    ctx.fillRect(x, y, 22, 8)
    ctx.fillStyle = '#ffcc66'
    ctx.fillRect(x + 18, y + 2, 3, 3)
  }
}

function drawCrowd(ctx: CanvasRenderingContext2D, w: number, streetY: number, audio: MetropolisAudio, beat: boolean) {
  const spots = [0.38, 0.44, 0.5, 0.56, 0.62]
  for (let i = 0; i < spots.length; i++) {
    const x = w * spots[i]
    const bob = beat ? -3 : 0
    ctx.fillStyle = '#b0a898'
    ctx.fillRect(x, streetY - 12 + bob, 4, 10)
    if (beat && i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,200,180,0.2)'
      ctx.fillRect(x - 2, streetY - 2, 8, 2)
    }
  }
}

export function drawGraphicNovelPanel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  audio: MetropolisAudio,
  beat: boolean,
  director: Pick<DirectorState, 'neonSurge' | 'strobe'>,
  reducedMotion: boolean,
) {
  const streetY = h * 0.78
  drawGround(ctx, w, h, streetY)
  drawBackdrop(ctx, w, streetY)
  drawStreet(ctx, w, streetY, elapsed, reducedMotion)

  drawProjects(ctx, w * 0.06, streetY, elapsed, reducedMotion)
  drawTheatre(ctx, w * 0.24, streetY, elapsed, reducedMotion)
  drawClub(ctx, w * 0.42, streetY, elapsed, reducedMotion)
  drawMotel(ctx, w * 0.58, streetY, elapsed, reducedMotion)
  drawDiner(ctx, w * 0.76, streetY, elapsed)

  if (director.strobe > 0.2) {
    ctx.fillStyle = `rgba(180,255,220,${director.strobe * 0.08})`
    ctx.fillRect(w * 0.4, h * 0.35, w * 0.18, h * 0.4)
  }
  if (director.neonSurge > 0.2) {
    ctx.fillStyle = `rgba(255,60,200,${director.neonSurge * 0.06})`
    ctx.fillRect(0, h * 0.5, w, h * 0.3)
  }

  drawCrowd(ctx, w, streetY, audio, beat)
  drawPanelCars(ctx, w, streetY, elapsed, reducedMotion)
}

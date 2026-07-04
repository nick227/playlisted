import type { MetropolisAudio } from '../world/types'
import type { DirectorState } from '../director/MetropolisDirector'

type LandmarkKind = 'projects' | 'theatre' | 'club' | 'motel' | 'diner'

export type LandmarkSlot = {
  kind: LandmarkKind
  x: number
  bw: number
  bh: number
  depth: number
}

export function layoutLandmarks(w: number, streetY: number): LandmarkSlot[] {
  const pad = w * 0.025
  const gap = Math.max(8, w * 0.022)
  const specs: { kind: LandmarkKind; w: number; h: number; depth: number }[] = [
    { kind: 'projects', w: 1.05, h: 0.78, depth: 0.92 },
    { kind: 'theatre', w: 1.2, h: 1.0, depth: 1.0 },
    { kind: 'club', w: 0.9, h: 0.9, depth: 0.98 },
    { kind: 'motel', w: 1.0, h: 0.85, depth: 0.94 },
    { kind: 'diner', w: 0.8, h: 0.72, depth: 0.88 },
  ]
  const sum = specs.reduce((s, l) => s + l.w, 0)
  const usable = w - pad * 2 - gap * (specs.length - 1)
  const maxH = streetY * 0.74
  let x = pad
  return specs.map((l) => {
    const bw = (usable * l.w) / sum
    const bh = maxH * l.h * l.depth
    const slot = { kind: l.kind, x, bw, bh, depth: l.depth }
    x += bw + gap
    return slot
  })
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, streetY: number) {
  const grad = ctx.createLinearGradient(0, h * 0.25, 0, streetY)
  grad.addColorStop(0, '#05040a')
  grad.addColorStop(0.55, '#0a0812')
  grad.addColorStop(1, '#101018')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.25, w, streetY - h * 0.25)
}

function drawDistantSkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  streetY: number,
  elapsed: number,
  bass: number,
  reduced: boolean,
) {
  const drift = reduced ? 0 : Math.sin(elapsed * 0.00035) * 6 + bass * 10
  const towers = [
    { x: 0.06, hw: 0.07, hh: 0.38 },
    { x: 0.18, hw: 0.05, hh: 0.48 },
    { x: 0.32, hw: 0.04, hh: 0.55 },
    { x: 0.5, hw: 0.035, hh: 0.62 },
    { x: 0.68, hw: 0.05, hh: 0.46 },
    { x: 0.84, hw: 0.08, hh: 0.36 },
  ]
  for (const t of towers) {
    const cx = w * t.x + drift * (t.x - 0.5)
    const bw = w * t.hw
    const top = streetY - streetY * t.hh
    ctx.fillStyle = '#0e0c14'
    ctx.fillRect(cx - bw * 0.5, top, bw, streetY - top)
    ctx.strokeStyle = '#060508'
    ctx.lineWidth = 1
    ctx.strokeRect(cx - bw * 0.5, top, bw, streetY - top)
    ctx.fillStyle = '#1a1828'
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - bw * 0.2 + i * bw * 0.18, top + 10 + i * 12, 3, 4)
    }
  }
}

function drawStreet(ctx: CanvasRenderingContext2D, w: number, streetY: number, elapsed: number, reduced: boolean) {
  const topW = w * 0.18
  const botW = w * 1.02
  const topY = streetY
  const botY = streetY + Math.min(72, w * 0.12)
  const cx = w * 0.5
  ctx.fillStyle = '#0c0c12'
  ctx.fillRect(0, streetY, w, botY - streetY + 4)
  ctx.fillStyle = '#181820'
  ctx.beginPath()
  ctx.moveTo(cx - topW * 0.5, topY)
  ctx.lineTo(cx + topW * 0.5, topY)
  ctx.lineTo(cx + botW * 0.5, botY)
  ctx.lineTo(cx - botW * 0.5, botY)
  ctx.closePath()
  ctx.fill()
  const shimmer = reduced ? 0.1 : 0.06 + 0.05 * Math.sin(elapsed * 0.003)
  ctx.fillStyle = `rgba(80,100,160,${shimmer})`
  ctx.fillRect(cx - botW * 0.38, streetY + 16, botW * 0.76, 2)
}

function drawAlley(ctx: CanvasRenderingContext2D, x: number, streetY: number, h: number) {
  ctx.fillStyle = '#030306'
  ctx.fillRect(x - 3, streetY - h, 6, h)
}

function drawMass(
  ctx: CanvasRenderingContext2D,
  x: number,
  streetY: number,
  bw: number,
  bh: number,
  face: string,
  side: string,
  roof: string,
) {
  const depth = Math.min(22, bw * 0.16)
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
  ctx.fillRect(x - 2, top + depth - 6, bw + 4, 7)
  ctx.strokeStyle = '#050508'
  ctx.lineWidth = 2
  ctx.strokeRect(x, top + depth, bw, bh - depth)
}

function drawProjects(ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#2a2832', '#181820', '#3a3844')
  const flicker = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(elapsed * 0.007)
  const cols = Math.max(3, Math.floor(bw / 20))
  for (let i = 0; i < cols; i++) {
    const px = x + bw * 0.1 + i * (bw * 0.8 / cols)
    ctx.fillStyle = '#222028'
    ctx.fillRect(px, streetY - bh * 0.75, bw * 0.11, bh * 0.58)
    ctx.fillStyle = `rgba(255,110,35,${flicker * 0.95})`
    ctx.fillRect(px + 3, streetY - bh * 0.48 + (i % 2) * 14, 5, 5)
  }
  ctx.fillStyle = '#999'
  ctx.font = `bold ${Math.max(8, bw * 0.075)}px monospace`
  ctx.fillText('PROJECTS', x + bw * 0.14, streetY - bh + 18)
}

function drawTheatre(ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#301828', '#180810', '#482030')
  const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 0.004)
  const my = streetY - bh + 10
  ctx.fillStyle = '#120810'
  ctx.fillRect(x + 4, my, bw - 8, bh * 0.1)
  ctx.fillStyle = '#ff2244'
  ctx.globalAlpha = pulse
  ctx.fillRect(x + 8, my + 4, bw - 16, bh * 0.055)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffe8cc'
  ctx.font = `bold ${Math.max(10, bw * 0.095)}px monospace`
  ctx.fillText('PALACE', x + bw * 0.26, my + bh * 0.085)
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#a89078'
    ctx.fillRect(x + bw * 0.18 + i * (bw * 0.22), streetY - bh * 0.58, bw * 0.09, bh * 0.42)
  }
}

function drawClub(ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#0c2820', '#061810', '#184030')
  const strobe = reduced ? 0.5 : 0.45 + 0.55 * Math.abs(Math.sin(elapsed * 0.018))
  const doorW = bw * 0.42
  const doorX = x + (bw - doorW) * 0.5
  ctx.fillStyle = '#061410'
  ctx.fillRect(doorX, streetY - bh * 0.85, doorW, bh * 0.78)
  ctx.strokeStyle = '#050508'
  ctx.lineWidth = 2
  ctx.strokeRect(doorX, streetY - bh * 0.85, doorW, bh * 0.78)
  ctx.fillStyle = `rgba(0,255,200,${strobe * 0.9})`
  ctx.fillRect(doorX + 4, streetY - bh * 0.78, doorW - 8, bh * 0.07)
  ctx.fillStyle = '#00ffcc'
  ctx.font = `bold ${Math.max(9, bw * 0.11)}px monospace`
  ctx.fillText('CLUB', doorX + doorW * 0.2, streetY - bh * 0.58)
}

function drawMotel(ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#301830', '#180818', '#482848')
  const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(elapsed * 0.009)
  const sy = streetY - bh + 12
  ctx.fillStyle = '#ff44cc'
  ctx.globalAlpha = flicker * 0.45
  ctx.fillRect(x + 4, sy - 8, bw - 8, bh * 0.11)
  ctx.globalAlpha = flicker
  ctx.fillRect(x + 8, sy, bw - 16, bh * 0.065)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffe0f8'
  ctx.font = `bold ${Math.max(9, bw * 0.1)}px monospace`
  ctx.fillText('MOTEL', x + bw * 0.24, sy + bh * 0.055)
}

function drawDiner(ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#302818', '#181008', '#483820')
  const glow = 0.5 + 0.5 * Math.sin(elapsed * 0.005)
  ctx.fillStyle = '#886644'
  ctx.beginPath()
  ctx.arc(x + bw * 0.5, streetY - bh * 0.74, bw * 0.34, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = `rgba(255,200,120,${glow * 0.95})`
  ctx.fillRect(x + bw * 0.2, streetY - bh * 0.7, bw * 0.6, 5)
  ctx.fillStyle = '#ccc'
  ctx.font = `bold ${Math.max(8, bw * 0.1)}px monospace`
  ctx.fillText('DINER', x + bw * 0.26, streetY - bh * 0.48)
}

function drawLandmark(ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean) {
  switch (slot.kind) {
    case 'projects': drawProjects(ctx, slot, streetY, elapsed, reduced); break
    case 'theatre': drawTheatre(ctx, slot, streetY, elapsed, reduced); break
    case 'club': drawClub(ctx, slot, streetY, elapsed, reduced); break
    case 'motel': drawMotel(ctx, slot, streetY, elapsed, reduced); break
    case 'diner': drawDiner(ctx, slot, streetY, elapsed); break
  }
}

function drawCars(ctx: CanvasRenderingContext2D, w: number, streetY: number, elapsed: number, reduced: boolean) {
  for (let i = 0; i < 3; i++) {
    const t = reduced ? 0.25 + i * 0.25 : (elapsed * 0.00003 + i * 0.33) % 1
    const cx = w * (0.08 + t * 0.84)
    ctx.fillStyle = i === 1 ? '#882244' : '#334455'
    ctx.fillRect(cx, streetY + 22 + i * 7, 24, 8)
    ctx.fillStyle = '#ffcc66'
    ctx.fillRect(cx + 19, streetY + 24 + i * 7, 3, 3)
  }
}

function drawCrowd(ctx: CanvasRenderingContext2D, slots: LandmarkSlot[], streetY: number, beat: boolean) {
  const club = slots.find((s) => s.kind === 'club')
  if (!club) return
  const qx = club.x + club.bw * 0.5
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#b0a898'
    ctx.fillRect(qx - 22 + i * 13, streetY - 11 + (beat ? -2 : 0), 3, 10)
  }
}

export function drawGraphicNovelPanel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  audio: MetropolisAudio,
  beat: boolean,
  director: Pick<DirectorState, 'neonSurge' | 'strobe' | 'blackout'>,
  reducedMotion: boolean,
) {
  const streetY = h * 0.86
  const slots = layoutLandmarks(w, streetY)

  drawGround(ctx, w, h, streetY)
  drawDistantSkyline(ctx, w, streetY, elapsed, audio.bass, reducedMotion)
  drawStreet(ctx, w, streetY, elapsed, reducedMotion)

  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1]
    drawAlley(ctx, prev.x + prev.bw, streetY, prev.bh)
  }

  for (const slot of slots) {
    drawLandmark(ctx, slot, streetY, elapsed, reducedMotion)
  }

  if (director.strobe > 0.2) {
    const club = slots.find((s) => s.kind === 'club')
    if (club) {
      ctx.fillStyle = `rgba(180,255,220,${director.strobe * 0.12})`
      ctx.fillRect(club.x, streetY - club.bh, club.bw, club.bh)
    }
  }
  if (director.neonSurge > 0.2) {
    ctx.fillStyle = `rgba(255,60,200,${director.neonSurge * 0.06})`
    ctx.fillRect(0, h * 0.4, w, h * 0.42)
  }
  if (director.blackout > 0.3) {
    ctx.fillStyle = `rgba(0,0,8,${director.blackout * 0.55})`
    ctx.fillRect(0, h * 0.25, w, h * 0.75)
  }

  drawCrowd(ctx, slots, streetY, beat)
  drawCars(ctx, w, streetY, elapsed, reducedMotion)
}

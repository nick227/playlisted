import type { MetropolisAudio } from '../world/types'
import type { DirectorState } from '../director/MetropolisDirector'

type LandmarkKind = 'projects' | 'theatre' | 'club' | 'motel' | 'diner'

type LandmarkSlot = {
  kind: LandmarkKind
  x: number
  bw: number
  bh: number
}

function layoutLandmarks(w: number, streetY: number): LandmarkSlot[] {
  const pad = w * 0.03
  const gap = Math.max(6, w * 0.018)
  const weights: { kind: LandmarkKind; w: number; h: number }[] = [
    { kind: 'projects', w: 1.1, h: 0.72 },
    { kind: 'theatre', w: 1.25, h: 1.0 },
    { kind: 'club', w: 0.95, h: 0.88 },
    { kind: 'motel', w: 1.05, h: 0.82 },
    { kind: 'diner', w: 0.85, h: 0.68 },
  ]
  const sum = weights.reduce((s, l) => s + l.w, 0)
  const usable = w - pad * 2 - gap * (weights.length - 1)
  const maxH = streetY * 0.52
  let x = pad
  return weights.map((l) => {
    const bw = (usable * l.w) / sum
    const bh = maxH * l.h
    const slot = { kind: l.kind, x, bw, bh }
    x += bw + gap
    return slot
  })
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, streetY: number) {
  const grad = ctx.createLinearGradient(0, h * 0.28, 0, h)
  grad.addColorStop(0, '#06050c')
  grad.addColorStop(0.5, '#0c0a14')
  grad.addColorStop(1, '#121018')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.28, w, h * 0.72)
}

function drawStreet(ctx: CanvasRenderingContext2D, w: number, streetY: number, elapsed: number, reduced: boolean) {
  ctx.fillStyle = '#08070e'
  ctx.fillRect(0, streetY, w, 8)
  const topW = w * 0.22
  const botW = w * 0.96
  const topY = streetY
  const botY = streetY + 52
  const cx = w * 0.5
  ctx.fillStyle = '#1a1a24'
  ctx.beginPath()
  ctx.moveTo(cx - topW * 0.5, topY)
  ctx.lineTo(cx + topW * 0.5, topY)
  ctx.lineTo(cx + botW * 0.5, botY)
  ctx.lineTo(cx - botW * 0.5, botY)
  ctx.closePath()
  ctx.fill()
  const shimmer = reduced ? 0.12 : 0.07 + 0.05 * Math.sin(elapsed * 0.003)
  ctx.fillStyle = `rgba(90,110,170,${shimmer})`
  ctx.fillRect(cx - botW * 0.4, streetY + 14, botW * 0.8, 2)
}

function drawAlley(ctx: CanvasRenderingContext2D, x: number, streetY: number, h: number) {
  ctx.fillStyle = '#040408'
  ctx.fillRect(x - 2, streetY - h, 4, h)
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
  const depth = Math.min(18, bw * 0.14)
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
  ctx.fillRect(x - 1, top + depth - 5, bw + 2, 6)
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.strokeRect(x, top + depth, bw, bh - depth)
}

function drawProjects(
  ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean,
) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#2a2832', '#181820', '#3a3844')
  const flicker = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(elapsed * 0.007)
  const cols = Math.max(3, Math.floor(bw / 22))
  for (let i = 0; i < cols; i++) {
    const px = x + bw * 0.12 + i * (bw * 0.76 / cols)
    ctx.fillStyle = '#222028'
    ctx.fillRect(px, streetY - bh * 0.72, bw * 0.12, bh * 0.55)
    ctx.fillStyle = `rgba(255,120,40,${flicker * 0.9})`
    ctx.fillRect(px + 3, streetY - bh * 0.45 + (i % 2) * 12, 5, 5)
  }
  ctx.fillStyle = '#888'
  ctx.font = `bold ${Math.max(8, bw * 0.08)}px monospace`
  ctx.fillText('PROJECTS', x + bw * 0.18, streetY - bh + 16)
}

function drawTheatre(
  ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean,
) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#301828', '#180810', '#482030')
  const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 0.004)
  const my = streetY - bh + 8
  ctx.fillStyle = '#120810'
  ctx.fillRect(x + 4, my, bw - 8, bh * 0.11)
  ctx.fillStyle = '#ff2244'
  ctx.globalAlpha = pulse
  ctx.fillRect(x + 8, my + 4, bw - 16, bh * 0.06)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffe8cc'
  ctx.font = `bold ${Math.max(9, bw * 0.1)}px monospace`
  ctx.fillText('PALACE', x + bw * 0.28, my + bh * 0.09)
  for (let i = 0; i < 3; i++) {
    const px = x + bw * 0.2 + i * (bw * 0.22)
    ctx.fillStyle = '#a89078'
    ctx.fillRect(px, streetY - bh * 0.55, bw * 0.08, bh * 0.38)
  }
}

function drawClub(
  ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean,
) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#0c2820', '#061810', '#184030')
  const strobe = reduced ? 0.5 : 0.45 + 0.55 * Math.abs(Math.sin(elapsed * 0.018))
  const doorW = bw * 0.38
  const doorX = x + (bw - doorW) * 0.5
  ctx.fillStyle = '#061410'
  ctx.fillRect(doorX, streetY - bh * 0.82, doorW, bh * 0.75)
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.strokeRect(doorX, streetY - bh * 0.82, doorW, bh * 0.75)
  ctx.fillStyle = `rgba(0,255,200,${strobe * 0.9})`
  ctx.fillRect(doorX + 4, streetY - bh * 0.75, doorW - 8, bh * 0.08)
  ctx.fillStyle = '#00ffcc'
  ctx.font = `bold ${Math.max(8, bw * 0.12)}px monospace`
  ctx.fillText('CLUB', doorX + doorW * 0.22, streetY - bh * 0.55)
}

function drawMotel(
  ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number, reduced: boolean,
) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#301830', '#180818', '#482848')
  const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(elapsed * 0.009)
  const sy = streetY - bh + 10
  ctx.fillStyle = '#ff44cc'
  ctx.globalAlpha = flicker * 0.4
  ctx.fillRect(x + 6, sy - 6, bw - 12, bh * 0.1)
  ctx.globalAlpha = flicker
  ctx.fillRect(x + 10, sy, bw - 20, bh * 0.07)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffe0f8'
  ctx.font = `bold ${Math.max(9, bw * 0.11)}px monospace`
  ctx.fillText('MOTEL', x + bw * 0.26, sy + bh * 0.06)
  const rooms = Math.max(2, Math.floor(bw / 28))
  for (let i = 0; i < rooms; i++) {
    ctx.fillStyle = '#443848'
    ctx.fillRect(x + 10 + i * (bw - 20) / rooms, streetY - bh * 0.55, bw * 0.14, bh * 0.22)
  }
}

function drawDiner(
  ctx: CanvasRenderingContext2D, slot: LandmarkSlot, streetY: number, elapsed: number,
) {
  const { x, bw, bh } = slot
  drawMass(ctx, x, streetY, bw, bh, '#302818', '#181008', '#483820')
  const glow = 0.5 + 0.5 * Math.sin(elapsed * 0.005)
  const r = bw * 0.32
  ctx.fillStyle = '#886644'
  ctx.beginPath()
  ctx.arc(x + bw * 0.5, streetY - bh * 0.72, r, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#060508'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = `rgba(255,200,120,${glow * 0.95})`
  ctx.fillRect(x + bw * 0.22, streetY - bh * 0.68, bw * 0.56, 5)
  ctx.fillStyle = '#ccc'
  ctx.font = `bold ${Math.max(7, bw * 0.1)}px monospace`
  ctx.fillText('DINER', x + bw * 0.28, streetY - bh * 0.45)
}

function drawPanelCars(ctx: CanvasRenderingContext2D, w: number, streetY: number, elapsed: number, reduced: boolean) {
  for (let i = 0; i < 3; i++) {
    const t = reduced ? 0.3 + i * 0.2 : (elapsed * 0.000035 + i * 0.33) % 1
    const cx = w * (0.1 + t * 0.8)
    ctx.fillStyle = i === 1 ? '#882244' : '#334455'
    ctx.fillRect(cx, streetY + 20 + i * 6, 20, 7)
    ctx.fillStyle = '#ffcc66'
    ctx.fillRect(cx + 16, streetY + 22 + i * 6, 3, 3)
  }
}

function drawCrowd(ctx: CanvasRenderingContext2D, slots: LandmarkSlot[], streetY: number, beat: boolean) {
  const club = slots.find((s) => s.kind === 'club')
  if (!club) return
  const queueX = club.x + club.bw * 0.5
  for (let i = 0; i < 4; i++) {
    const px = queueX - 24 + i * 14
    const bob = beat ? -2 : 0
    ctx.fillStyle = '#b0a898'
    ctx.fillRect(px, streetY - 10 + bob, 3, 9)
  }
}

function drawLandmark(
  ctx: CanvasRenderingContext2D,
  slot: LandmarkSlot,
  streetY: number,
  elapsed: number,
  reduced: boolean,
) {
  switch (slot.kind) {
    case 'projects': drawProjects(ctx, slot, streetY, elapsed, reduced); break
    case 'theatre': drawTheatre(ctx, slot, streetY, elapsed, reduced); break
    case 'club': drawClub(ctx, slot, streetY, elapsed, reduced); break
    case 'motel': drawMotel(ctx, slot, streetY, elapsed, reduced); break
    case 'diner': drawDiner(ctx, slot, streetY, elapsed); break
  }
}

export function drawGraphicNovelPanel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  _audio: MetropolisAudio,
  beat: boolean,
  director: Pick<DirectorState, 'neonSurge' | 'strobe'>,
  reducedMotion: boolean,
) {
  const streetY = h * 0.82
  const slots = layoutLandmarks(w, streetY)

  drawGround(ctx, w, h, streetY)
  drawStreet(ctx, w, streetY, elapsed, reducedMotion)

  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1]
    drawAlley(ctx, prev.x + prev.bw, streetY, prev.bh * 0.95)
  }

  for (const slot of slots) {
    drawLandmark(ctx, slot, streetY, elapsed, reducedMotion)
  }

  if (director.strobe > 0.2) {
    const club = slots.find((s) => s.kind === 'club')
    if (club) {
      ctx.fillStyle = `rgba(180,255,220,${director.strobe * 0.1})`
      ctx.fillRect(club.x, streetY - club.bh, club.bw, club.bh)
    }
  }
  if (director.neonSurge > 0.2) {
    ctx.fillStyle = `rgba(255,60,200,${director.neonSurge * 0.05})`
    ctx.fillRect(0, h * 0.45, w, h * 0.35)
  }

  drawCrowd(ctx, slots, streetY, beat)
  drawPanelCars(ctx, w, streetY, elapsed, reducedMotion)
}

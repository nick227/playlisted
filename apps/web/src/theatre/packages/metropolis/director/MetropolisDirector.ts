import { METRO_SETTINGS } from '../world/constants'
import type { MetropolisAudio } from '../world/types'

export type MetropolisEventId =
  | 'blackout'
  | 'strobe'
  | 'siren'
  | 'fireworks'
  | 'train'
  | 'horror'
  | 'neonSurge'
  | 'moonCover'

type ScheduledEvent = { id: MetropolisEventId; atMs: number }

const TIMELINE: ScheduledEvent[] = [
  { id: 'strobe', atMs: 16_000 },
  { id: 'blackout', atMs: 24_000 },
  { id: 'siren', atMs: 32_000 },
  { id: 'train', atMs: 40_000 },
  { id: 'fireworks', atMs: 48_000 },
  { id: 'horror', atMs: 56_000 },
  { id: 'neonSurge', atMs: 64_000 },
  { id: 'moonCover', atMs: 72_000 },
]

export type DirectorState = {
  elapsed: number
  loopT: number
  blackout: number
  blackoutWave: number
  blackoutRolling: boolean
  strobe: number
  siren: number
  fireworks: number
  train: number
  horror: number
  neonSurge: number
  moonCover: number
  fired: Set<string>
}

export function createDirector(): DirectorState {
  return {
    elapsed: 0,
    loopT: 0,
    blackout: 0,
    blackoutWave: 0,
    blackoutRolling: false,
    strobe: 0,
    siren: 0,
    fireworks: 0,
    train: 0,
    horror: 0,
    neonSurge: 0,
    moonCover: 0,
    fired: new Set(),
  }
}

export function updateDirector(
  state: DirectorState,
  deltaMs: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
): DirectorState {
  const elapsed = state.elapsed + deltaMs
  const loopT = elapsed % METRO_SETTINGS.loopDurationMs
  const fired = new Set(state.fired)

  let blackout = Math.max(0, state.blackout - deltaMs * 0.0004)
  let blackoutWave = state.blackoutWave
  let blackoutRolling = state.blackoutRolling
  let strobe = Math.max(0, state.strobe - deltaMs * 0.008)
  let siren = Math.max(0, state.siren - deltaMs * 0.003)
  let fireworks = Math.max(0, state.fireworks - deltaMs * 0.0015)
  let train = Math.max(0, state.train - deltaMs * 0.00012)
  let horror = Math.max(0, state.horror - deltaMs * 0.0012)
  let neonSurge = Math.max(0, state.neonSurge - deltaMs * 0.001)
  let moonCover = Math.max(0, state.moonCover - deltaMs * 0.00035)

  if (!reducedMotion) {
    for (const ev of TIMELINE) {
      const key = `${ev.id}:${Math.floor(elapsed / METRO_SETTINGS.loopDurationMs)}`
      if (loopT >= ev.atMs && !fired.has(key)) {
        fired.add(key)
        if (ev.id === 'blackout') { blackout = 1; blackoutRolling = true; blackoutWave = 0 }
        if (ev.id === 'strobe') strobe = 1
        if (ev.id === 'siren') siren = 1
        if (ev.id === 'fireworks') fireworks = 1
        if (ev.id === 'train') train = 1
        if (ev.id === 'horror') horror = 1
        if (ev.id === 'neonSurge') neonSurge = 1
        if (ev.id === 'moonCover') moonCover = 1
      }
    }
    if (blackoutRolling) {
      blackoutWave = Math.min(1, blackoutWave + deltaMs * 0.00028)
      if (blackoutWave >= 1 && blackout < 0.2) blackoutRolling = false
    }
    if (audio.beat) strobe = Math.max(strobe, 0.35)
    if (audio.chaos) {
      blackout = Math.max(blackout, 0.25)
      horror = Math.max(horror, 0.4)
      if (!blackoutRolling) { blackoutRolling = true; blackoutWave = Math.max(blackoutWave, 0.3) }
    }
    if (audio.highs > 0.6) neonSurge = Math.max(neonSurge, audio.highs * 0.25)
  }

  return {
    elapsed, loopT, blackout, blackoutWave, blackoutRolling,
    strobe, siren, fireworks, train, horror, neonSurge, moonCover, fired,
  }
}

export function drawDirectorFx(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: DirectorState,
  anchors?: { fireworksX: number; fireworksY: number },
) {
  if (state.blackout > 0) {
    ctx.fillStyle = `rgba(0,0,8,${state.blackout * 0.55})`
    ctx.fillRect(0, 0, w, h)
  }
  if (state.strobe > 0) {
    ctx.fillStyle = `rgba(180,255,220,${state.strobe * 0.14})`
    ctx.fillRect(0, 0, w, h)
  }
  if (state.siren > 0) drawSirenWash(ctx, w, h, state)
  if (state.horror > 0) {
    ctx.fillStyle = `rgba(40,120,40,${state.horror * 0.07})`
    ctx.fillRect(0, 0, w, h)
  }
  if (state.fireworks > 0) {
    const cx = anchors?.fireworksX ?? w * 0.72
    const cy = anchors?.fireworksY ?? h * 0.42
    drawFireworks(ctx, cx, cy, state)
  }
}

function drawSirenWash(ctx: CanvasRenderingContext2D, w: number, h: number, state: DirectorState) {
  const alt = Math.sin(state.elapsed * 0.02) > 0
  const grad = ctx.createRadialGradient(w * 0.18, h * 0.82, 0, w * 0.18, h * 0.82, w * 0.65)
  grad.addColorStop(0, alt ? `rgba(255,40,40,${state.siren * 0.14})` : `rgba(40,80,255,${state.siren * 0.1})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawFireworks(ctx: CanvasRenderingContext2D, cx: number, cy: number, state: DirectorState) {
  for (let burst = 0; burst < 3; burst++) {
    const bx = cx + (burst - 1) * 45
    const by = cy + burst * 12
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + state.elapsed * 0.001 + burst
      const r = 35 + state.fireworks * 60
      const alpha = state.fireworks * (0.5 + burst * 0.15)
      ctx.fillStyle = burst === 1 ? `rgba(255,180,220,${alpha})` : `rgba(255,200,100,${alpha})`
      ctx.beginPath()
      ctx.arc(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.6, 2 + state.fireworks * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = `rgba(255,240,200,${state.fireworks * 0.25})`
  ctx.beginPath()
  ctx.ellipse(cx, cy + 40, 80 * state.fireworks, 20 * state.fireworks, 0, 0, Math.PI * 2)
  ctx.fill()
}

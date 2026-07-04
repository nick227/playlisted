import { METRO_SETTINGS } from '../world/constants'
import type { MetropolisAudio } from '../world/types'

export type MetropolisEventId =
  | 'blackout'
  | 'strobe'
  | 'siren'
  | 'fireworks'
  | 'train'

type ScheduledEvent = {
  id: MetropolisEventId
  atMs: number
}

const TIMELINE: ScheduledEvent[] = [
  { id: 'blackout', atMs: 24_000 },
  { id: 'strobe', atMs: 16_000 },
  { id: 'siren', atMs: 32_000 },
  { id: 'fireworks', atMs: 48_000 },
  { id: 'train', atMs: 40_000 },
]

export type DirectorState = {
  elapsed: number
  loopT: number
  blackout: number
  strobe: number
  siren: number
  fireworks: number
  fired: Set<string>
}

export function createDirector(): DirectorState {
  return {
    elapsed: 0,
    loopT: 0,
    blackout: 0,
    strobe: 0,
    siren: 0,
    fireworks: 0,
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
  let strobe = Math.max(0, state.strobe - deltaMs * 0.008)
  let siren = Math.max(0, state.siren - deltaMs * 0.003)
  let fireworks = Math.max(0, state.fireworks - deltaMs * 0.0015)

  if (!reducedMotion) {
    for (const ev of TIMELINE) {
      const key = `${ev.id}:${Math.floor(elapsed / METRO_SETTINGS.loopDurationMs)}`
      if (loopT >= ev.atMs && !fired.has(key)) {
        fired.add(key)
        if (ev.id === 'blackout') blackout = 1
        if (ev.id === 'strobe') strobe = 1
        if (ev.id === 'siren') siren = 1
        if (ev.id === 'fireworks') fireworks = 1
      }
    }
    if (audio.beat) strobe = Math.max(strobe, 0.35)
    if (audio.chaos) blackout = Math.max(blackout, 0.25)
  }

  return { elapsed, loopT, blackout, strobe, siren, fireworks, fired }
}

export function drawDirectorFx(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: DirectorState,
) {
  if (state.blackout > 0) {
    ctx.fillStyle = `rgba(0,0,8,${state.blackout * 0.72})`
    ctx.fillRect(0, 0, w, h)
  }
  if (state.strobe > 0) {
    ctx.fillStyle = `rgba(180,255,220,${state.strobe * 0.12})`
    ctx.fillRect(0, 0, w, h)
  }
  if (state.siren > 0) {
    const alt = Math.sin(state.elapsed * 0.02) > 0
    ctx.fillStyle = alt ? `rgba(255,40,40,${state.siren * 0.08})` : `rgba(40,80,255,${state.siren * 0.06})`
    ctx.fillRect(0, 0, w, h * 0.15)
  }
  if (state.fireworks > 0) {
    drawFireworks(ctx, w, h * 0.35, state)
  }
}

function drawFireworks(ctx: CanvasRenderingContext2D, w: number, h: number, state: DirectorState) {
  const cx = w * 0.72
  const cy = h * 0.5
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + state.elapsed * 0.001
    const r = 30 + state.fireworks * 40
    ctx.fillStyle = `rgba(255,200,100,${state.fireworks * 0.7})`
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + state.fireworks * 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

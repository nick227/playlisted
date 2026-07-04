import { blackoutDim } from '../render/drawUtils'
import type { DirectorState } from '../director/MetropolisDirector'
import type { HumanFigure } from './humanFigure'
import type { MetropolisAudio } from '../world/types'

const PROJECTS_SCATTER_RADIUS = 28

export function applyBlackoutFreeze(
  fig: HumanFigure,
  gx: number,
  gy: number,
  citySize: number,
  director: Pick<DirectorState, 'blackout' | 'blackoutWave' | 'blackoutRolling'>,
  deltaMs: number,
) {
  if (fig.freezeMs > 0) {
    fig.freezeMs = Math.max(0, fig.freezeMs - deltaMs)
    return true
  }
  const dim = blackoutDim(gx, gy, citySize, director.blackoutWave, director.blackoutRolling, director.blackout)
  if (director.blackoutRolling && dim < 0.35) {
    fig.freezeMs = 1200
    fig.vx = 0
    fig.vy = 0
    return true
  }
  return false
}

export function applySirenScatter(
  fig: HumanFigure,
  projectsGx: number,
  projectsGy: number,
  siren: number,
  deltaMs: number,
) {
  if (siren <= 0.15) {
    if (fig.scatterMs > 0) fig.scatterMs = Math.max(0, fig.scatterMs - deltaMs)
    return
  }
  const dx = fig.gx - projectsGx
  const dy = fig.gy - projectsGy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > PROJECTS_SCATTER_RADIUS) return
  const force = siren * (1 - dist / PROJECTS_SCATTER_RADIUS) * 0.022
  fig.vx += (dx / (dist || 1)) * force * deltaMs
  fig.vy += (dy / (dist || 1)) * force * deltaMs
  fig.scatterMs = 400
}

export function applyChaosScatter(fig: HumanFigure, audio: MetropolisAudio, deltaMs: number) {
  if (!audio.chaos) return
  const push = 0.0008 * deltaMs
  fig.vx += Math.sin(fig.seed) * push
  fig.vy += Math.cos(fig.seed * 1.3) * push
  fig.scatterMs = 350
}

export function applyBeatReactions(fig: HumanFigure, audio: MetropolisAudio, deltaMs: number) {
  const beatLift = audio.beat ? 0.08 + audio.bass * 0.12 : 0
  fig.bob = Math.max(fig.bob, beatLift)
  if (audio.beat && fig.role === 'queue') {
    fig.gy -= (0.004 + audio.bass * 0.006) * (deltaMs / 16.667)
  }
  if (audio.beat) {
    fig.armsUp = Math.min(1, fig.armsUp + 0.35)
  } else {
    fig.armsUp = Math.max(0, fig.armsUp - deltaMs * 0.002)
  }
}

export function applyNeonArms(fig: HumanFigure, neonSurge: number, deltaMs: number) {
  if (neonSurge <= 0 || fig.role !== 'queue') return
  fig.armsUp = Math.min(1, fig.armsUp + neonSurge * deltaMs * 0.003)
}

export function applyFireworksGaze(fig: HumanFigure, fireworks: number, deltaMs: number) {
  if (fireworks <= 0) return
  if (fig.role === 'rooftop' || fig.role === 'queue') {
    fig.armsUp = Math.min(1, fig.armsUp + fireworks * deltaMs * 0.002)
    fig.bob = Math.max(fig.bob, fireworks * 0.15)
  }
}

export function decayVelocity(fig: HumanFigure, deltaMs: number) {
  const drag = Math.exp(-deltaMs / 180)
  fig.vx *= drag
  fig.vy *= drag
}

export function integrateScatter(fig: HumanFigure, deltaMs: number) {
  if (Math.abs(fig.vx) < 0.0001 && Math.abs(fig.vy) < 0.0001) return
  const dt = deltaMs / 16.667
  fig.gx += fig.vx * dt
  fig.gy += fig.vy * dt
}

export function decayBob(fig: HumanFigure, deltaMs: number) {
  fig.bob = Math.max(0, fig.bob - deltaMs * 0.004)
}

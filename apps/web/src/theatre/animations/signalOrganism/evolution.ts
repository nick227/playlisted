import type { TriggerFrame } from '../../VisualTriggers'
import type { OrganismStateMachine } from './state'
import { clamp, lerp } from './types'
import { randSigned } from './random'

export type RitualId = 'hurricane' | 'census' | 'drift' | 'mutant' | 'vacuum' | null

export type EvolveCtx = {
  age: number
  dwellSec: number
  wildness: number
  chaosBias: number
  ritual: RitualId
  isExhaust: boolean
  sizeMul: number
  speedMul: number
  veinBoost: number
  spawnMul: number
  coreOffX: number
  coreOffY: number
  tint: number
}

export function buildEvolveCtx(machine: OrganismStateMachine, now: number): EvolveCtx {
  const age = machine.organismAge
  const dwellSec = (now - machine.phaseSince) / 1000
  const wild = machine.wildness
  const ritual = now < machine.ritualUntil ? machine.ritual : null

  let sizeMul = 0.88 + age * 0.28 + clamp(dwellSec / 50, 0, 0.18)
  let speedMul = 0.85 + age * 0.35 + wild * 0.5
  let spawnMul = 0.7 + age * 0.6 + wild * 0.8
  let veinBoost = clamp(dwellSec / 25, 0, 0.5) + age * 0.35

  if (ritual === 'mutant') { sizeMul *= 1.35; speedMul *= 0.7 }
  if (ritual === 'hurricane') { spawnMul *= 2.2; speedMul *= 1.6 }
  if (ritual === 'vacuum') { speedMul *= 1.45; spawnMul *= 0.4 }

  return {
    age,
    dwellSec,
    wildness: wild,
    chaosBias: machine.chaosBias,
    ritual,
    isExhaust: machine.phase === 'exhaust',
    sizeMul,
    speedMul,
    veinBoost,
    spawnMul,
    coreOffX: machine.coreOffX,
    coreOffY: machine.coreOffY,
    tint: machine.circadianTint,
  }
}

export function tickEvolution(
  machine: OrganismStateMachine,
  now: number,
  dt: number,
  energy: number,
  env: number,
  triggers: TriggerFrame,
  reducedMotion: boolean,
) {
  if (env > 0.06) {
    machine.organismAge = clamp(machine.organismAge + dt * 0.000045 * (0.4 + energy), 0, 1)
  } else {
    machine.organismAge = clamp(machine.organismAge - dt * 0.000022, 0, 1)
  }

  machine.wildness = Math.max(0, machine.wildness - dt * 0.0009)
  if (triggers.chaosHit) {
    machine.wildness = clamp(machine.wildness + 0.32 + Math.random() * 0.35, 0, 1)
  }
  if (triggers.beat && Math.random() < 0.12 + energy * 0.1) {
    machine.wildness = clamp(machine.wildness + 0.15 + Math.random() * 0.2, 0, 1)
  }
  if (triggers.highsHit && Math.random() < 0.08) {
    machine.wildness = clamp(machine.wildness + 0.1, 0, 1)
  }

  machine.chaosBias = lerp(machine.chaosBias, randSigned(now * 0.001 + machine.organismAge * 99), 0.004)
  machine.circadianTint = Math.sin(now / 52000 + machine.chaosBias) * 0.5 + 0.5

  const driftTarget = now < machine.ritualUntil && machine.ritual === 'drift'
    ? { x: randSigned(now) * 28, y: randSigned(now + 7) * 22 }
    : { x: machine.chaosBias * 12 * machine.organismAge, y: Math.sin(now / 38000) * 10 * machine.organismAge }
  machine.coreOffX = lerp(machine.coreOffX, driftTarget.x, 0.02)
  machine.coreOffY = lerp(machine.coreOffY, driftTarget.y, 0.02)

  if (!reducedMotion && now >= machine.nextRitualAt && energy > 0.12) {
    startRitual(machine, now)
  }
}

const RITUALS: RitualId[] = ['hurricane', 'census', 'drift', 'mutant', 'vacuum']

function startRitual(machine: OrganismStateMachine, now: number) {
  const pick = RITUALS[Math.floor(Math.random() * RITUALS.length)] ?? 'hurricane'
  machine.ritual = pick
  machine.ritualUntil = now + (pick === 'drift' ? 4200 : pick === 'census' ? 1600 : 2800)
  machine.nextRitualAt = now + 38000 + Math.random() * 45000
  machine.wildness = clamp(machine.wildness + 0.25 + Math.random() * 0.3, 0, 1)

  if (pick === 'vacuum') machine.gatherWaveUntil = Math.max(machine.gatherWaveUntil, now + 2400)
  if (pick === 'hurricane') machine.ringShatterUntil = now + 600
}

export function extremeRoll(wildness: number, age: number, threshold = 0.82): boolean {
  const gate = threshold - wildness * 0.35 - age * 0.15
  return Math.random() > gate
}

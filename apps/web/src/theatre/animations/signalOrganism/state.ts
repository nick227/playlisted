import type { TriggerFrame } from '../../VisualTriggers'
import type { OrganismPhase } from './types'
import type { RitualId } from './evolution'
import { tickEvolution } from './evolution'

const CHAOS_WINDOW_MS = 5000
const FRENZY_MIN_MS = 1400
const EXHAUST_MS = 2200

export class OrganismStateMachine {
  phase: OrganismPhase = 'dormant'
  phaseSince = 0
  frenzyUntil = 0
  exhaustUntil = 0
  veinPulse = 0
  metabolicUntil = 0
  ringShatterUntil = 0
  hyperUntil = 0
  synapseUntil = 0
  wakeFlashUntil = 0
  gatherWaveUntil = 0

  organismAge = 0
  wildness = 0
  chaosBias = 0
  circadianTint = 0
  coreOffX = 0
  coreOffY = 0
  ritual: RitualId = null
  ritualUntil = 0
  nextRitualAt = 0
  phaseDwellSec = 0

  private chaosTimes: number[] = []
  private wasQuiet = true

  constructor() {
    this.nextRitualAt = 22000 + Math.random() * 28000
  }

  update(
    now: number,
    dt: number,
    triggers: TriggerFrame,
    energy: number,
    env: number,
    reducedMotion: boolean,
  ) {
    this.veinPulse = Math.max(0, this.veinPulse - dt * 0.002)
    if (triggers.midsHit) {
      this.veinPulse = 1
      this.synapseUntil = now + 280
    }
    if (triggers.bassHit) {
      this.metabolicUntil = now + 320
      if (this.wasQuiet && env > 0.04) {
        this.wakeFlashUntil = now + 500
        this.wasQuiet = false
      }
    }
    if (env < 0.04) this.wasQuiet = true

    if (triggers.beat) this.metabolicUntil = now + 380
    if (triggers.chaosHit) {
      this.chaosTimes.push(now)
      this.chaosTimes = this.chaosTimes.filter(t => now - t < CHAOS_WINDOW_MS)
      if (this.chaosTimes.length >= 2) this.hyperUntil = now + 3000
      this.frenzyUntil = now + FRENZY_MIN_MS
      this.ringShatterUntil = now + 420
      if (Math.random() < 0.4) this.wildness = Math.min(1, this.wildness + 0.2)
    }

    if (triggers.chaosHit || energy > 0.78) {
      this.frenzyUntil = Math.max(this.frenzyUntil, now + FRENZY_MIN_MS)
    }

    tickEvolution(this, now, dt, energy, env, triggers, reducedMotion)

    const prev = this.phase
    if (now < this.frenzyUntil) {
      this.phase = 'frenzy'
    } else if (now < this.exhaustUntil) {
      this.phase = 'exhaust'
    } else if (reducedMotion) {
      this.phase = energy > 0.2 ? 'feeding' : 'dormant'
    } else if (energy < 0.1) {
      this.phase = 'dormant'
    } else if (energy < 0.35 || triggers.midsHit) {
      this.phase = 'signaling'
    } else if (energy < 0.55) {
      this.phase = 'feeding'
    } else {
      this.phase = 'signaling'
    }

    if (prev === 'frenzy' && this.phase !== 'frenzy' && now >= this.frenzyUntil) {
      this.exhaustUntil = now + EXHAUST_MS
      this.phase = 'exhaust'
      if (Math.random() < 0.5) {
        for (let i = 0; i < 3; i++) this.chaosBias = (Math.random() - 0.5) * 1.2
      }
    }
    if (this.phase !== prev) this.phaseSince = now
    this.phaseDwellSec = (now - this.phaseSince) / 1000
  }

  phaseMix(): number {
    const dwell = this.phaseDwellSec
    let base: number
    switch (this.phase) {
      case 'dormant': base = 0.15; break
      case 'feeding': base = 0.45; break
      case 'signaling': base = 0.7; break
      case 'frenzy': base = 1; break
      case 'exhaust': base = 0.25; break
      default: base = 0.5
    }
    const dwellBoost = Math.min(0.22, dwell / 35)
    const ageBoost = this.organismAge * 0.14
    const wildBoost = this.wildness * 0.18
    return Math.min(1.2, base + dwellBoost + ageBoost + wildBoost)
  }

  isHyper(now: number) {
    return now < this.hyperUntil
  }
}

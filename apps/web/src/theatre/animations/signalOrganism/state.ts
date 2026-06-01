import type { TriggerFrame } from '../../VisualTriggers'
import type { OrganismPhase } from './types'

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
  private chaosTimes: number[] = []
  private wasQuiet = true

  update(
    now: number,
    triggers: TriggerFrame,
    energy: number,
    env: number,
    reducedMotion: boolean,
  ) {
    const dt = 16
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
    }

    if (triggers.chaosHit || energy > 0.78) this.frenzyUntil = Math.max(this.frenzyUntil, now + FRENZY_MIN_MS)

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
    }
    if (this.phase !== prev) this.phaseSince = now
  }

  phaseMix(): number {
    switch (this.phase) {
      case 'dormant': return 0.15
      case 'feeding': return 0.45
      case 'signaling': return 0.7
      case 'frenzy': return 1
      case 'exhaust': return 0.25
      default: return 0.5
    }
  }

  isHyper(now: number) {
    return now < this.hyperUntil
  }
}

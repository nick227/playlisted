import type { AudioReact, RoomPhase, SceneType, WatchBudget } from '../core/types'
import { clamp } from '../core/math'

// ── Watch budgets per scene type ──────────────────────────────────────────────

const WATCH_BUDGETS: Record<SceneType, WatchBudget> = {
  bandStage:    { min:  6000, target:  8000, max: 11000 },
  bar:          { min:  5000, target:  7000, max:  9000 },
  danceFloor:   { min:  5000, target:  7000, max: 10000 },
  conversation: { min:  6000, target:  8000, max: 10000 },
  hallwayCrowd: { min:  4000, target:  5500, max:  7500 },
}

const APPROACH_MS  = 1800
const THRESHOLD_MS = 1400
const PASSAGE_MS   = 1200
const INHABITED_MS = 2500

// ── Intensity curves ──────────────────────────────────────────────────────────

/** Cubic ease-in */
function easeIn(t: number): number { return t * t * t }
/** Cubic ease-out */
function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3) }
/** Smooth step */
function smoothStep(t: number): number { return t * t * (3 - 2 * t) }

function intensityForPhase(phase: RoomPhase, phaseT: number, audio: AudioReact): number {
  switch (phase) {
    case 'approach':   return easeIn(phaseT) * 0.6 + audio.bass * 0.2
    case 'watch':      return 0.5 + smoothStep(phaseT) * 0.5 + audio.bass * 0.25
    case 'threshold':  return 0.7 + easeOut(phaseT) * 0.3 + audio.chaos * 0.2
    case 'passage':    return 0.9 + audio.chaos * 0.1
    case 'inhabited':  return 0.6 + smoothStep(phaseT) * 0.4 + audio.bass * 0.15
    case 'voidBloom':  return 1
    default:           return 0.5
  }
}

// ── VoidBloom trigger ─────────────────────────────────────────────────────────

const CHAOS_THRESHOLD = 0.68
const CHAOS_SUSTAIN_MS = 1200
const VOID_MIN_INTERVAL_MS = 30000

// ── Phase state machine ───────────────────────────────────────────────────────

export type PhaseFrame = {
  phase: RoomPhase
  /** 0–1 normalized time within this phase */
  phaseT: number
  /** 0–1 combined intensity for current phase */
  intensity: number
  /** 0–1 accumulated chaos pressure */
  chaosLevel: number
  /** true on the frame voidBloom triggers */
  voidBloomTriggered: boolean
  /** true during voidBloom phase */
  inVoidBloom: boolean
  /** 0–1 within voidBloom phase */
  voidBloomT: number
}

export class PhaseController {
  private phase: RoomPhase = 'approach'
  private phaseStart = 0
  private sceneType: SceneType = 'bandStage'
  private watchDuration = 12000
  private chaosAccum = 0
  private lastVoidBloom = -VOID_MIN_INTERVAL_MS
  private voidBloomStart = -1
  private voidBloomDuration = 2800

  reset(sceneType: SceneType, nowMs: number, seed = 0) {
    this.phase = 'approach'
    this.phaseStart = nowMs
    this.sceneType = sceneType
    const budget = WATCH_BUDGETS[sceneType]
    // Seed-based variation within budget
    const range = budget.max - budget.min
    const frac = ((seed * 0x9e3779b9) >>> 0) / 0xffffffff
    this.watchDuration = budget.min + frac * range
    this.chaosAccum = 0
    this.voidBloomStart = -1
  }

  tick(nowMs: number, audio: AudioReact, reducedMotion: boolean): PhaseFrame {
    const elapsed = nowMs - this.phaseStart
    let voidBloomTriggered = false

    // VoidBloom: sustained chaos check (skip in reduced motion)
    if (!reducedMotion && this.phase !== 'voidBloom') {
      if (audio.chaos > CHAOS_THRESHOLD) {
        this.chaosAccum += 16
      } else {
        this.chaosAccum = Math.max(0, this.chaosAccum - 8)
      }
      const canVoid = nowMs - this.lastVoidBloom > VOID_MIN_INTERVAL_MS
      if (canVoid && this.chaosAccum > CHAOS_SUSTAIN_MS) {
        this.phase = 'voidBloom'
        this.phaseStart = nowMs
        this.voidBloomStart = nowMs
        this.chaosAccum = 0
        this.lastVoidBloom = nowMs
        voidBloomTriggered = true
      }
    }

    // VoidBloom: auto-exit after duration
    if (this.phase === 'voidBloom') {
      const vt = clamp((nowMs - this.voidBloomStart) / this.voidBloomDuration, 0, 1)
      if (vt >= 1) {
        this.advance(nowMs)
      }
      return {
        phase: 'voidBloom',
        phaseT: vt,
        intensity: 1,
        chaosLevel: clamp(this.chaosAccum / CHAOS_SUSTAIN_MS, 0, 1),
        voidBloomTriggered,
        inVoidBloom: true,
        voidBloomT: vt,
      }
    }

    // Normal phase progression
    const phaseT = this.normalizedT(elapsed)
    if (this.shouldAdvance(elapsed)) this.advance(nowMs)

    return {
      phase: this.phase,
      phaseT,
      intensity: intensityForPhase(this.phase, phaseT, audio),
      chaosLevel: clamp(this.chaosAccum / CHAOS_SUSTAIN_MS, 0, 1),
      voidBloomTriggered,
      inVoidBloom: false,
      voidBloomT: 0,
    }
  }

  private normalizedT(elapsed: number): number {
    const dur = this.phaseDuration()
    return dur > 0 ? clamp(elapsed / dur, 0, 1) : 1
  }

  private phaseDuration(): number {
    switch (this.phase) {
      case 'approach':   return APPROACH_MS
      case 'watch':      return this.watchDuration
      case 'threshold':  return THRESHOLD_MS
      case 'passage':    return PASSAGE_MS
      case 'inhabited':  return INHABITED_MS
      default:           return 2000
    }
  }

  private shouldAdvance(elapsed: number): boolean {
    return elapsed >= this.phaseDuration()
  }

  private advance(nowMs: number) {
    this.phaseStart = nowMs
    switch (this.phase) {
      case 'approach':   this.phase = 'watch';      break
      case 'watch':      this.phase = 'threshold';  break
      case 'threshold':  this.phase = 'passage';    break
      case 'passage':    this.phase = 'inhabited';  break
      case 'inhabited':  this.phase = 'approach';   break
      case 'voidBloom':  this.phase = 'approach';   break
    }
  }

  /** Current scene type for external query. */
  get currentScene(): SceneType { return this.sceneType }

  /** 0–1 intensity for external overlay consumers (postFx, palette). */
  get rawChaos(): number { return clamp(this.chaosAccum / CHAOS_SUSTAIN_MS, 0, 1) }
}

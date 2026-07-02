import type { Features } from './AudioFeatureExtractor'
import { BeatClock as BeatClockImpl, EMPTY_BEAT_CLOCK, type BeatClockSnapshot } from './BeatClock'
import { getVisualTriggers, type TriggerFrame } from './VisualTriggers'
import { createDropDetectorState, tickDropDetector, type DropDetectorState } from './dropDetection'

export const AUDIO_SENSITIVITY_PRESETS = ['tame', 'vivid', 'chaos', 'nightmare'] as const
export type AudioSensitivityPreset = (typeof AUDIO_SENSITIVITY_PRESETS)[number]

export const DEFAULT_AUDIO_SENSITIVITY: AudioSensitivityPreset = 'vivid'

export type TriggerEdges = {
  beat: boolean
  bassHit: boolean
  midsHit: boolean
  highsHit: boolean
  chaosHit: boolean
  drop: boolean
}

export type BeatClock = BeatClockSnapshot

export type TriggersByPreset = Record<AudioSensitivityPreset, TriggerFrame>

export type TheatreAudioSnapshot = {
  features?: Features
  triggers: TriggerFrame
  triggersByPreset: TriggersByPreset
  edges: TriggerEdges
  beat: BeatClock
}

export { EMPTY_BEAT_CLOCK }

export const FALLBACK_TRIGGER_FRAME: TriggerFrame = {
  bassHit: false,
  midsHit: false,
  highsHit: false,
  beat: false,
  chaosHit: false,
  energy: 0,
  brightness: 0.5,
}

const EMPTY_EDGES: TriggerEdges = {
  beat: false,
  bassHit: false,
  midsHit: false,
  highsHit: false,
  chaosHit: false,
  drop: false,
}

function buildTriggersByPreset(features?: Features): TriggersByPreset {
  return {
    tame: getVisualTriggers(features, 'tame'),
    vivid: getVisualTriggers(features, 'vivid'),
    chaos: getVisualTriggers(features, 'chaos'),
    nightmare: getVisualTriggers(features, 'nightmare'),
  }
}

function buildStableTriggersByPreset(): TriggersByPreset {
  return {
    tame: { ...FALLBACK_TRIGGER_FRAME },
    vivid: { ...FALLBACK_TRIGGER_FRAME },
    chaos: { ...FALLBACK_TRIGGER_FRAME },
    nightmare: { ...FALLBACK_TRIGGER_FRAME },
  }
}

function risingEdge(prev: boolean, next: boolean): boolean {
  return next && !prev
}

function deriveEdges(prev: TriggerFrame | null, current: TriggerFrame): TriggerEdges {
  if (!prev) return { ...EMPTY_EDGES }
  return {
    beat: risingEdge(prev.beat, current.beat),
    bassHit: risingEdge(prev.bassHit, current.bassHit),
    midsHit: risingEdge(prev.midsHit, current.midsHit),
    highsHit: risingEdge(prev.highsHit, current.highsHit),
    chaosHit: risingEdge(prev.chaosHit, current.chaosHit),
    drop: false,
  }
}

/** Stable snapshot for callers that need deterministic defaults without live audio. */
export function createFallbackAudioSnapshot(): TheatreAudioSnapshot {
  const triggersByPreset = buildStableTriggersByPreset()
  return {
    triggers: triggersByPreset[DEFAULT_AUDIO_SENSITIVITY],
    triggersByPreset,
    edges: { ...EMPTY_EDGES },
    beat: { ...EMPTY_BEAT_CLOCK },
  }
}

export function resolveAudioSensitivityPreset(preset?: string): AudioSensitivityPreset {
  if (preset && (AUDIO_SENSITIVITY_PRESETS as readonly string[]).includes(preset)) {
    return preset as AudioSensitivityPreset
  }
  return DEFAULT_AUDIO_SENSITIVITY
}

export function getTriggersForPreset(
  snapshot: TheatreAudioSnapshot | undefined,
  preset?: string,
): TriggerFrame {
  if (!snapshot) {
    return createFallbackAudioSnapshot().triggersByPreset[resolveAudioSensitivityPreset(preset)]
  }
  const key = resolveAudioSensitivityPreset(preset)
  return snapshot.triggersByPreset[key] ?? snapshot.triggers
}

export class TheatreAudioBus {
  private prevDefaultTriggers: TriggerFrame | null = null
  private dropState: DropDetectorState = createDropDetectorState()
  private beatClock = new BeatClockImpl()
  private clockNowMs = 0

  reset(): void {
    this.prevDefaultTriggers = null
    this.dropState = createDropDetectorState()
    this.beatClock.reset()
    this.clockNowMs = 0
  }

  tick(features: Features | undefined, deltaMs: number): TheatreAudioSnapshot {
    this.clockNowMs += deltaMs
    const triggersByPreset = buildTriggersByPreset(features)
    const triggers = triggersByPreset[DEFAULT_AUDIO_SENSITIVITY]
    const edges = deriveEdges(this.prevDefaultTriggers, triggers)

    const dropResult = tickDropDetector(this.dropState, triggers.energy, deltaMs)
    this.dropState = dropResult.state
    edges.drop = dropResult.edge

    this.prevDefaultTriggers = triggers

    const beat = this.beatClock.tick({
      nowMs: this.clockNowMs,
      deltaMs,
      beatEdge: edges.beat,
    })

    return {
      features,
      triggers,
      triggersByPreset,
      edges,
      beat,
    }
  }
}

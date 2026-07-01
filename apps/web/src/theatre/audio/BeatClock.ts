export type BeatClockSnapshot = {
  bpm: number
  confidence: number
  phase: number
  msSinceLastBeat: number
  lastBeatAtMs: number
}

export const EMPTY_BEAT_CLOCK: BeatClockSnapshot = {
  bpm: 0,
  confidence: 0,
  phase: 0,
  msSinceLastBeat: 0,
  lastBeatAtMs: 0,
}

const MIN_BPM = 60
const MAX_BPM = 200
const MIN_INTERVAL_MS = 60_000 / MAX_BPM
const MAX_INTERVAL_MS = 60_000 / MIN_BPM
const MAX_INTERVALS = 8
const MIN_INTERVALS_FOR_BPM = 2
const CONFIDENCE_THRESHOLD = 0.35

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function intervalInRange(intervalMs: number): boolean {
  return intervalMs >= MIN_INTERVAL_MS && intervalMs <= MAX_INTERVAL_MS
}

function computeConfidence(intervals: number[]): number {
  if (intervals.length < MIN_INTERVALS_FOR_BPM) return 0

  const med = median(intervals)
  if (med <= 0) return 0

  const deviations = intervals.map(value => Math.abs(value - med))
  const mad = median(deviations)
  const spread = mad / med
  const sampleFactor = Math.min(1, intervals.length / 4)
  const coherence = Math.max(0, 1 - spread * 2.5)

  return clamp(sampleFactor * coherence, 0, 1)
}

export class BeatClock {
  private lastBeatAtMs = 0
  private intervals: number[] = []

  reset(): void {
    this.lastBeatAtMs = 0
    this.intervals = []
  }

  tick(input: { nowMs: number; deltaMs: number; beatEdge: boolean }): BeatClockSnapshot {
    if (input.beatEdge) {
      if (this.lastBeatAtMs > 0) {
        const intervalMs = input.nowMs - this.lastBeatAtMs
        if (intervalInRange(intervalMs)) {
          this.intervals.push(intervalMs)
          if (this.intervals.length > MAX_INTERVALS) {
            this.intervals.shift()
          }
        }
      }
      this.lastBeatAtMs = input.nowMs
    }

    const msSinceLastBeat =
      this.lastBeatAtMs > 0 ? Math.max(0, input.nowMs - this.lastBeatAtMs) : 0

    const confidence = computeConfidence(this.intervals)
    if (confidence < CONFIDENCE_THRESHOLD) {
      return {
        bpm: 0,
        confidence: 0,
        phase: 0,
        msSinceLastBeat,
        lastBeatAtMs: this.lastBeatAtMs,
      }
    }

    const medianInterval = median(this.intervals)
    const bpm = medianInterval > 0 ? 60_000 / medianInterval : 0
    const beatPeriod = bpm > 0 ? 60_000 / bpm : 0
    const phase = beatPeriod > 0 ? clamp(msSinceLastBeat / beatPeriod, 0, 1) : 0

    return {
      bpm,
      confidence,
      phase,
      msSinceLastBeat,
      lastBeatAtMs: this.lastBeatAtMs,
    }
  }
}

export function isIntervalInBeatRange(intervalMs: number): boolean {
  return intervalInRange(intervalMs)
}

export function estimateBpmFromIntervals(intervals: number[]): number {
  const valid = intervals.filter(intervalInRange)
  if (valid.length < MIN_INTERVALS_FOR_BPM) return 0
  const med = median(valid)
  return med > 0 ? 60_000 / med : 0
}

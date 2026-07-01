import { describe, expect, it } from 'vitest'

import {
  BeatClock,
  EMPTY_BEAT_CLOCK,
  estimateBpmFromIntervals,
  isIntervalInBeatRange,
} from '../audio/BeatClock'

describe('BeatClock', () => {
  it('returns zero bpm and confidence when no beats arrive', () => {
    const clock = new BeatClock()
    const snapshot = clock.tick({ nowMs: 1_000, deltaMs: 16, beatEdge: false })

    expect(snapshot.bpm).toBe(0)
    expect(snapshot.confidence).toBe(0)
    expect(snapshot.phase).toBe(0)
    expect(snapshot.msSinceLastBeat).toBe(0)
    expect(snapshot.lastBeatAtMs).toBe(0)
  })

  it('estimates BPM from stable beat intervals', () => {
    const clock = new BeatClock()
    const intervalMs = 500 // 120 BPM

    clock.tick({ nowMs: 0, deltaMs: 0, beatEdge: true })
    clock.tick({ nowMs: intervalMs, deltaMs: intervalMs, beatEdge: true })
    clock.tick({ nowMs: intervalMs * 2, deltaMs: intervalMs, beatEdge: true })
    clock.tick({ nowMs: intervalMs * 3, deltaMs: intervalMs, beatEdge: true })
    const snapshot = clock.tick({ nowMs: intervalMs * 4, deltaMs: intervalMs, beatEdge: true })

    expect(snapshot.bpm).toBeCloseTo(120, 0)
    expect(snapshot.confidence).toBeGreaterThan(0.35)
  })

  it('reduces confidence when intervals are irregular', () => {
    const stable = new BeatClock()
    const irregular = new BeatClock()

    for (let i = 1; i <= 6; i += 1) {
      stable.tick({ nowMs: i * 500, deltaMs: 500, beatEdge: true })
      irregular.tick({ nowMs: i * (i % 2 === 0 ? 850 : 350), deltaMs: 16, beatEdge: true })
    }

    const stableSnapshot = stable.tick({ nowMs: 3_500, deltaMs: 16, beatEdge: false })
    const irregularSnapshot = irregular.tick({ nowMs: 3_500, deltaMs: 16, beatEdge: false })

    expect(stableSnapshot.confidence).toBeGreaterThan(irregularSnapshot.confidence)
    expect(irregularSnapshot.confidence).toBeLessThan(0.35)
    expect(irregularSnapshot.bpm).toBe(0)
  })

  it('advances phase between beat edges', () => {
    const clock = new BeatClock()
    const intervalMs = 500

    clock.tick({ nowMs: 0, deltaMs: 0, beatEdge: true })
    clock.tick({ nowMs: intervalMs, deltaMs: intervalMs, beatEdge: true })
    clock.tick({ nowMs: intervalMs * 2, deltaMs: intervalMs, beatEdge: true })
    clock.tick({ nowMs: intervalMs * 3, deltaMs: intervalMs, beatEdge: true })

    const atBeat = clock.tick({ nowMs: intervalMs * 4, deltaMs: intervalMs, beatEdge: true })
    const midBeat = clock.tick({ nowMs: intervalMs * 4 + 250, deltaMs: 250, beatEdge: false })

    expect(atBeat.phase).toBe(0)
    expect(midBeat.phase).toBeGreaterThan(0.45)
    expect(midBeat.phase).toBeLessThan(0.55)
  })

  it('reset clears bpm, confidence, and phase', () => {
    const clock = new BeatClock()

    clock.tick({ nowMs: 0, deltaMs: 0, beatEdge: true })
    clock.tick({ nowMs: 500, deltaMs: 500, beatEdge: true })
    clock.tick({ nowMs: 1_000, deltaMs: 500, beatEdge: true })
    clock.tick({ nowMs: 1_500, deltaMs: 500, beatEdge: true })
    clock.reset()

    const snapshot = clock.tick({ nowMs: 2_000, deltaMs: 16, beatEdge: false })
    expect(snapshot).toEqual(EMPTY_BEAT_CLOCK)
  })

  it('ignores out-of-range beat intervals', () => {
    expect(isIntervalInBeatRange(299)).toBe(false)
    expect(isIntervalInBeatRange(300)).toBe(true)
    expect(isIntervalInBeatRange(1_000)).toBe(true)
    expect(isIntervalInBeatRange(1_001)).toBe(false)
    expect(estimateBpmFromIntervals([100, 500, 500])).toBeCloseTo(120, 0)

    const clock = new BeatClock()
    for (let i = 0; i <= 4; i += 1) {
      clock.tick({ nowMs: i * 100, deltaMs: 100, beatEdge: true })
    }

    const snapshot = clock.tick({ nowMs: 500, deltaMs: 100, beatEdge: false })
    expect(snapshot.confidence).toBe(0)
    expect(snapshot.bpm).toBe(0)
  })
})

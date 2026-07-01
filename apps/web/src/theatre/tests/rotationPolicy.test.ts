import { describe, expect, it } from 'vitest'

import type { Features } from '../audio/AudioFeatureExtractor'
import type { TheatreAudioSnapshot } from '../audio/TheatreAudioBus'
import {
  DEFAULT_ROTATION_POLICY_CONFIG,
  evaluateRotationPolicy,
  matchesAudioGate,
} from '../rotation/RotationPolicy'

const BASE_MS = 1_000_000

function sampleFeatures(fluxOverall = 0): Features {
  return {
    rms: 0.1,
    env: 0.1,
    bands: { bass: 0.2, mids: 0.2, highs: 0.1 },
    bandEnv: { bass: 0.2, mids: 0.2, highs: 0.1 },
    flux: { overall: fluxOverall, bass: 0, mids: 0, highs: 0 },
    centroid: 0.4,
  }
}

function audioWithEdges(edges: Partial<TheatreAudioSnapshot['edges']>): TheatreAudioSnapshot {
  return {
    triggers: {
      bassHit: false,
      midsHit: false,
      highsHit: false,
      beat: false,
      chaosHit: false,
      energy: 0.5,
      brightness: 0.5,
    },
    triggersByPreset: {
      tame: {
        bassHit: false,
        midsHit: false,
        highsHit: false,
        beat: false,
        chaosHit: false,
        energy: 0,
        brightness: 0.5,
      },
      vivid: {
        bassHit: false,
        midsHit: false,
        highsHit: false,
        beat: false,
        chaosHit: false,
        energy: 0.5,
        brightness: 0.5,
      },
      chaos: {
        bassHit: false,
        midsHit: false,
        highsHit: false,
        beat: false,
        chaosHit: false,
        energy: 0.5,
        brightness: 0.5,
      },
      nightmare: {
        bassHit: false,
        midsHit: false,
        highsHit: false,
        beat: false,
        chaosHit: false,
        energy: 0.5,
        brightness: 0.5,
      },
    },
    edges: {
      beat: false,
      bassHit: false,
      midsHit: false,
      highsHit: false,
      chaosHit: false,
      drop: false,
      ...edges,
    },
    beat: { bpm: 0, confidence: 0, phase: 0, msSinceLastBeat: 0, lastBeatAtMs: 0 },
  }
}

describe('RotationPolicy', () => {
  const config = DEFAULT_ROTATION_POLICY_CONFIG

  it('holds before minHoldMs', () => {
    const decision = evaluateRotationPolicy({
      nowMs: BASE_MS + config.minHoldMs - 1,
      presetStartedAtMs: BASE_MS,
      audio: audioWithEdges({ beat: true }),
    }, config)

    expect(decision).toEqual({ action: 'hold' })
  })

  it('rotates on gate after minHoldMs', () => {
    const decision = evaluateRotationPolicy({
      nowMs: BASE_MS + config.minHoldMs + 1,
      presetStartedAtMs: BASE_MS,
      audio: audioWithEdges({ beat: true }),
    }, config)

    expect(decision).toEqual({ action: 'rotate', reason: 'gate' })
  })

  it('returns preload after targetHoldMs when no gate fires', () => {
    const decision = evaluateRotationPolicy({
      nowMs: BASE_MS + config.targetHoldMs + 1,
      presetStartedAtMs: BASE_MS,
      audio: audioWithEdges({}),
    }, config)

    expect(decision).toEqual({ action: 'preload' })
  })

  it('forces rotation after maxHoldMs', () => {
    const decision = evaluateRotationPolicy({
      nowMs: BASE_MS + config.maxHoldMs + 1,
      presetStartedAtMs: BASE_MS,
      audio: audioWithEdges({}),
    }, config)

    expect(decision).toEqual({ action: 'rotate', reason: 'force' })
  })

  it('supports flux fallback gate', () => {
    expect(matchesAudioGate({ kind: 'flux', threshold: 0.02 }, undefined, sampleFeatures(0.01))).toBe(false)
    expect(matchesAudioGate({ kind: 'flux', threshold: 0.02 }, undefined, sampleFeatures(0.05))).toBe(true)

    const decision = evaluateRotationPolicy({
      nowMs: BASE_MS + config.minHoldMs + 1,
      presetStartedAtMs: BASE_MS,
      features: sampleFeatures(0.05),
    }, { ...config, gate: { kind: 'flux', threshold: 0.02 } })

    expect(decision).toEqual({ action: 'rotate', reason: 'gate' })
  })
})

import { describe, expect, it } from 'vitest'

import {
  MEDIA_SEEK_DRIFT_THRESHOLD_SEC,
  MEDIA_SEEK_MIN_INTERVAL_MS,
  resolveMediaPlaybackTime,
  shouldSeekMediaTime,
  shouldThrottleMediaSeek,
} from '../media/resolveMediaPlaybackTime'

describe('resolveMediaPlaybackTime', () => {
  it('returns null before clip start', () => {
    expect(resolveMediaPlaybackTime({
      audioCurrentSec: 5,
      timelineStartSec: 10,
      loop: true,
      naturalDurationSec: 60,
    })).toBeNull()
  })

  it('computes looped media time with start offset', () => {
    const result = resolveMediaPlaybackTime({
      audioCurrentSec: 125,
      timelineStartSec: 0,
      startOffsetSec: 2,
      loop: true,
      naturalDurationSec: 60,
      videoDurationSec: 60,
    })

    expect(result).toEqual({
      clipElapsedSec: 125,
      mediaTimeSec: 7,
      shouldPlay: true,
    })
  })

  it('clamps and stops loop-off media at natural duration', () => {
    const result = resolveMediaPlaybackTime({
      audioCurrentSec: 90,
      timelineStartSec: 0,
      startOffsetSec: 0,
      loop: false,
      naturalDurationSec: 60,
      videoDurationSec: 60,
    })

    expect(result).toEqual({
      clipElapsedSec: 90,
      mediaTimeSec: 60,
      shouldPlay: false,
    })
  })

  it('uses video duration when metadata is available', () => {
    const result = resolveMediaPlaybackTime({
      audioCurrentSec: 30,
      timelineStartSec: 0,
      loop: true,
      naturalDurationSec: 120,
      videoDurationSec: 45,
    })

    expect(result?.mediaTimeSec).toBe(30)
  })

  it('only seeks when drift exceeds threshold', () => {
    expect(shouldSeekMediaTime(1.0, 1.1, MEDIA_SEEK_DRIFT_THRESHOLD_SEC)).toBe(false)
    expect(shouldSeekMediaTime(1.0, 1.35, MEDIA_SEEK_DRIFT_THRESHOLD_SEC)).toBe(true)
  })

  it('throttles repeated seek writes inside the minimum interval', () => {
    expect(shouldThrottleMediaSeek(1_000, null)).toBe(false)
    expect(shouldThrottleMediaSeek(1_100, 1_000, MEDIA_SEEK_MIN_INTERVAL_MS)).toBe(true)
    expect(shouldThrottleMediaSeek(1_260, 1_000, MEDIA_SEEK_MIN_INTERVAL_MS)).toBe(false)
  })
})

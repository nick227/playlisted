import { describe, expect, it } from 'vitest'

import {
  clipDurationAfterLoopChange,
  defaultClipDurationSec,
  getRemainingTimelineSec,
  layoutTimelineClips,
  splitClipAt,
} from './timelineLayout'
import type { SongVisualAttachmentRecord } from '@/lib/visualMediaApi'

function attachment(
  id: string,
  order: number,
  mediaType: 'video' | 'image',
  playback: Record<string, unknown> | null = null,
  durationMs: number | null = null,
): SongVisualAttachmentRecord {
  return {
    id,
    songId: 'rec-1',
    recordingId: 'rec-1',
    mediaAssetId: `asset-${id}`,
    policy: 'preferAttached',
    weight: 1,
    order,
    label: id,
    enabled: true,
    playback,
    rotation: null,
    beatFx: null,
    tags: null,
    mediaAsset: {
      id: `asset-${id}`,
      ownerId: 'user-1',
      mediaType,
      url: `/uploads/${mediaType}/${id}`,
      thumbnailUrl: null,
      originalName: `${id}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
      mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      sizeBytes: 1024,
      durationMs,
      width: null,
      height: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('timelineLayout', () => {
  it('first loop-on clip fills the whole song by default', () => {
    const first = attachment('clip-a', 0, 'video', { loop: true }, 60_000)
    expect(defaultClipDurationSec(first, 0, 120)).toBe(120)

    const duration = defaultClipDurationSec(first, 0, 120)
    const clips = layoutTimelineClips([
      { ...first, playback: { loop: true, timelineDurationSec: duration } },
    ], 120)

    expect(clips[0]?.durationSec).toBe(120)
    expect(getRemainingTimelineSec(clips, 120)).toBe(0)
  })

  it('loop-off clips use natural duration and never auto-fill beyond it', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: false }, 60_000),
    ], 120)

    expect(clips).toHaveLength(1)
    expect(clips[0]?.durationSec).toBe(60)
    expect(getRemainingTimelineSec(clips, 120)).toBe(60)
  })

  it('turning loop off clamps an stretched clip back to natural duration', () => {
    const stretched = attachment('clip-a', 0, 'video', { loop: true, timelineDurationSec: 120 }, 60_000)
    expect(
      clipDurationAfterLoopChange(stretched, 0, 120, false, 120),
    ).toBe(60)
  })

  it('turning loop on expands clip to fill remaining timeline', () => {
    const natural = attachment('clip-a', 60, 'video', { loop: false, timelineDurationSec: 60 }, 60_000)
    expect(
      clipDurationAfterLoopChange(natural, 60, 120, true, 60),
    ).toBe(60)
  })

  it('blocks additional clips once timeline is full', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: true, timelineDurationSec: 120 }, 60_000),
      attachment('clip-b', 1, 'image', { loop: false }),
    ], 120)

    expect(clips).toHaveLength(1)
    expect(getRemainingTimelineSec(clips, 120)).toBe(0)
  })

  it('respects explicit timelineStartSec positions with gaps', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: false, timelineStartSec: 0, timelineDurationSec: 20 }, 60_000),
      attachment('clip-b', 1, 'image', { loop: false, timelineStartSec: 40, timelineDurationSec: 8 }),
    ], 120)

    expect(clips).toHaveLength(2)
    expect(clips[0]?.startSec).toBe(0)
    expect(clips[1]?.startSec).toBe(40)
    expect(getRemainingTimelineSec(clips, 120)).toBe(72)
  })

  it('splits clip timing for cut operations', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: false, timelineStartSec: 10, timelineDurationSec: 30, startOffsetMs: 1000 }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    const split = splitClipAt(clip!, 25)
    expect(split).toEqual({
      leftDurationSec: 15,
      rightDurationSec: 15,
      rightStartOffsetMs: 16000,
    })
  })
})

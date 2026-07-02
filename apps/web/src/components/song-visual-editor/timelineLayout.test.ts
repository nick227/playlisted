import { describe, expect, it } from 'vitest'

import {
  defaultClipDurationSec,
  getRemainingTimelineSec,
} from './timelineLayout'
import { layoutTimelineClips } from './types'
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
  it('uses natural duration for non-loop video and leaves remaining space', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: false }, 60_000),
    ], 120)

    expect(clips).toHaveLength(1)
    expect(clips[0]?.durationSec).toBe(60)
    expect(getRemainingTimelineSec(clips, 120)).toBe(60)
  })

  it('fills remaining timeline when loop is enabled', () => {
    const first = attachment('clip-a', 0, 'video', { loop: true }, 60_000)
    const duration = defaultClipDurationSec(first, 0, 120)
    const clips = layoutTimelineClips([
      { ...first, playback: { loop: true, timelineDurationSec: duration } },
    ], 120)

    expect(clips[0]?.durationSec).toBe(120)
    expect(getRemainingTimelineSec(clips, 120)).toBe(0)
  })

  it('blocks additional clips once timeline is full', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: true, timelineDurationSec: 120 }, 60_000),
      attachment('clip-b', 1, 'image', { loop: false }),
    ], 120)

    expect(clips).toHaveLength(1)
    expect(getRemainingTimelineSec(clips, 120)).toBe(0)
  })
})

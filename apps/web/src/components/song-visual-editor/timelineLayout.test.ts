import { describe, expect, it } from 'vitest'

import {
  defaultClipDurationSec,
  getRemainingTimelineSec,
  getTimelineUsedSec,
  layoutTimelineClips,
  resolveClipInsert,
  resolveClipMove,
  resolveClipResizeEnd,
  resolveClipResizeStart,
  resolveClipResetTrim,
  trimClipAtShortSide,
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
      { ...first, playback: { loop: true, timelineDurationSec: duration, timelineStartSec: 0 } },
    ], 120)

    expect(clips[0]?.durationSec).toBe(120)
    expect(getRemainingTimelineSec(clips, 120)).toBe(0)
  })

  it('ignores stored loop:false — all clips loop and auto-fill the remaining song', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: false, timelineStartSec: 0 }, 60_000),
    ], 120)

    expect(clips).toHaveLength(1)
    expect(clips[0]?.loop).toBe(true)
    expect(clips[0]?.durationSec).toBe(120)
    expect(getRemainingTimelineSec(clips, 120)).toBe(0)
  })

  it('packs legacy clips without timelineStartSec after explicit clips', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: true, timelineDurationSec: 120, timelineStartSec: 0 }, 60_000),
      attachment('clip-b', 1, 'image', { loop: false }),
    ], 120)

    expect(clips).toHaveLength(1)
  })

  it('respects explicit timelineStartSec positions with gaps and overlaps', () => {
    const clips = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: false, timelineStartSec: 0, timelineDurationSec: 20 }, 60_000),
      attachment('clip-b', 1, 'image', { loop: false, timelineStartSec: 40, timelineDurationSec: 8 }),
      attachment('clip-c', 2, 'video', { loop: false, timelineStartSec: 10, timelineDurationSec: 20 }, 60_000),
    ], 120)

    expect(clips).toHaveLength(3)
    expect(getTimelineUsedSec(clips)).toBe(48)
    expect(getRemainingTimelineSec(clips, 120)).toBe(72)
  })

  it('rejects insert when no room remains at playhead', () => {
    const asset = attachment('clip-a', 0, 'video', null, 60_000)
    expect(resolveClipInsert(asset, 119.8, 120, { loop: false })).toBeNull()
  })

  it('resize end can extend past natural media duration since clips loop', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', {
        loop: false,
        timelineStartSec: 0,
        timelineDurationSec: 40,
        startOffsetMs: 20_000,
      }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    const bounds = resolveClipResizeEnd(clip!.attachment, clip!, 60, 120)
    expect(bounds?.timelineDurationSec).toBe(60)
  })

  it('clamps move so clip cannot extend past song end', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: true, timelineStartSec: 0, timelineDurationSec: 30 }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    const bounds = resolveClipMove(clip!.attachment, clip!, 100, 120)
    expect(bounds?.timelineStartSec).toBe(90)
    expect(bounds?.timelineDurationSec).toBe(30)
  })

  it('move preserves media cut-in', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', {
        loop: false,
        timelineStartSec: 10,
        timelineDurationSec: 20,
        startOffsetMs: 5000,
      }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    const bounds = resolveClipMove(clip!.attachment, clip!, 25, 120)
    expect(bounds?.timelineStartSec).toBe(25)
    expect(bounds?.startOffsetMs).toBe(5000)
  })

  it('trim cut deletes the shorter side and respects media bounds', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', { loop: false, timelineStartSec: 10, timelineDurationSec: 30, startOffsetMs: 1000 }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    expect(trimClipAtShortSide(clip!, 25, 120)).toEqual({
      action: 'trim',
      timelineStartSec: 25,
      timelineDurationSec: 15,
      startOffsetMs: 16000,
    })
    expect(trimClipAtShortSide(clip!, 18, 120)).toEqual({
      action: 'trim',
      timelineStartSec: 18,
      timelineDurationSec: 22,
      startOffsetMs: 9000,
    })
  })

  it('resize start cannot extend before media start', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', {
        loop: false,
        timelineStartSec: 10,
        timelineDurationSec: 30,
        startOffsetMs: 5000,
      }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    const bounds = resolveClipResizeStart(clip!.attachment, clip!, 0, 120)
    expect(bounds?.timelineStartSec).toBe(5)
    expect(bounds?.timelineDurationSec).toBe(35)
    expect(bounds?.startOffsetMs).toBe(0)
  })

  it('left resize right increases media cut-in', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', {
        loop: false,
        timelineStartSec: 10,
        timelineDurationSec: 20,
        startOffsetMs: 2000,
      }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    const bounds = resolveClipResizeStart(clip!.attachment, clip!, 15, 120)
    expect(bounds).toEqual({
      timelineStartSec: 15,
      timelineDurationSec: 15,
      startOffsetMs: 7000,
    })
  })

  it('left resize left decreases media cut-in', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', {
        loop: false,
        timelineStartSec: 10,
        timelineDurationSec: 20,
        startOffsetMs: 5000,
      }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    const bounds = resolveClipResizeStart(clip!.attachment, clip!, 8, 120)
    expect(bounds).toEqual({
      timelineStartSec: 8,
      timelineDurationSec: 22,
      startOffsetMs: 3000,
    })
  })

  it('reset trim clears cut-in and extends clip left', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', {
        loop: false,
        timelineStartSec: 10,
        timelineDurationSec: 20,
        startOffsetMs: 5000,
      }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    expect(resolveClipResetTrim(clip!.attachment, clip!, 120)).toEqual({
      timelineStartSec: 5,
      timelineDurationSec: 25,
      startOffsetMs: 0,
    })
  })

  it('reset trim is a no-op when cut-in is already zero', () => {
    const clip = layoutTimelineClips([
      attachment('clip-a', 0, 'video', {
        loop: false,
        timelineStartSec: 10,
        timelineDurationSec: 20,
        startOffsetMs: 0,
      }, 60_000),
    ], 120)[0]

    expect(clip).toBeDefined()
    expect(resolveClipResetTrim(clip!.attachment, clip!, 120)).toBeNull()
  })
})

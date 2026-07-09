import { describe, expect, it } from 'vitest'

import { mapSongVisualMediaApiResponse } from '../media/mapApiVisualMedia'

describe('mapSongVisualMediaApiResponse', () => {
  it('maps API payload into theatre attachments and policy', () => {
    const resolved = mapSongVisualMediaApiResponse({
      songId: 'rec-1',
      recordingId: 'rec-1',
      policy: 'preferAttached',
      attachments: [
        {
          id: 'att-1',
          songId: 'rec-1',
          recordingId: 'rec-1',
          mediaAssetId: 'asset-1',
          policy: 'preferAttached',
          weight: 2,
          order: 0,
          label: 'User clip',
          enabled: true,
          playback: { loop: true, muted: true, objectFit: 'cover' },
          rotation: null,
          beatFx: { enabled: true, intensity: 'subtle', effects: ['scale', 'brightness'] },
          tags: ['user-media'],
          mediaAsset: {
            id: 'asset-1',
            mediaType: 'video',
            url: '/uploads/videos/clip.mp4',
            thumbnailUrl: null,
            originalName: 'clip.mp4',
            durationMs: 60_000,
          },
        },
      ],
    })

    expect(resolved.policy).toBe('preferAttached')
    expect(resolved.attachments).toHaveLength(1)
    expect(resolved.attachments[0]?.url).toBe('/uploads/videos/clip.mp4')
    expect(resolved.attachments[0]?.beatFx?.enabled).toBe(true)
  })

  it('returns defaultOnly when no enabled attachments remain', () => {
    const resolved = mapSongVisualMediaApiResponse({
      songId: 'rec-1',
      recordingId: 'rec-1',
      policy: 'preferAttached',
      attachments: [],
    })

    expect(resolved).toEqual({ attachments: [], policy: 'defaultOnly', atmosphereFx: null })
  })

  it('uses enabled attachment policies defensively when top-level policy is stale', () => {
    const resolved = mapSongVisualMediaApiResponse({
      songId: 'rec-1',
      recordingId: 'rec-1',
      policy: 'preferAttached',
      attachments: [
        {
          id: 'att-1',
          songId: 'rec-1',
          recordingId: 'rec-1',
          mediaAssetId: 'asset-1',
          policy: 'attachedOnly',
          weight: 1,
          order: 0,
          label: 'Attached only clip',
          enabled: true,
          playback: { loop: true, timelineStartSec: 0, timelineDurationSec: 120 },
          rotation: null,
          beatFx: null,
          tags: null,
          mediaAsset: {
            id: 'asset-1',
            mediaType: 'video',
            url: '/uploads/videos/clip.mp4',
            thumbnailUrl: null,
            originalName: 'clip.mp4',
            durationMs: 60_000,
          },
        },
      ],
    })

    expect(resolved.policy).toBe('attachedOnly')
    expect(resolved.attachments[0]?.playback?.timelineStartSec).toBe(0)
    expect(resolved.attachments[0]?.playback?.timelineDurationSec).toBe(120)
  })

  it('ignores disabled attachment policies', () => {
    const resolved = mapSongVisualMediaApiResponse({
      songId: 'rec-1',
      recordingId: 'rec-1',
      policy: 'preferAttached',
      attachments: [
        {
          id: 'att-disabled',
          songId: 'rec-1',
          recordingId: 'rec-1',
          mediaAssetId: 'asset-disabled',
          policy: 'attachedOnly',
          weight: 1,
          order: 0,
          label: null,
          enabled: false,
          playback: null,
          rotation: null,
          beatFx: null,
          tags: null,
          mediaAsset: {
            id: 'asset-disabled',
            mediaType: 'video',
            url: '/uploads/videos/disabled.mp4',
            thumbnailUrl: null,
            originalName: 'disabled.mp4',
            durationMs: 60_000,
          },
        },
        {
          id: 'att-enabled',
          songId: 'rec-1',
          recordingId: 'rec-1',
          mediaAssetId: 'asset-enabled',
          policy: 'preferAttached',
          weight: 1,
          order: 1,
          label: null,
          enabled: true,
          playback: null,
          rotation: null,
          beatFx: null,
          tags: null,
          mediaAsset: {
            id: 'asset-enabled',
            mediaType: 'video',
            url: '/uploads/videos/enabled.mp4',
            thumbnailUrl: null,
            originalName: 'enabled.mp4',
            durationMs: 60_000,
          },
        },
      ],
    })

    expect(resolved.policy).toBe('preferAttached')
    expect(resolved.attachments).toHaveLength(1)
  })

  it('clamps malformed playback and beatFx fields from legacy API rows', () => {
    const resolved = mapSongVisualMediaApiResponse({
      songId: 'rec-1',
      recordingId: 'rec-1',
      policy: 'preferAttached',
      attachments: [
        {
          id: 'att-legacy',
          songId: 'rec-1',
          recordingId: 'rec-1',
          mediaAssetId: 'asset-1',
          policy: 'preferAttached',
          weight: 2,
          order: 0,
          label: 'Legacy clip',
          enabled: true,
          playback: {
            loop: true,
            timelineStartSec: Number.NaN,
            timelineDurationSec: -4,
            startOffsetMs: -500,
            objectFit: 'stretch' as never,
          },
          rotation: null,
          beatFx: {
            enabled: true,
            intensity: 'wild' as never,
            effects: ['scale', 'strobe' as never],
          },
          tags: null,
          mediaAsset: {
            id: 'asset-1',
            mediaType: 'video',
            url: '/uploads/videos/clip.mp4',
            thumbnailUrl: null,
            originalName: 'clip.mp4',
            durationMs: 60_000,
          },
        },
      ],
    })

    expect(resolved.attachments[0]?.playback).toEqual({ loop: true })
    expect(resolved.attachments[0]?.beatFx).toEqual({
      enabled: true,
      effects: ['scale'],
    })
  })
})

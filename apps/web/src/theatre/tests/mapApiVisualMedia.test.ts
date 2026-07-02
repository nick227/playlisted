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
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
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

    expect(resolved).toEqual({ attachments: [], policy: 'defaultOnly' })
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

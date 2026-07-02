import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hydrateTrackVisualMedia } from '../media/hydrateTrackVisualMedia'
import { clearRemoteTrackVisualMedia } from '../media/resolveTrackVisualMedia'

const STORAGE_KEY = 'playlisted.auth.session'

function createStorage() {
  const items = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      items.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      items.delete(key)
    }),
    clear: vi.fn(() => {
      items.clear()
    }),
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('hydrateTrackVisualMedia', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearRemoteTrackVisualMedia()
    vi.stubGlobal('localStorage', createStorage())
    localStorage.clear()
  })

  afterEach(() => {
    clearRemoteTrackVisualMedia()
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hydrates by recording trackId and sends stored bearer auth', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accessToken: 'session-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 'user-1' },
    }))

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      songId: 'rec-1',
      recordingId: 'rec-1',
      policy: 'attachedOnly',
      attachments: [
        {
          id: 'att-1',
          songId: 'rec-1',
          recordingId: 'rec-1',
          mediaAssetId: 'asset-1',
          policy: 'attachedOnly',
          weight: 1,
          order: 0,
          label: 'Full song custom video',
          enabled: true,
          playback: { loop: true, timelineStartSec: 0, timelineDurationSec: 120 },
          rotation: null,
          beatFx: null,
          tags: null,
          mediaAsset: {
            id: 'asset-1',
            mediaType: 'video',
            url: '/uploads/videos/custom.mp4',
            thumbnailUrl: null,
            originalName: 'custom.mp4',
            durationMs: 60_000,
          },
        },
      ],
    }))
    vi.stubGlobal('fetch', fetchMock)

    const resolved = await hydrateTrackVisualMedia({
      segmentId: 'playlist-segment-1',
      trackId: 'rec-1',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/songs/rec-1/visual-media',
      expect.objectContaining({
        headers: { Authorization: 'Bearer session-token' },
        credentials: 'include',
        cache: 'no-store',
      }),
    )
    expect(resolved.policy).toBe('attachedOnly')
    expect(resolved.attachments[0]?.id).toBe('att-1')
    expect(resolved.attachments[0]?.playback?.timelineStartSec).toBe(0)
  })

  it('falls back to segmentId when no trackId is available', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      songId: 'rec-2',
      recordingId: 'rec-2',
      policy: 'defaultOnly',
      attachments: [],
    }))
    vi.stubGlobal('fetch', fetchMock)

    await hydrateTrackVisualMedia({ segmentId: 'rec-2' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/songs/rec-2/visual-media',
      expect.any(Object),
    )
  })
})

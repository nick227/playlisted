import {
  mapSongVisualMediaApiResponse,
  type SongVisualMediaApiResponse,
} from './mapApiVisualMedia'
import { loadSession } from '../../lib/authStorage'
import type { TheatreTrackContext } from '../rotation/types'
import type { TrackVisualMediaResolution } from './types'
import {
  getRemoteTrackVisualMedia,
  hasLocalTrackVisualMediaOverride,
  lookupTrackVisualMediaKey,
  registerLocalTrackVisualMedia,
  resolveTrackVisualMedia,
  setRemoteTrackVisualMedia,
} from './resolveTrackVisualMedia'

const apiBase = () => import.meta.env.VITE_API_BASE_URL ?? ''

function visualMediaAuthHeaders(): HeadersInit | undefined {
  if (typeof localStorage === 'undefined') return undefined
  const session = loadSession()
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : undefined
}

export async function fetchSongVisualMedia(recordingId: string): Promise<TrackVisualMediaResolution> {
  const response = await fetch(`${apiBase()}/api/v1/songs/${encodeURIComponent(recordingId)}/visual-media`, {
    headers: visualMediaAuthHeaders(),
    credentials: 'include',
  })

  if (response.status === 404) {
    return { attachments: [], policy: 'defaultOnly' }
  }

  if (!response.ok) {
    throw new Error(`Failed to load song visuals (${response.status})`)
  }

  const payload = await response.json() as SongVisualMediaApiResponse
  return mapSongVisualMediaApiResponse(payload)
}

export type HydrateTrackVisualMediaOptions = {
  /** Bypass remote cache so policy/attachment edits apply on the next pick. */
  forceNetwork?: boolean
}

export async function hydrateTrackVisualMedia(
  track: TheatreTrackContext | null | undefined,
  opts: HydrateTrackVisualMediaOptions = {},
): Promise<TrackVisualMediaResolution> {
  const key = lookupTrackVisualMediaKey(track)
  if (!key) {
    return { attachments: [], policy: 'defaultOnly' }
  }

  if (hasLocalTrackVisualMediaOverride(key)) {
    return resolveTrackVisualMedia(track)
  }

  if (!opts.forceNetwork) {
    const cached = getRemoteTrackVisualMedia(key)
    if (cached) return cached
  }

  try {
    const resolved = await fetchSongVisualMedia(key)
    setRemoteTrackVisualMedia(key, resolved)
    return resolved
  } catch {
    return getRemoteTrackVisualMedia(key) ?? { attachments: [], policy: 'defaultOnly' }
  }
}

export function prefetchTrackVisualMedia(track: TheatreTrackContext): void {
  void hydrateTrackVisualMedia(track, { forceNetwork: true })
}

export { registerLocalTrackVisualMedia }

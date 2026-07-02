import {
  mapSongVisualMediaApiResponse,
  type SongVisualMediaApiResponse,
} from './mapApiVisualMedia'
import type { TheatreTrackContext } from '../rotation/types'
import type { TrackVisualMediaResolution } from './types'
import {
  lookupTrackVisualMediaKey,
  registerLocalTrackVisualMedia,
  resolveTrackVisualMedia,
  setRemoteTrackVisualMedia,
} from './resolveTrackVisualMedia'

const apiBase = () => import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchSongVisualMedia(recordingId: string): Promise<TrackVisualMediaResolution> {
  const response = await fetch(`${apiBase()}/api/v1/songs/${encodeURIComponent(recordingId)}/visual-media`, {
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

export async function hydrateTrackVisualMedia(
  track: TheatreTrackContext | null | undefined,
): Promise<TrackVisualMediaResolution> {
  const key = lookupTrackVisualMediaKey(track)
  if (!key) {
    return { attachments: [], policy: 'defaultOnly' }
  }

  const local = resolveTrackVisualMedia(track)
  if (local.attachments.length > 0) {
    return local
  }

  try {
    const resolved = await fetchSongVisualMedia(key)
    setRemoteTrackVisualMedia(key, resolved)
    return resolved
  } catch {
    return { attachments: [], policy: 'defaultOnly' }
  }
}

export { registerLocalTrackVisualMedia }

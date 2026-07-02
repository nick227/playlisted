import type { TheatreTrackContext } from '../rotation/types'
import type { TrackVisualMediaResolution, VisualMediaAttachment } from './types'

/** Local stub map — dev/testing override; takes precedence over remote cache. */
const LOCAL_ATTACHMENT_MAP = new Map<string, VisualMediaAttachment[]>()

const LOCAL_POLICY_MAP = new Map<string, TrackVisualMediaResolution['policy']>()

const REMOTE_CACHE = new Map<string, TrackVisualMediaResolution>()

export type TrackVisualMediaResolver = (
  track: TheatreTrackContext | null | undefined,
) => TrackVisualMediaResolution

export function lookupTrackVisualMediaKey(track: TheatreTrackContext | null | undefined): string | null {
  const trackId = track?.trackId?.trim()
  if (trackId) return trackId
  const segmentId = track?.segmentId?.trim()
  if (segmentId) return segmentId
  return null
}

export function registerLocalTrackVisualMedia(
  key: string,
  attachments: VisualMediaAttachment[],
  policy: TrackVisualMediaResolution['policy'] = 'preferAttached',
): void {
  LOCAL_ATTACHMENT_MAP.set(key, attachments)
  LOCAL_POLICY_MAP.set(key, policy)
}

export function setRemoteTrackVisualMedia(key: string, resolution: TrackVisualMediaResolution): void {
  REMOTE_CACHE.set(key, resolution)
}

export function clearRemoteTrackVisualMedia(key?: string): void {
  if (key) {
    REMOTE_CACHE.delete(key)
    return
  }
  REMOTE_CACHE.clear()
}

export const resolveTrackVisualMedia: TrackVisualMediaResolver = track => {
  const key = lookupTrackVisualMediaKey(track)
  if (!key) {
    return { attachments: [], policy: 'defaultOnly' }
  }

  const localAttachments = LOCAL_ATTACHMENT_MAP.get(key) ?? []
  if (localAttachments.length > 0) {
    return {
      attachments: localAttachments,
      policy: LOCAL_POLICY_MAP.get(key) ?? 'preferAttached',
    }
  }

  return REMOTE_CACHE.get(key) ?? { attachments: [], policy: 'defaultOnly' }
}

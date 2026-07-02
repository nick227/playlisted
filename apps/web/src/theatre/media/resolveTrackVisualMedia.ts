import type { TheatreTrackContext } from '../rotation/types'
import type { TrackVisualMediaResolution, VisualMediaAttachment } from './types'

/** Local stub map — replace with API/DB lookup in Phase 7E. */
const LOCAL_ATTACHMENT_MAP = new Map<string, VisualMediaAttachment[]>([
  ['demo-track-visuals', [
    {
      id: 'demo-video-a',
      trackId: 'demo-track-visuals',
      mediaType: 'video',
      url: '/demo1.mp4',
      label: 'Demo Video A',
      weight: 2,
      tags: ['demo'],
      playback: { loop: true, muted: true, objectFit: 'cover' },
    },
    {
      id: 'demo-video-b',
      trackId: 'demo-track-visuals',
      mediaType: 'video',
      url: '/demo2.mp4',
      label: 'Demo Video B',
      weight: 1,
      playback: { loop: true, muted: true, objectFit: 'cover' },
    },
  ]],
])

const LOCAL_POLICY_MAP = new Map<string, TrackVisualMediaResolution['policy']>()

export type TrackVisualMediaResolver = (
  track: TheatreTrackContext | null | undefined,
) => TrackVisualMediaResolution

function lookupKey(track: TheatreTrackContext | null | undefined): string | null {
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

export const resolveTrackVisualMedia: TrackVisualMediaResolver = track => {
  const key = lookupKey(track)
  if (!key) {
    return { attachments: [], policy: 'defaultOnly' }
  }

  const attachments = LOCAL_ATTACHMENT_MAP.get(key) ?? []
  if (attachments.length === 0) {
    return { attachments: [], policy: 'defaultOnly' }
  }

  return {
    attachments,
    policy: LOCAL_POLICY_MAP.get(key) ?? 'preferAttached',
  }
}

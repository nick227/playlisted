import type {
  SongVisualPolicy,
  TrackVisualMediaResolution,
  VisualMediaAttachment,
  VisualMediaBeatFx,
  VisualMediaPlayback,
} from './types'

export type SongVisualMediaApiResponse = {
  songId: string
  recordingId: string
  policy: SongVisualPolicy
  attachments: Array<{
    id: string
    songId: string
    recordingId: string
    mediaAssetId: string
    policy: SongVisualPolicy
    weight: number
    order: number
    label: string | null
    enabled: boolean
    playback: VisualMediaPlayback | null
    rotation: Record<string, unknown> | null
    beatFx: VisualMediaBeatFx | null
    tags: string[] | null
    mediaAsset: {
      id: string
      mediaType: 'image' | 'video'
      url: string
      thumbnailUrl: string | null
      originalName: string
    }
  }>
}

function mapPlayback(value: VisualMediaPlayback | null | undefined): VisualMediaPlayback | undefined {
  if (!value) return undefined
  return {
    loop: value.loop,
    muted: value.muted,
    objectFit: value.objectFit,
    startOffsetMs: value.startOffsetMs,
  }
}

export function mapSongVisualMediaApiResponse(
  response: SongVisualMediaApiResponse,
): TrackVisualMediaResolution {
  const attachments: VisualMediaAttachment[] = response.attachments
    .filter(item => item.enabled)
    .sort((a, b) => a.order - b.order)
    .map(item => ({
      id: item.id,
      songId: response.songId,
      trackId: response.recordingId,
      mediaType: item.mediaAsset.mediaType,
      url: item.mediaAsset.url,
      thumbnailUrl: item.mediaAsset.thumbnailUrl ?? undefined,
      label: item.label ?? item.mediaAsset.originalName,
      weight: item.weight,
      tags: item.tags ?? undefined,
      playback: mapPlayback(item.playback),
      rotation: item.rotation ?? undefined,
      beatFx: item.beatFx ?? undefined,
    }))

  return {
    attachments,
    policy: attachments.length > 0 ? (response.policy ?? 'preferAttached') : 'defaultOnly',
  }
}

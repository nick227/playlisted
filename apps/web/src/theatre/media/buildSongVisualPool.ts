import type { TheatreTrackContext } from '../rotation/types'
import type { PickContext } from '../selection/types'
import { attachmentsToScenePresets } from './attachmentToScenePreset'
import { syncDynamicPresets } from './dynamicPresetStore'
import { resolveTrackVisualMedia } from './resolveTrackVisualMedia'
import { layoutTimelineClips, type VisualMediaTimelineClip } from './timelineClipLayout'
import type { SongVisualPolicy } from './types'

export type SongVisualPickExtras = Pick<
  PickContext,
  'songVisualPolicy' | 'dynamicPresets' | 'timelineClips' | 'songPlayheadSec'
>

const DEFAULT_SONG_DURATION_SEC = 120

export type BuildSongVisualPickExtrasOptions = {
  songDurationSec?: number
  songPlayheadSec?: number
}

export function buildSongVisualPickExtras(
  track: TheatreTrackContext | null | undefined,
  opts: BuildSongVisualPickExtrasOptions = {},
): Required<Pick<SongVisualPickExtras, 'songVisualPolicy' | 'dynamicPresets' | 'timelineClips'>> &
  Pick<SongVisualPickExtras, 'songPlayheadSec'> {
  const resolved = resolveTrackVisualMedia(track)
  if (resolved.attachments.length === 0) {
    syncDynamicPresets([])
    return {
      songVisualPolicy: 'defaultOnly',
      dynamicPresets: [],
      timelineClips: [],
      songPlayheadSec: opts.songPlayheadSec,
    }
  }

  const songDurationSec = opts.songDurationSec && opts.songDurationSec > 0
    ? opts.songDurationSec
    : DEFAULT_SONG_DURATION_SEC
  const timelineClips: VisualMediaTimelineClip[] = layoutTimelineClips(
    resolved.attachments,
    songDurationSec,
  )
  const dynamicPresets = attachmentsToScenePresets(
    timelineClips.length > 0
      ? timelineClips.map((clip) => clip.attachment)
      : resolved.attachments,
  )
  syncDynamicPresets(dynamicPresets)

  return {
    songVisualPolicy: resolved.policy as SongVisualPolicy,
    dynamicPresets,
    timelineClips,
    songPlayheadSec: opts.songPlayheadSec,
  }
}

export function getTimelineClipsForTrack(
  track: TheatreTrackContext | null | undefined,
  songDurationSec?: number,
): VisualMediaTimelineClip[] {
  const resolved = resolveTrackVisualMedia(track)
  if (resolved.attachments.length === 0) return []
  const durationSec = songDurationSec && songDurationSec > 0 ? songDurationSec : DEFAULT_SONG_DURATION_SEC
  return layoutTimelineClips(resolved.attachments, durationSec)
}

export type { VisualMediaTimelineClip }

import type { ScenePresetDef } from '../registry/scenePresets'
import { userMediaPresetId } from './attachmentToScenePreset'
import { findActiveTimelineClip, type VisualMediaTimelineClip } from './timelineClipLayout'

export type TimelinePlaybackDecisionKind =
  | 'normalRotation'
  | 'activeClip'
  | 'gapFallback'

export type TimelinePlaybackDecision = {
  kind: TimelinePlaybackDecisionKind
  activeClip: VisualMediaTimelineClip | null
  presetId: string | null
  suppressTimedRotation: boolean
}

export type TimelinePlaybackDirectorInput = {
  timelineClips?: VisualMediaTimelineClip[]
  songPlayheadSec?: number
  resolvePreset: (id: string) => ScenePresetDef | null
}

export function resolveTimelinePlaybackDecision(
  input: TimelinePlaybackDirectorInput,
): TimelinePlaybackDecision {
  const clips = input.timelineClips ?? []
  if (clips.length === 0 || input.songPlayheadSec == null) {
    return {
      kind: 'normalRotation',
      activeClip: null,
      presetId: null,
      suppressTimedRotation: false,
    }
  }

  const activeClip = findActiveTimelineClip(clips, input.songPlayheadSec)
  if (!activeClip) {
    return {
      kind: 'gapFallback',
      activeClip: null,
      presetId: null,
      suppressTimedRotation: false,
    }
  }

  const presetId = userMediaPresetId(activeClip.attachment.id)
  if (!input.resolvePreset(presetId)) {
    return {
      kind: 'gapFallback',
      activeClip,
      presetId: null,
      suppressTimedRotation: false,
    }
  }

  return {
    kind: 'activeClip',
    activeClip,
    presetId,
    suppressTimedRotation: true,
  }
}

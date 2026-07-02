import type { SceneCategory, ScenePresetDef } from '../registry/scenePresets'
import type { SongVisualPolicy } from '../media/types'
import type { VisualMediaTimelineClip } from '../media/timelineClipLayout'

export type PickContext = {
  reducedMotion: boolean
  activePresetId?: string | null
  excludePresetIds?: string[]
  preferCategory?: SceneCategory | 'all'
  /** When true, honour ?theatrePreset= URL override (enter only). Defaults to false. */
  allowUrlPreset?: boolean
  /** Ephemeral user-media presets for the active track (not in static registry). */
  dynamicPresets?: ScenePresetDef[]
  /** How attached media mixes with built-in theatre presets. */
  songVisualPolicy?: SongVisualPolicy
  /** Resolved editor timeline clips for the active song. */
  timelineClips?: VisualMediaTimelineClip[]
  /** Current song playhead in seconds (audio currentTime). */
  songPlayheadSec?: number
}

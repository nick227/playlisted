export type {
  BeatFxEffect,
  BeatFxIntensity,
  SongVisualPolicy,
  TrackVisualMediaResolution,
  VisualMediaAttachment,
  VisualMediaBeatFx,
  VisualMediaPlayback,
  VisualMediaType,
} from './types'

export {
  attachmentToScenePreset,
  attachmentsToScenePresets,
  userMediaPresetId,
  USER_MEDIA_PRESET_PREFIX,
} from './attachmentToScenePreset'

export {
  clearDynamicPresets,
  getDynamicPreset,
  hasDynamicPreset,
  listDynamicPresets,
  registerDynamicPreset,
  registerDynamicPresets,
  syncDynamicPresets,
} from './dynamicPresetStore'

export { resolvePreset, isUserMediaPresetId } from './resolvePreset'

export {
  clearRemoteTrackVisualMedia,
  lookupTrackVisualMediaKey,
  registerLocalTrackVisualMedia,
  resolveTrackVisualMedia,
  setRemoteTrackVisualMedia,
  type TrackVisualMediaResolver,
} from './resolveTrackVisualMedia'

export { hydrateTrackVisualMedia, fetchSongVisualMedia } from './hydrateTrackVisualMedia'
export { buildSongVisualPickExtras } from './buildSongVisualPool'
export { registerUserMediaEngine, USER_IMAGE_MEDIA_ID, USER_VIDEO_MEDIA_ID } from './userMediaEngine'

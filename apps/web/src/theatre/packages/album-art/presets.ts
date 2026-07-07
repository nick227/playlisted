import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_TAME,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_CALM,
  ROTATION_HOLD_SEGMENT_INTRO,
} from '../../registry/presetTuning'

export const ALBUM_ART_INTRO_PRESET_ID = 'albumArtIntro'
export const SEGMENT_INTRO_PRESET_TAG = 'segment-intro'

const albumArtIntroLayers: ScenePresetDef['layers'] = [
  {
    animationId: 'albumArtImage',
    role: 'background',
    options: { preset: 'tame', zIndex: 100, opacity: 1 },
  },
]

export const albumArtPresets: ScenePresetDef[] = [
  {
    id: ALBUM_ART_INTRO_PRESET_ID,
    label: 'Album Art Intro',
    category: 'production',
    weight: 0,
    tags: ['image', 'album-art', 'low-motion', 'song-safe', SEGMENT_INTRO_PRESET_TAG],
    audioSensitivity: AUDIO_TAME,
    rotation: { mode: 'timedMusicAware', ...ROTATION_HOLD_SEGMENT_INTRO },
    layers: albumArtIntroLayers,
  },
  {
    id: 'albumArtStill',
    label: 'Album Art Still',
    category: 'production',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: ['image', 'album-art', 'low-motion', 'song-safe', 'occasional'],
    audioSensitivity: AUDIO_TAME,
    rotation: { mode: 'perTrack', ...ROTATION_HOLD_CALM },
    layers: albumArtIntroLayers,
  },
]

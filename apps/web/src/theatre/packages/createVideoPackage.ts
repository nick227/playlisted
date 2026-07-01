import type { AnimationPackage } from '../registry/packages'
import type { AudioSensitivity, SceneCategory, ScenePresetDef } from '../registry/scenePresets'
import {
  AUDIO_TAME,
  FAMILY_WEIGHT_LAB,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_VIDEO,
} from '../registry/presetTuning'
import VideoAnimation from '../core/VideoAnimation'

export type CreateVideoPackageOptions = {
  id: string
  label: string
  videoUrl: string
  category?: SceneCategory
  reducedMotionPreset?: string
  familyWeight?: number
  weight?: number
  tags?: string[]
  audioSensitivity?: AudioSensitivity
  rotation?: ScenePresetDef['rotation']
}

export type VideoPackageEntry = {
  id: string
  label: string
  videoUrl: string
}

/** One package per video — each gets an equal rotation slot via per-package pick. */
export const SEED_VIDEO_ENTRIES: VideoPackageEntry[] = [
  ...Array.from({ length: 61 }, (_, index) => {
    const n = index + 1
    return { id: `video${n}`, label: `Video ${n}`, videoUrl: `/${n}.mp4` }
  }),
  { id: 'demo1', label: 'demo1', videoUrl: '/demo1.mp4' },
  { id: 'demo2', label: 'demo2', videoUrl: '/demo2.mp4' },
]

export type IndividualVideoPackageDefaults = Omit<CreateVideoPackageOptions, 'id' | 'label' | 'videoUrl'>

/** Register each video as its own package (one preset each, equal family weight). */
export function createIndividualVideoPackages(
  videos: VideoPackageEntry[],
  defaults: IndividualVideoPackageDefaults = {},
): AnimationPackage[] {
  return videos.map(video => createVideoPackage({
    ...defaults,
    id: video.id,
    label: video.label,
    videoUrl: video.videoUrl,
  }))
}

export function createVideoPackage(opts: CreateVideoPackageOptions): AnimationPackage {
  const {
    id,
    label,
    videoUrl,
    category = 'production',
    reducedMotionPreset,
    familyWeight = FAMILY_WEIGHT_LAB,
    weight = PRESET_WEIGHT_OCCASIONAL,
    tags = [...TAGS_VIDEO],
    audioSensitivity = AUDIO_TAME,
    rotation = ROTATION_HOLD_LAB,
  } = opts

  const animationId = `${id}Animation`

  const factory = () => {
    return new VideoAnimation({
      defaultVideoUrl: videoUrl,
      defaultZIndex: 0,
    })
  }

  return {
    manifest: {
      id,
      label,
      version: '1.0.0',
      kind: 'visual-scene',
      category,
      description: `Full bleed cover video: ${label}`,
      capabilities: ['reduced-motion'],
      weight: familyWeight,
    },
    animations: [
      {
        id: animationId,
        label,
        factory,
        visualType: 'video',
        mood: 'calm',
        role: 'background',
      },
    ],
    presets: [
      {
        id,
        label,
        category,
        weight,
        tags,
        audioSensitivity,
        rotation,
        reducedMotionPreset,
        layers: [
          {
            animationId,
            role: 'background',
            options: {
              preset: 'tame',
            },
          },
        ],
      },
    ],
  }
}

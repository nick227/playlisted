import type { AnimationPackage } from '../registry/packages'
import type { SceneCategory } from '../registry/scenePresets'
import VideoAnimation from '../core/VideoAnimation'

export type CreateVideoPackageOptions = {
  id: string
  label: string
  videoUrl: string
  category?: SceneCategory
  reducedMotionPreset?: string
  weight?: number
}

export type VideoFamilyEntry = {
  id: string
  label: string
  videoUrl: string
}

export type CreateVideoFamilyPackageOptions = {
  id?: string
  label?: string
  category?: SceneCategory
  reducedMotionPreset?: string
  weight?: number
  videos: VideoFamilyEntry[]
}

export const DEFAULT_VIDEO_LIBRARY: VideoFamilyEntry[] = [
  ...Array.from({ length: 58 }, (_, index) => {
    const n = index + 1
    return { id: `video${n}`, label: `Video ${n}`, videoUrl: `/${n}.mp4` }
  }),
  { id: 'demo1', label: 'demo1', videoUrl: '/demo1.mp4' },
  { id: 'demo2', label: 'demo2', videoUrl: '/demo2.mp4' },
]

export function createVideoFamilyPackage(opts: CreateVideoFamilyPackageOptions): AnimationPackage {
  const {
    id = 'videos',
    label = 'Videos',
    category = 'lab',
    reducedMotionPreset = 'quietPulse',
    weight = 1,
    videos,
  } = opts

  const animations = videos.map(video => ({
    id: `${video.id}Animation`,
    label: video.label,
    factory: () => new VideoAnimation({ defaultVideoUrl: video.videoUrl, defaultZIndex: 0 }),
    visualType: 'video' as const,
    mood: 'calm' as const,
    role: 'background' as const,
  }))

  const presets = videos.map(video => ({
    id: video.id,
    label: video.label,
    category,
    reducedMotionPreset,
    layers: [{
      animationId: `${video.id}Animation`,
      role: 'background' as const,
      options: { preset: 'tame' as const },
    }],
  }))

  return {
    manifest: {
      id,
      label,
      version: '1.0.0',
      kind: 'visual-scene',
      category,
      description: 'Rotating cover video family',
      capabilities: ['reduced-motion'],
      weight,
    },
    animations,
    presets,
  }
}

export function createDefaultVideoFamilyPackage(
  opts: Omit<CreateVideoFamilyPackageOptions, 'videos'> = {},
): AnimationPackage {
  return createVideoFamilyPackage({ ...opts, videos: DEFAULT_VIDEO_LIBRARY })
}

export function createVideoPackage(opts: CreateVideoPackageOptions): AnimationPackage {
  const {
    id,
    label,
    videoUrl,
    category = 'production',
    reducedMotionPreset,
    weight = 1,
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
    },
    animations: [
      {
        id: animationId,
        label,
        factory,
        visualType: 'video',
        mood: 'calm',
        role: 'background',
      }
    ],
    presets: [
      {
        id,
        label,
        category,
        weight,
        reducedMotionPreset,
        layers: [
          {
            animationId,
            role: 'background',
            options: {
              preset: 'tame'
            }
          }
        ]
      }
    ]
  }
}

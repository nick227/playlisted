import type { AnimationPackage } from '../registry/packages'
import type { AnimationContext } from '../core/IAnimation'
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

  const factory = (ctx: AnimationContext) => {
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

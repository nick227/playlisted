import type { AnimationPackage } from '../registry/packages'
import type { AudioSensitivity, SceneCategory, ScenePresetDef } from '../registry/scenePresets'
import {
  AUDIO_TAME,
  FAMILY_WEIGHT_LAB,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
} from '../registry/presetTuning'
import ImageAnimation from '../core/ImageAnimation'

export type ImagePackageEntry = {
  id: string
  label: string
  imageUrlCandidates: string[]
}

export type CreateImagePackageOptions = {
  id: string
  label: string
  imageUrlCandidates: string[]
  category?: SceneCategory
  reducedMotionPreset?: string
  familyWeight?: number
  weight?: number
  tags?: string[]
  audioSensitivity?: AudioSensitivity
  rotation?: ScenePresetDef['rotation']
}

const MAX_IMAGE_COUNT = 10
const IMAGE_EXTENSIONS = ['jpg', 'webp', 'png'] as const

function imageCandidates(n: number): string[] {
  return IMAGE_EXTENSIONS.map((extension) => `/images/${n}.${extension}`)
}

export const SEED_IMAGE_ENTRIES: ImagePackageEntry[] = [
  ...Array.from({ length: MAX_IMAGE_COUNT }, (_, index) => {
    const n = index + 1
    return { id: `image${n}`, label: `Image ${n}`, imageUrlCandidates: imageCandidates(n) }
  }),
]

export type IndividualImagePackageDefaults = Omit<CreateImagePackageOptions, 'id' | 'label' | 'imageUrlCandidates'>

export function createIndividualImagePackages(
  images: ImagePackageEntry[],
  defaults: IndividualImagePackageDefaults = {},
): AnimationPackage[] {
  return images.map((image) => createImagePackage({
    ...defaults,
    id: image.id,
    label: image.label,
    imageUrlCandidates: image.imageUrlCandidates,
  }))
}

export function createImagePackage(opts: CreateImagePackageOptions): AnimationPackage {
  const {
    id,
    label,
    imageUrlCandidates,
    category = 'production',
    reducedMotionPreset,
    familyWeight = FAMILY_WEIGHT_LAB,
    weight = PRESET_WEIGHT_OCCASIONAL,
    tags = ['image', 'full-bleed', 'low-motion'],
    audioSensitivity = AUDIO_TAME,
    rotation = ROTATION_HOLD_LAB,
  } = opts

  const animationId = `${id}Animation`

  return {
    manifest: {
      id,
      label,
      version: '1.0.0',
      kind: 'visual-scene',
      category,
      description: `Full bleed cover image: ${label}`,
      capabilities: ['reduced-motion'],
      weight: familyWeight,
    },
    animations: [
      {
        id: animationId,
        label,
        factory: () => new ImageAnimation({ defaultZIndex: 0 }),
        visualType: 'image',
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
              imageUrlCandidates,
            },
          },
        ],
      },
    ],
  }
}

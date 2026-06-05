import type { AnimationFactory } from '../core/IAnimation'
import type { AnimationPackage, AnimationPackageKind } from '../registry/packages'
import type { SceneCategory } from '../registry/scenePresets'

type FirstPartyPackageOptions = {
  id: string
  label: string
  animationId: string
  factory: AnimationFactory
  presetId: string
  presetLabel?: string
  kind?: AnimationPackageKind
  category?: SceneCategory
  description?: string
  weight?: number
  role?: 'background' | 'subject' | 'foreground' | 'overlay' | 'any'
  mood?: 'calm' | 'dynamic' | 'chaos' | 'nightmare'
  visualType?: 'image' | 'video' | 'canvas' | 'ui' | 'hybrid'
  presetCategory?: SceneCategory
  reducedMotionPreset?: string
  options?: Record<string, unknown>
}

export function defineFirstPartyPackage(options: FirstPartyPackageOptions): AnimationPackage {
  const category = options.category ?? 'lab'
  return {
    manifest: {
      id: options.id,
      label: options.label,
      version: '1.0.0',
      kind: options.kind ?? 'visual-scene',
      category,
      description: options.description,
      capabilities: ['audio-features', 'visual-triggers', 'external-raf'],
      reducedMotionSafe: Boolean(options.reducedMotionPreset),
    },
    animations: [
      {
        id: options.animationId,
        label: options.label,
        factory: options.factory,
        visualType: options.visualType ?? 'canvas',
        mood: options.mood ?? 'dynamic',
        role: options.role ?? 'subject',
        weight: options.weight ?? 1,
      },
    ],
    presets: [
      {
        id: options.presetId,
        label: options.presetLabel ?? options.label,
        category: options.presetCategory ?? category,
        weight: options.weight ?? 1,
        reducedMotionPreset: options.reducedMotionPreset,
        layers: [
          {
            animationId: options.animationId,
            role: options.role ?? 'subject',
            options: {
              opacity: 1,
              zIndex: options.role === 'background' ? 100 : 101,
              blendMode: 'normal',
              intensity: 1,
              sensitivity: 1,
              ...options.options,
            },
          },
        ],
      },
    ],
  }
}


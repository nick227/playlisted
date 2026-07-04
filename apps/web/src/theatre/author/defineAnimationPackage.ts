import type { AnimationFactory, AnimationMood, AnimationRole } from '../core/IAnimation'
import type { AnimationPackage, AnimationPackageKind } from '../registry/packages'
import type { SceneCategory } from '../registry/scenePresets'
import type { TheatreLayerOptions } from './types'

/**
 * Canonical package shape for public canvas animations (v1).
 * One animation, one preset, single layer — no composites or media engines.
 */
export type DefineAnimationPackageOptions = {
  id: string
  label: string
  version?: string
  animationId: string
  factory: AnimationFactory
  presetId: string
  presetLabel?: string
  kind?: AnimationPackageKind
  category?: SceneCategory
  description?: string
  weight?: number
  role?: AnimationRole
  mood?: AnimationMood
  presetCategory?: SceneCategory
  reducedMotionPreset?: string
  layerOptions?: TheatreLayerOptions
}

export function defineAnimationPackage(options: DefineAnimationPackageOptions): AnimationPackage {
  const category = options.category ?? 'lab'
  const role = options.role ?? 'subject'
  const layerOptions: TheatreLayerOptions = {
    opacity: 1,
    zIndex: role === 'background' ? 100 : 101,
    blendMode: 'normal',
    intensity: 1,
    sensitivity: 1,
    preset: 'vivid',
    ...options.layerOptions,
  }

  return {
    manifest: {
      id: options.id,
      label: options.label,
      version: options.version ?? '1.0.0',
      kind: options.kind ?? 'visual-scene',
      category,
      description: options.description,
      capabilities: ['audio-features', 'visual-triggers', 'external-raf'],
      reducedMotionSafe: Boolean(options.reducedMotionPreset),
      weight: options.weight,
    },
    animations: [
      {
        id: options.animationId,
        label: options.label,
        factory: options.factory,
        visualType: 'canvas',
        mood: options.mood ?? 'dynamic',
        role,
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
        layers: [{ animationId: options.animationId, role, options: layerOptions }],
      },
    ],
  }
}

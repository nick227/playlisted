import type { RegistryEntry } from '../core/IAnimation'
import type { SceneCategory, ScenePresetDef } from './scenePresets'

export type AnimationPackageKind =
  | 'visual-scene'
  | 'character-scene'
  | 'character-rig'
  | 'effect-system'
  | 'stop-motion-story'
  | 'audio-reactive-background'
  | 'interactive-overlay'

export type AnimationPackageCapability =
  | 'audio-features'
  | 'visual-triggers'
  | 'external-raf'
  | 'reduced-motion'
  | 'low-power'
  | 'particles'
  | 'story'
  | 'character-rig'
  | (string & {})

export type AnimationPackageManifest = {
  id: string
  label: string
  version: string
  kind: AnimationPackageKind
  category: SceneCategory
  description?: string
  capabilities?: AnimationPackageCapability[]
  reducedMotionSafe?: boolean
}

export type PackageAnimationEntry = RegistryEntry
export type PackagePresetEntry = ScenePresetDef

export type AnimationPackage = {
  manifest: AnimationPackageManifest
  animations: PackageAnimationEntry[]
  presets: PackagePresetEntry[]
}


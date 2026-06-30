import registry from './index'
import { registerPreset, hasPreset } from './scenePresets'
import type { AnimationPackage } from './packages'

const registeredPackageIds = new Set<string>()
const validCategories = new Set(['production', 'lab', 'dev'])
const vividPresetNames = new Set(['vivid', 'chaos', 'nightmare'])

function assertNonEmpty(value: string | undefined, label: string, packageId: string) {
  if (!value || value.trim().length === 0) {
    throw new Error(`[Theatre package:${packageId}] missing ${label}`)
  }
}

function presetLooksHighMotion(preset: AnimationPackage['presets'][number]) {
  return preset.layers.some(layer => {
    const configured = layer.options?.preset
    return typeof configured === 'string' && vividPresetNames.has(configured)
  })
}

export function registerAnimationPackage(pkg: AnimationPackage) {
  const packageId = pkg.manifest?.id
  assertNonEmpty(packageId, 'manifest.id', packageId || 'unknown')
  assertNonEmpty(pkg.manifest.label, 'manifest.label', packageId)
  assertNonEmpty(pkg.manifest.version, 'manifest.version', packageId)

  if (registeredPackageIds.has(packageId)) {
    throw new Error(`[Theatre package:${packageId}] duplicate package id`)
  }
  if (!validCategories.has(pkg.manifest.category)) {
    throw new Error(`[Theatre package:${packageId}] invalid category "${pkg.manifest.category}"`)
  }

  const hasAnimations = Array.isArray(pkg.animations) && pkg.animations.length > 0
  const hasPresets = Array.isArray(pkg.presets) && pkg.presets.length > 0

  if (!hasAnimations && !hasPresets) {
    throw new Error(`[Theatre package:${packageId}] must register at least one animation or preset`)
  }

  if (hasAnimations) {
    for (const animation of pkg.animations) {
      assertNonEmpty(animation.id, 'animation.id', packageId)
      assertNonEmpty(animation.label, `animation "${animation.id}" label`, packageId)
      if (typeof animation.factory !== 'function') {
        throw new Error(`[Theatre package:${packageId}] animation "${animation.id}" is missing a factory`)
      }
      if (registry.has(animation.id)) {
        throw new Error(`[Theatre package:${packageId}] duplicate animation id "${animation.id}"`)
      }
    }
  }

  const animationIds = new Set((pkg.animations ?? []).map(animation => animation.id))

  if (hasPresets) {
    for (const preset of pkg.presets) {
      assertNonEmpty(preset.id, 'preset.id', packageId)
      assertNonEmpty(preset.label, `preset "${preset.id}" label`, packageId)
      if (!validCategories.has(preset.category)) {
        throw new Error(`[Theatre package:${packageId}] preset "${preset.id}" has invalid category "${preset.category}"`)
      }
      if (!preset.layers.length) {
        throw new Error(`[Theatre package:${packageId}] preset "${preset.id}" must contain at least one layer`)
      }
      if (hasPreset(preset.id)) {
        throw new Error(`[Theatre package:${packageId}] duplicate preset id "${preset.id}"`)
      }
      if (presetLooksHighMotion(preset) && !preset.reducedMotionPreset) {
        throw new Error(`[Theatre package:${packageId}] high-motion preset "${preset.id}" needs a reducedMotionPreset`)
      }
      for (const layer of preset.layers) {
        if (!animationIds.has(layer.animationId) && !registry.has(layer.animationId)) {
          throw new Error(
            `[Theatre package:${packageId}] preset "${preset.id}" references unknown animation "${layer.animationId}"`,
          )
        }
      }
    }
  }

  registeredPackageIds.add(packageId)
  if (hasAnimations) {
    for (const animation of pkg.animations) registry.register(animation)
  }
  if (hasPresets) {
    for (const preset of pkg.presets) registerPreset(preset)
  }
}

export function listRegisteredAnimationPackageIds() {
  return Array.from(registeredPackageIds)
}

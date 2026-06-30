import type { AnimationPackageManifest } from './packages'
import { getPreset, type ScenePresetDef } from './scenePresets'

export type RegisteredRotationPackage = {
  manifest: AnimationPackageManifest
  presetIds: readonly string[]
}

const rotationPackages: RegisteredRotationPackage[] = []
const presetPackageId = new Map<string, string>()

export function recordRotationPackage(
  manifest: AnimationPackageManifest,
  presetIds: readonly string[],
): void {
  if (presetIds.length === 0) return
  rotationPackages.push({ manifest, presetIds })
  for (const presetId of presetIds) {
    presetPackageId.set(presetId, manifest.id)
  }
}

export function getRotationPackages(): readonly RegisteredRotationPackage[] {
  return rotationPackages
}

export function getPackageIdForPreset(presetId: string): string | null {
  return presetPackageId.get(presetId) ?? null
}

export function weightedPick<T>(items: readonly T[], weightOf: (item: T) => number): T | null {
  if (items.length === 0) return null
  const total = items.reduce((sum, item) => sum + weightOf(item), 0)
  if (total <= 0) return items[0] ?? null
  let roll = Math.random() * total
  for (const item of items) {
    roll -= weightOf(item)
    if (roll <= 0) return item
  }
  return items[items.length - 1] ?? null
}

function resolveReducedMotion(preset: ScenePresetDef, reducedMotion: boolean): ScenePresetDef {
  if (reducedMotion && preset.reducedMotionPreset) {
    return getPreset(preset.reducedMotionPreset) ?? preset
  }
  return preset
}

/** Pick a package by family weight, then a preset inside that package by preset weight. */
export function pickPackagePreset(opts: {
  reducedMotion?: boolean
  excludePresetIds?: string[]
}): ScenePresetDef | null {
  const { reducedMotion = false, excludePresetIds = [] } = opts
  const exclude = new Set(excludePresetIds)

  const eligible = rotationPackages
    .map(pkg => ({
      pkg,
      presets: pkg.presetIds
        .map(id => getPreset(id))
        .filter((preset): preset is ScenePresetDef => preset !== null && !exclude.has(preset.id)),
    }))
    .filter(entry => entry.presets.length > 0)

  const pickedEntry = weightedPick(eligible, entry => entry.pkg.manifest.weight ?? 1)
  if (!pickedEntry) return null

  const pickedPreset = weightedPick(pickedEntry.presets, preset => preset.weight ?? 1)
  if (!pickedPreset) return null

  return resolveReducedMotion(pickedPreset, reducedMotion)
}

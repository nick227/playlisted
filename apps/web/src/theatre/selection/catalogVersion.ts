import { getPreset } from '../registry/scenePresets'
import { getRotationPackages } from '../registry/packageRotation'
import { isSegmentIntroPresetExcludedFromBag } from '../segmentIntro/resolveSegmentIntro'

export type WeightedPresetEntry = {
  id: string
  weight: number
}

export type WeightedFamilyPresetEntry = {
  id: string
  weight: number
}

export type WeightedFamilyCatalogEntry = {
  familyId: string
  familyWeight: number
  presets: WeightedFamilyPresetEntry[]
}

export function hashCatalogPayload(payload: string): string {
  let hash = 5381
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

export function collectWeightedFamilyCatalog(): WeightedFamilyCatalogEntry[] {
  return getRotationPackages()
    .map(pkg => ({
      familyId: pkg.manifest.id,
      familyWeight: pkg.manifest.weight ?? 1,
      presets: pkg.presetIds
        .map(presetId => getPreset(presetId))
        .filter((preset): preset is NonNullable<typeof preset> => preset !== null)
        .filter(preset => !isSegmentIntroPresetExcludedFromBag(preset.id))
        .map(preset => ({
          id: preset.id,
          weight: preset.weight ?? 1,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .filter(family => family.presets.length > 0)
    .sort((a, b) => a.familyId.localeCompare(b.familyId))
}

/** Flat preset list used by presetWeighted strategy (legacy combined weights). */
export function collectWeightedPresetCatalog(): WeightedPresetEntry[] {
  const entries: WeightedPresetEntry[] = []

  for (const family of collectWeightedFamilyCatalog()) {
    for (const preset of family.presets) {
      entries.push({
        id: preset.id,
        weight: Math.max(1, Math.round(family.familyWeight * preset.weight)),
      })
    }
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

export function buildCatalogVersionPayload(
  families: WeightedFamilyCatalogEntry[] = collectWeightedFamilyCatalog(),
): string {
  const parts: string[] = []
  for (const family of families) {
    for (const preset of family.presets) {
      parts.push(`${family.familyId}:${family.familyWeight}:${preset.id}:${preset.weight}`)
    }
  }
  return parts.join('|')
}

export function computeCatalogVersion(
  families: WeightedFamilyCatalogEntry[] = collectWeightedFamilyCatalog(),
): string {
  return hashCatalogPayload(buildCatalogVersionPayload(families))
}

/** @deprecated Use computeCatalogVersion with family catalog. */
export function computeCatalogVersionFromPresetEntries(entries: WeightedPresetEntry[]): string {
  const payload = entries.map(entry => `${entry.id}:${entry.weight}`).join('|')
  return hashCatalogPayload(payload)
}

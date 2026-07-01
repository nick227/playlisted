import { getPreset } from '../registry/scenePresets'
import { getRotationPackages } from '../registry/packageRotation'

export type WeightedPresetEntry = {
  id: string
  weight: number
}

export function hashCatalogPayload(payload: string): string {
  let hash = 5381
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

export function collectWeightedPresetCatalog(): WeightedPresetEntry[] {
  const entries: WeightedPresetEntry[] = []

  for (const pkg of getRotationPackages()) {
    const pkgWeight = pkg.manifest.weight ?? 1
    for (const presetId of pkg.presetIds) {
      const preset = getPreset(presetId)
      if (!preset) continue
      entries.push({
        id: presetId,
        weight: Math.max(1, Math.round(pkgWeight * (preset.weight ?? 1))),
      })
    }
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

export function computeCatalogVersion(
  entries: WeightedPresetEntry[] = collectWeightedPresetCatalog(),
): string {
  const payload = entries.map(entry => `${entry.id}:${entry.weight}`).join('|')
  return hashCatalogPayload(payload)
}

import { BODY_PRESETS, BODY_PRESET_IDS } from './libraries/body'
import { CLOTHES_PRESETS, CLOTHES_PRESET_IDS } from './libraries/clothes'
import { EYES_PRESETS, EYES_PRESET_IDS } from './libraries/eyes'
import { FACE_PRESETS, FACE_PRESET_IDS } from './libraries/face'
import { HAIR_PRESETS, HAIR_PRESET_IDS } from './libraries/hair'
import { MOUTH_PRESETS, MOUTH_PRESET_IDS } from './libraries/mouth'

export type PresetCatalogEntry = { id: string; label: string }

export type PresetCatalog = {
  body: PresetCatalogEntry[]
  face: PresetCatalogEntry[]
  hair: PresetCatalogEntry[]
  eyes: PresetCatalogEntry[]
  mouth: PresetCatalogEntry[]
  clothes: PresetCatalogEntry[]
}

function entries(ids: string[], map: Record<string, { label: string }>): PresetCatalogEntry[] {
  return ids.map((id) => ({ id, label: map[id].label }))
}

/** All preset ids + labels — for lab UI, docs, or debug. */
export const PRESET_CATALOG: PresetCatalog = {
  body: entries(BODY_PRESET_IDS, BODY_PRESETS),
  face: entries(FACE_PRESET_IDS, FACE_PRESETS),
  hair: entries(HAIR_PRESET_IDS, HAIR_PRESETS),
  mouth: entries(MOUTH_PRESET_IDS, MOUTH_PRESETS),
  eyes: entries(EYES_PRESET_IDS, EYES_PRESETS),
  clothes: entries(CLOTHES_PRESET_IDS, CLOTHES_PRESETS),
}

export function presetCatalogJson(pretty = true): string {
  return JSON.stringify(PRESET_CATALOG, null, pretty ? 2 : 0)
}

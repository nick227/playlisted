import { getPreset, type ScenePresetDef } from '../registry/scenePresets'
import { getDynamicPreset } from './dynamicPresetStore'

export function resolvePreset(id: string): ScenePresetDef | null {
  return getDynamicPreset(id) ?? getPreset(id)
}

export function isUserMediaPresetId(id: string): boolean {
  return id.startsWith('user-media:')
}

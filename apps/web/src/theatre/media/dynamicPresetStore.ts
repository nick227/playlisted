import type { ScenePresetDef } from '../registry/scenePresets'

const dynamicPresets = new Map<string, ScenePresetDef>()

export function registerDynamicPreset(def: ScenePresetDef): void {
  dynamicPresets.set(def.id, def)
}

export function registerDynamicPresets(defs: ScenePresetDef[]): void {
  for (const def of defs) registerDynamicPreset(def)
}

export function syncDynamicPresets(defs: ScenePresetDef[]): void {
  dynamicPresets.clear()
  registerDynamicPresets(defs)
}

export function getDynamicPreset(id: string): ScenePresetDef | null {
  return dynamicPresets.get(id) ?? null
}

export function hasDynamicPreset(id: string): boolean {
  return dynamicPresets.has(id)
}

export function listDynamicPresets(): ScenePresetDef[] {
  return Array.from(dynamicPresets.values())
}

export function clearDynamicPresets(): void {
  dynamicPresets.clear()
}

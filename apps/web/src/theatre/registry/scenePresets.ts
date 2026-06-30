import type { AnimationRole, AnimationOptions } from '../core/IAnimation'

export type SceneCategory = 'production' | 'lab' | 'dev'

export type PresetLayer = {
  animationId: string
  role?: AnimationRole
  options?: Partial<AnimationOptions>
}

export type TheatreTransitionKind =
  | 'cut'
  | 'fastFade'
  | 'slowFade'
  | 'crossfade'
  | 'dipToBlack'

export type ScenePresetDef = {
  id: string
  label: string
  category: SceneCategory
  layers: PresetLayer[]
  /** Preset to use instead when prefers-reduced-motion is active. */
  reducedMotionPreset?: string
  weight?: number
  timing?: {
    minDurationMs?: number
    preferredDurationMs?: number
    maxDurationMs?: number
    transitionPreference?: TheatreTransitionKind
  }
}

const presets = new Map<string, ScenePresetDef>()

export function registerPreset(def: ScenePresetDef) {
  presets.set(def.id, def)
}

export function hasPreset(id: string): boolean {
  return presets.has(id)
}

export function getPreset(id: string): ScenePresetDef | null {
  return presets.get(id) ?? null
}

export function listPresets(category?: SceneCategory): ScenePresetDef[] {
  const all = Array.from(presets.values())
  return category ? all.filter(p => p.category === category) : all
}

function collectPresetCandidates(
  preferCategory: SceneCategory,
  excludeIds: string[],
): ScenePresetDef[] {
  const exclude = new Set(excludeIds)
  const out: ScenePresetDef[] = []
  const tryCategory = (category: SceneCategory | null) => {
    for (const p of presets.values()) {
      if (exclude.has(p.id)) continue
      if (category !== null && p.category !== category) continue
      out.push(p)
    }
  }
  tryCategory(preferCategory)
  if (out.length === 0 && preferCategory !== 'production') tryCategory('production')
  if (out.length === 0) tryCategory(null)
  return out
}

export function pickPreset(opts: {
  preferCategory?: SceneCategory
  reducedMotion?: boolean
  excludeIds?: string[]
}): ScenePresetDef | null {
  const { preferCategory = 'production', reducedMotion = false, excludeIds = [] } = opts
  const candidates = collectPresetCandidates(preferCategory, excludeIds)
  if (candidates.length === 0) return null

  const total = candidates.reduce((s, p) => s + (p.weight ?? 1), 0)
  let r = Math.random() * total
  for (const p of candidates) {
    r -= (p.weight ?? 1)
    if (r <= 0) return resolve(p, reducedMotion)
  }
  return resolve(candidates[candidates.length - 1], reducedMotion)
}

function resolve(preset: ScenePresetDef, reducedMotion: boolean): ScenePresetDef {
  if (reducedMotion && preset.reducedMotionPreset) {
    return presets.get(preset.reducedMotionPreset) ?? preset
  }
  return preset
}

export default { registerPreset, hasPreset, getPreset, listPresets, pickPreset }

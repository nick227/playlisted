import type { ScenePresetDef } from '../registry/scenePresets'
import registry from '../registry'

import { BlankTheatreAnimation } from './BlankTheatreAnimation'
import { registerDynamicPreset } from './dynamicPresetStore'

export const ATTACHED_ONLY_BLANK_PRESET_ID = 'attachedOnlyBlank'
export const ATTACHED_ONLY_BLANK_ANIMATION_ID = 'attachedOnlyBlankTheatre'

const ATTACHED_ONLY_BLANK_PRESET: ScenePresetDef = {
  id: ATTACHED_ONLY_BLANK_PRESET_ID,
  label: 'Attached Only Blank',
  category: 'production',
  weight: 1,
  tags: ['user-media', 'attached-only-blank'],
  layers: [{
    animationId: ATTACHED_ONLY_BLANK_ANIMATION_ID,
    role: 'background',
    options: { preset: 'tame', zIndex: 100, opacity: 1 },
  }],
}

let engineRegistered = false

export function registerAttachedOnlyBlankEngine(): void {
  if (engineRegistered) return
  engineRegistered = true

  if (!registry.has(ATTACHED_ONLY_BLANK_ANIMATION_ID)) {
    registry.register({
      id: ATTACHED_ONLY_BLANK_ANIMATION_ID,
      label: 'Attached Only Blank',
      factory: () => new BlankTheatreAnimation(),
      visualType: 'ui',
      mood: 'calm',
      role: 'background',
      weight: 1,
    })
  }
}

export function ensureAttachedOnlyBlankPreset(): ScenePresetDef {
  registerAttachedOnlyBlankEngine()
  registerDynamicPreset(ATTACHED_ONLY_BLANK_PRESET)
  return ATTACHED_ONLY_BLANK_PRESET
}

export function getAttachedOnlyBlankPreset(): ScenePresetDef {
  return ATTACHED_ONLY_BLANK_PRESET
}

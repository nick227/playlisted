import type { ScenePresetDef } from '../registry/scenePresets'
import registry from '../registry'

import { BlankTheatreAnimation } from './BlankTheatreAnimation'

export const ATTACHED_ONLY_BLANK_PRESET_ID = 'attachedOnlyBlank'
export const ATTACHED_ONLY_BLANK_ANIMATION_ID = 'attachedOnlyBlankTheatre'

// Registered in the static preset registry by seed.ts — never in the dynamic store,
// so syncDynamicPresets cannot clear it.
export const ATTACHED_ONLY_BLANK_PRESET: ScenePresetDef = {
  id: ATTACHED_ONLY_BLANK_PRESET_ID,
  label: 'Attached Only Blank',
  category: 'production',
  weight: 1,
  audioSensitivity: 'tame',
  tags: ['user-media', 'attached-only-blank', 'internal'],
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

// Kept for call sites that ensure the animation engine is ready before use.
// Preset registration is now handled once by seed.ts via registerPreset.
export function ensureAttachedOnlyBlankPreset(): ScenePresetDef {
  registerAttachedOnlyBlankEngine()
  return ATTACHED_ONLY_BLANK_PRESET
}

export function getAttachedOnlyBlankPreset(): ScenePresetDef {
  return ATTACHED_ONLY_BLANK_PRESET
}

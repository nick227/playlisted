import { beforeAll, describe, expect, it } from 'vitest'

import {
  ATTACHED_ONLY_BLANK_PRESET,
  ATTACHED_ONLY_BLANK_PRESET_ID,
  registerAttachedOnlyBlankEngine,
} from '../media/attachedOnlyBlankPreset'
import { clearDynamicPresets, syncDynamicPresets } from '../media/dynamicPresetStore'
import { resolvePreset } from '../media/resolvePreset'
import { registerPreset } from '../registry/scenePresets'
import { userMediaPresetId } from '../media/attachmentToScenePreset'
import { registerUserMediaEngine } from '../media/userMediaEngine'

// Uses the real static registry — no mocks — to prove the blank preset survives
// syncDynamicPresets clears even after dynamic registration is removed.

beforeAll(() => {
  registerAttachedOnlyBlankEngine()
  registerPreset(ATTACHED_ONLY_BLANK_PRESET)
  registerUserMediaEngine()
})

describe('attachedOnlyBlank static registration', () => {
  it('resolves via getPreset after syncDynamicPresets clears the dynamic store', () => {
    clearDynamicPresets()
    expect(resolvePreset(ATTACHED_ONLY_BLANK_PRESET_ID)).not.toBeNull()
    expect(resolvePreset(ATTACHED_ONLY_BLANK_PRESET_ID)?.id).toBe(ATTACHED_ONLY_BLANK_PRESET_ID)
  })

  it('user-media preset is absent before sync and absent again after clear', () => {
    const presetId = userMediaPresetId('test-att-1')
    clearDynamicPresets()
    expect(resolvePreset(presetId)).toBeNull()

    syncDynamicPresets([{
      id: presetId,
      label: 'Test Clip',
      category: 'production',
      weight: 1,
      tags: ['user-media'],
      layers: [{ animationId: 'userVideoMedia' }],
    }])
    expect(resolvePreset(presetId)).not.toBeNull()

    syncDynamicPresets([])
    expect(resolvePreset(presetId)).toBeNull()
  })

  it('blank preset remains after user-media sync-and-clear cycle', () => {
    const presetId = userMediaPresetId('test-att-2')
    syncDynamicPresets([{
      id: presetId,
      label: 'Test Clip 2',
      category: 'production',
      weight: 1,
      tags: ['user-media'],
      layers: [{ animationId: 'userVideoMedia' }],
    }])
    syncDynamicPresets([])

    // The dynamic store is empty, but blank is still in the static registry.
    expect(resolvePreset(ATTACHED_ONLY_BLANK_PRESET_ID)).not.toBeNull()
    expect(resolvePreset(ATTACHED_ONLY_BLANK_PRESET_ID)?.id).toBe(ATTACHED_ONLY_BLANK_PRESET_ID)
  })

  it('blank preset is tagged internal', () => {
    expect(ATTACHED_ONLY_BLANK_PRESET.tags).toContain('internal')
  })
})

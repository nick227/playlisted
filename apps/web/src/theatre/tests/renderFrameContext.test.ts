import { describe, expect, it } from 'vitest'

import { mergePresetLayerOptions } from '../controller/theatreFrameContext'
import type { AnimationContext } from '../core/IAnimation'
import { attachmentToScenePreset } from '../media/attachmentToScenePreset'
import type { VisualMediaAttachment } from '../media/types'

const baseCtx: AnimationContext = {
  artworkUrl: 'https://cdn.example/artwork.jpg',
  options: {},
}

const imageAttachment: VisualMediaAttachment = {
  id: 'clip-a',
  mediaType: 'image',
  url: '/uploads/images/synthwave-moon.jpg',
  label: 'Synthwave Moon',
  playback: { loop: true, timelineStartSec: 0, timelineDurationSec: 100 },
  weight: 1,
  order: 0,
  enabled: true,
}

describe('mergePresetLayerOptions', () => {
  it('merges user-media imageUrl into render frame context', () => {
    const preset = attachmentToScenePreset(imageAttachment)
    const merged = mergePresetLayerOptions(baseCtx, preset)

    expect(merged.options?.imageUrl).toBe('/uploads/images/synthwave-moon.jpg')
    expect(merged.options?.mediaAttachmentId).toBe('clip-a')
    expect(merged.artworkUrl).toBe('https://cdn.example/artwork.jpg')
  })
})

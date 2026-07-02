import { describe, expect, it } from 'vitest'

import { userMediaPresetId } from '../media/attachmentToScenePreset'
import { resolveTimelinePlaybackDecision } from '../media/TimelinePlaybackDirector'
import type { VisualMediaTimelineClip } from '../media/timelineClipLayout'
import type { VisualMediaAttachment } from '../media/types'
import type { ScenePresetDef } from '../registry/scenePresets'

function attachment(overrides: Partial<VisualMediaAttachment> = {}): VisualMediaAttachment {
  return {
    id: 'clip-a',
    mediaType: 'video',
    url: '/uploads/clip-a.mp4',
    playback: { loop: true, timelineStartSec: 10, timelineDurationSec: 20 },
    order: 0,
    enabled: true,
    durationMs: 5_000,
    ...overrides,
  }
}

function clip(overrides: Partial<VisualMediaTimelineClip> = {}): VisualMediaTimelineClip {
  const baseAttachment = attachment()
  return {
    attachment: baseAttachment,
    startSec: 10,
    endSec: 30,
    durationSec: 20,
    loop: true,
    naturalDurationSec: 5,
    ...overrides,
  }
}

function preset(id: string): ScenePresetDef {
  return {
    id,
    label: id,
    category: 'production',
    layers: [{ animationId: 'mock' }],
  }
}

describe('TimelinePlaybackDirector', () => {
  it('forces the active timeline clip preset and suppresses timed rotation', () => {
    const timelineClip = clip()
    const expectedId = userMediaPresetId(timelineClip.attachment.id)
    const decision = resolveTimelinePlaybackDecision({
      timelineClips: [timelineClip],
      songPlayheadSec: 12,
      resolvePreset: id => id === expectedId ? preset(id) : null,
    })

    expect(decision.kind).toBe('activeClip')
    expect(decision.activeClip).toBe(timelineClip)
    expect(decision.presetId).toBe(expectedId)
    expect(decision.suppressTimedRotation).toBe(true)
  })

  it('uses gap fallback without suppressing normal theatre rotation', () => {
    const decision = resolveTimelinePlaybackDecision({
      timelineClips: [clip()],
      songPlayheadSec: 40,
      resolvePreset: id => preset(id),
    })

    expect(decision.kind).toBe('gapFallback')
    expect(decision.activeClip).toBeNull()
    expect(decision.presetId).toBeNull()
    expect(decision.suppressTimedRotation).toBe(false)
  })

  it('preserves legacy rotation when there are no attachments', () => {
    const decision = resolveTimelinePlaybackDecision({
      timelineClips: [],
      songPlayheadSec: 12,
      resolvePreset: id => preset(id),
    })

    expect(decision.kind).toBe('normalRotation')
    expect(decision.activeClip).toBeNull()
    expect(decision.presetId).toBeNull()
    expect(decision.suppressTimedRotation).toBe(false)
  })

  it('falls back safely when the dynamic preset is missing', () => {
    const timelineClip = clip()
    const decision = resolveTimelinePlaybackDecision({
      timelineClips: [timelineClip],
      songPlayheadSec: 12,
      resolvePreset: () => null,
    })

    expect(decision.kind).toBe('gapFallback')
    expect(decision.activeClip).toBe(timelineClip)
    expect(decision.presetId).toBeNull()
    expect(decision.suppressTimedRotation).toBe(false)
  })
})

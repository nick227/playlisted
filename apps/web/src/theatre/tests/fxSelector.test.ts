import { describe, expect, it, vi } from 'vitest'

import type { ScenePresetDef } from '../registry/scenePresets'
import { FxSelector } from '../selection/FxSelector'
import type { PickContext } from '../selection/types'

function preset(id: string): ScenePresetDef {
  return { id, label: id, category: 'production', layers: [{ animationId: 'a' }] }
}

const ctx = (activePresetId: string | null, extra: Partial<PickContext> = {}): PickContext => ({
  reducedMotion: false,
  activePresetId,
  allowUrlPreset: false,
  ...extra,
})

describe('FxSelector', () => {
  it('peekNext returns a candidate', () => {
    const pickFn = vi.fn().mockReturnValue(preset('alpha'))
    const selector = new FxSelector(pickFn)

    const picked = selector.peekNext(ctx(null))

    expect(picked?.id).toBe('alpha')
    expect(pickFn).toHaveBeenCalledTimes(1)
  })

  it('consumeNext returns the same candidate after peekNext', () => {
    const pickFn = vi.fn().mockReturnValue(preset('alpha'))
    const selector = new FxSelector(pickFn)

    expect(selector.peekNext(ctx(null))?.id).toBe('alpha')
    expect(selector.consumeNext(ctx(null))?.id).toBe('alpha')
    expect(pickFn).toHaveBeenCalledTimes(1)
  })

  it('consumeNext clears the candidate', () => {
    const pickFn = vi
      .fn()
      .mockReturnValueOnce(preset('alpha'))
      .mockReturnValueOnce(preset('beta'))
    const selector = new FxSelector(pickFn)

    selector.peekNext(ctx(null))
    selector.consumeNext(ctx(null))

    expect(selector.peekNext(ctx(null))?.id).toBe('beta')
    expect(pickFn).toHaveBeenCalledTimes(2)
  })

  it('clearCandidate forces a new pick', () => {
    const pickFn = vi
      .fn()
      .mockReturnValueOnce(preset('alpha'))
      .mockReturnValueOnce(preset('beta'))
    const selector = new FxSelector(pickFn)

    selector.peekNext(ctx(null))
    selector.clearCandidate()

    expect(selector.peekNext(ctx(null))?.id).toBe('beta')
    expect(pickFn).toHaveBeenCalledTimes(2)
  })

  it('avoids active preset when alternatives exist', () => {
    const pickFn = vi.fn((pickCtx: PickContext) => {
      const exclude = new Set(pickCtx.activePresetId ? [pickCtx.activePresetId] : [])
      const options = ['alpha', 'beta'].filter(id => !exclude.has(id))
      return preset(options[0]!)
    })
    const selector = new FxSelector(pickFn)

    const picked = selector.consumeNext(ctx('alpha'))

    expect(picked?.id).toBe('beta')
  })
})

import { describe, expect, it, vi } from 'vitest'

import { FxSelector } from '../selection/FxSelector'
import type { FxBagStorage, FxBagStorageState } from '../selection/fxBagStorage'
import type { PickContext } from '../selection/types'

vi.mock('../registry/scenePresets', () => ({
  getPreset: (id: string) => ({
    id,
    label: id,
    category: 'production',
    layers: [{ animationId: 'mock' }],
  }),
}))

vi.mock('../controller/presetQuarantine', () => ({
  isPresetQuarantined: () => false,
}))

const TEST_VERSION = 'selector-test-v1'

function createMemoryStorage(initial: FxBagStorageState | null = null) {
  let value = initial
  const storage: FxBagStorage = {
    read: () => value,
    write: state => {
      value = state
    },
    remove: () => {
      value = null
    },
  }
  return { storage, get: () => value }
}

const ctx = (activePresetId: string | null): PickContext => ({
  reducedMotion: false,
  activePresetId,
  allowUrlPreset: false,
})

describe('FxSelector', () => {
  it('peekNext returns a candidate', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = new FxSelector({
      storage: memory.storage,
      catalogVersion: TEST_VERSION,
      getCatalogEntries: () => [{ id: 'alpha', weight: 1 }, { id: 'beta', weight: 1 }],
      isValidPresetId: id => id === 'alpha' || id === 'beta',
    })

    expect(selector.peekNext(ctx(null))?.id).toBe('alpha')
  })

  it('consumeNext returns the same candidate after peekNext', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = new FxSelector({
      storage: memory.storage,
      catalogVersion: TEST_VERSION,
      getCatalogEntries: () => [{ id: 'alpha', weight: 1 }, { id: 'beta', weight: 1 }],
      isValidPresetId: id => id === 'alpha' || id === 'beta',
    })

    expect(selector.peekNext(ctx(null))?.id).toBe('alpha')
    expect(selector.consumeNext(ctx(null))?.id).toBe('alpha')
    expect(memory.get()?.bag).toEqual(['beta'])
  })

  it('consumeNext clears the candidate', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = new FxSelector({
      storage: memory.storage,
      catalogVersion: TEST_VERSION,
      getCatalogEntries: () => [{ id: 'alpha', weight: 1 }, { id: 'beta', weight: 1 }],
      isValidPresetId: id => id === 'alpha' || id === 'beta',
    })

    selector.peekNext(ctx(null))
    selector.consumeNext(ctx(null))

    expect(selector.peekNext(ctx(null))?.id).toBe('beta')
  })

  it('clearCandidate forces a new pick on next peek', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = new FxSelector({
      storage: memory.storage,
      catalogVersion: TEST_VERSION,
      getCatalogEntries: () => [{ id: 'alpha', weight: 1 }, { id: 'beta', weight: 1 }],
      isValidPresetId: id => id === 'alpha' || id === 'beta',
    })

    selector.peekNext(ctx(null))
    selector.clearCandidate()

    expect(selector.peekNext(ctx(null))?.id).toBe('alpha')
    expect(memory.get()?.bag).toEqual(['alpha', 'beta'])
  })

  it('avoids active preset when alternatives exist', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = new FxSelector({
      storage: memory.storage,
      catalogVersion: TEST_VERSION,
      getCatalogEntries: () => [{ id: 'alpha', weight: 1 }, { id: 'beta', weight: 1 }],
      isValidPresetId: id => id === 'alpha' || id === 'beta',
    })

    expect(selector.consumeNext(ctx('alpha'))?.id).toBe('beta')
  })
})

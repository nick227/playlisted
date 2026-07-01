import { describe, expect, it, vi } from 'vitest'

import {
  buildWeightedShuffleBag,
  expandWeightedPresetIds,
} from '../selection/buildWeightedShuffleBag'
import { computeCatalogVersion, hashCatalogPayload } from '../selection/catalogVersion'
import { FxSelector } from '../selection/FxSelector'
import {
  createLocalFxBagStorage,
  loadFxBagState,
  sanitizeFxBagState,
  type FxBagStorage,
  type FxBagStorageState,
} from '../selection/fxBagStorage'
import type { PickContext } from '../selection/types'

const TEST_ENTRIES = [
  { id: 'alpha', weight: 1 },
  { id: 'beta', weight: 3 },
  { id: 'gamma', weight: 1 },
] as const

const TEST_VERSION = 'test-catalog-v1'

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
  return {
    storage,
    get: () => value,
    set: (state: FxBagStorageState | null) => {
      value = state
    },
  }
}

function createTestSelector(storage: FxBagStorage) {
  return new FxSelector({
    storage,
    catalogVersion: TEST_VERSION,
    getCatalogEntries: () => [...TEST_ENTRIES],
    isValidPresetId: id => ['alpha', 'beta', 'gamma'].includes(id),
  })
}

const ctx = (activePresetId: string | null, extra: Partial<PickContext> = {}): PickContext => ({
  reducedMotion: false,
  activePresetId,
  allowUrlPreset: false,
  ...extra,
})

describe('buildWeightedShuffleBag', () => {
  it('includes weighted copies', () => {
    const bag = buildWeightedShuffleBag([...TEST_ENTRIES], [], () => 0.5)
    expect(bag).toHaveLength(5)
    expect(bag.filter(id => id === 'beta')).toHaveLength(3)
    expect(bag.filter(id => id === 'alpha')).toHaveLength(1)
    expect(bag.filter(id => id === 'gamma')).toHaveLength(1)
    expect(expandWeightedPresetIds([...TEST_ENTRIES])).toEqual([
      'alpha', 'beta', 'beta', 'beta', 'gamma',
    ])
  })
})

describe('fxBagStorage', () => {
  it('invalidates on catalog version mismatch', () => {
    const saved: FxBagStorageState = {
      version: 'old-version',
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    }

    expect(
      sanitizeFxBagState(saved, TEST_VERSION, id => id === 'alpha' || id === 'beta'),
    ).toBeNull()
  })

  it('removes invalid preset ids from restored storage', () => {
    const saved: FxBagStorageState = {
      version: TEST_VERSION,
      bag: ['alpha', 'missing', 'beta'],
      updatedAt: Date.now(),
    }

    const restored = sanitizeFxBagState(saved, TEST_VERSION, id => id === 'alpha' || id === 'beta')
    expect(restored?.bag).toEqual(['alpha', 'beta'])
  })

  it('persists through local storage adapter', () => {
    const backing = new Map<string, string>()
    const storage = createLocalFxBagStorage({
      getItem: key => backing.get(key) ?? null,
      setItem: (key, value) => {
        backing.set(key, value)
      },
      removeItem: key => {
        backing.delete(key)
      },
    } as Storage)

    storage.write({
      version: TEST_VERSION,
      bag: ['alpha'],
      updatedAt: 1,
    })

    expect(loadFxBagState(TEST_VERSION, storage, id => id === 'alpha')?.bag).toEqual(['alpha'])
  })
})

describe('FxSelector weighted bag', () => {
  it('avoids immediate active/last preset when alternatives exist', () => {
    const bag = buildWeightedShuffleBag([...TEST_ENTRIES], ['alpha', 'beta'], () => 0.1)
    expect(bag[0]).not.toBe('alpha')
    expect(bag[0]).not.toBe('beta')
  })

  it('peekNext and consumeNext return the same candidate and consume only once', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta', 'gamma'],
      updatedAt: Date.now(),
    })
    const selector = createTestSelector(memory.storage)

    expect(selector.peekNext(ctx(null))?.id).toBe('alpha')
    expect(selector.consumeNext(ctx(null))?.id).toBe('alpha')
    expect(memory.get()?.bag).toEqual(['beta', 'gamma'])
    expect(memory.get()?.lastPresetId).toBe('alpha')
  })

  it('selector avoids active preset when alternatives exist', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta', 'gamma'],
      updatedAt: Date.now(),
    })
    const selector = createTestSelector(memory.storage)

    expect(selector.consumeNext(ctx('alpha'))?.id).toBe('beta')
  })

  it('refills bag when empty', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha'],
      updatedAt: Date.now(),
    })
    const selector = createTestSelector(memory.storage)

    selector.consumeNext(ctx(null))
    expect(memory.get()?.bag.length).toBeGreaterThan(0)
  })

  it('clearCandidate does not wipe the bag', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createTestSelector(memory.storage)

    selector.peekNext(ctx(null))
    selector.clearCandidate()

    expect(memory.get()?.bag).toEqual(['alpha', 'beta'])
    expect(selector.peekNext(ctx(null))?.id).toBe('alpha')
  })
})

describe('catalogVersion', () => {
  it('builds deterministic version hash', () => {
    const version = computeCatalogVersion([
      { id: 'alpha', weight: 1 },
      { id: 'beta', weight: 2 },
    ])
    expect(version).toBe(hashCatalogPayload('alpha:1|beta:2'))
  })
})

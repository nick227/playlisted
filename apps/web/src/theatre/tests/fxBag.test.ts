import { describe, expect, it, vi } from 'vitest'

import {
  avoidEarlyPositions,
  buildFamilyWeightedShuffleBag,
  buildFxShuffleBag,
  buildPresetWeightedShuffleBag,
  buildUniformShuffleBag,
  countFamilyRepresentation,
  expandWeightedPresetIds,
  FRESH_BAG_AVOID_WINDOW,
  RECENT_PRESET_MEMORY,
} from '../selection/buildWeightedShuffleBag'
import {
  buildCatalogVersionPayload,
  computeCatalogVersion,
  hashCatalogPayload,
  type WeightedFamilyCatalogEntry,
} from '../selection/catalogVersion'
import { FxSelector } from '../selection/FxSelector'
import {
  createLocalFxBagStorage,
  loadFxBagState,
  sanitizeFxBagState,
  type FxBagStorage,
  type FxBagStorageState,
} from '../selection/fxBagStorage'
import type { PickContext } from '../selection/types'

const TEST_FAMILIES: WeightedFamilyCatalogEntry[] = [
  {
    familyId: 'test-family',
    familyWeight: 1,
    presets: [
      { id: 'alpha', weight: 1 },
      { id: 'beta', weight: 3 },
      { id: 'gamma', weight: 1 },
    ],
  },
]

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
    getCatalogFamilies: () => TEST_FAMILIES,
    isValidPresetId: id => ['alpha', 'beta', 'gamma'].includes(id),
  })
}

const ctx = (activePresetId: string | null, extra: Partial<PickContext> = {}): PickContext => ({
  reducedMotion: false,
  activePresetId,
  allowUrlPreset: false,
  ...extra,
})

describe('buildPresetWeightedShuffleBag', () => {
  it('includes weighted copies', () => {
    const entries = TEST_FAMILIES[0]!.presets.map(preset => ({ id: preset.id, weight: preset.weight }))
    const bag = buildPresetWeightedShuffleBag(entries, [], () => 0.5)
    expect(bag).toHaveLength(5)
    expect(bag.filter(id => id === 'beta')).toHaveLength(3)
    expect(expandWeightedPresetIds(entries)).toEqual([
      'alpha', 'beta', 'beta', 'beta', 'gamma',
    ])
  })
})

describe('buildFamilyWeightedShuffleBag', () => {
  const videoFamily = (count: number, familyWeight = 1): WeightedFamilyCatalogEntry => ({
    familyId: 'videos',
    familyWeight,
    presets: Array.from({ length: count }, (_, index) => ({
      id: `video${index + 1}`,
      weight: 1,
    })),
  })

  const canvasFamily = (familyWeight = 1): WeightedFamilyCatalogEntry => ({
    familyId: 'canvas',
    familyWeight,
    presets: [{ id: 'canvasA', weight: 1 }],
  })

  it('does not let large families dominate equal-weight smaller families', () => {
    const bag = buildFamilyWeightedShuffleBag(
      [videoFamily(60, 1), canvasFamily(1)],
      [],
      () => 0.42,
    )

    const counts = countFamilyRepresentation(bag, presetId =>
      presetId.startsWith('video') ? 'videos' : presetId === 'canvasA' ? 'canvas' : null,
    )

    expect(counts.get('videos')).toBe(1)
    expect(counts.get('canvas')).toBe(1)
    expect(bag.filter(id => id.startsWith('video'))).toHaveLength(1)
  })

  it('increases family representation when package weight is higher', () => {
    const bag = buildFamilyWeightedShuffleBag(
      [videoFamily(60, 2), canvasFamily(1)],
      [],
      () => 0.42,
    )

    const counts = countFamilyRepresentation(bag, presetId =>
      presetId.startsWith('video') ? 'videos' : presetId === 'canvasA' ? 'canvas' : null,
    )

    expect(counts.get('videos')).toBe(2)
    expect(counts.get('canvas')).toBe(1)
  })

  it('still applies preset weight inside a family', () => {
    const family: WeightedFamilyCatalogEntry = {
      familyId: 'mixed',
      familyWeight: 1,
      presets: [
        { id: 'heavy', weight: 3 },
        { id: 'light', weight: 1 },
      ],
    }

    const bag = buildFamilyWeightedShuffleBag([family], [], () => 0.5)
    expect(bag.filter(id => id === 'heavy').length).toBeGreaterThan(bag.filter(id => id === 'light').length)
  })
})

describe('buildUniformShuffleBag', () => {
  it('includes every preset across all families exactly once', () => {
    const families: WeightedFamilyCatalogEntry[] = [
      {
        familyId: 'flagship',
        familyWeight: 4,
        presets: [
          { id: 'heavy', weight: 4 },
          { id: 'light', weight: 1 },
        ],
      },
      {
        familyId: 'videos',
        familyWeight: 1,
        presets: Array.from({ length: 60 }, (_, index) => ({
          id: `video${index + 1}`,
          weight: 1,
        })),
      },
    ]

    const bag = buildUniformShuffleBag(families, [], () => 0.42)

    expect(bag).toHaveLength(62)
    expect(new Set(bag).size).toBe(62)
    expect(bag.filter(id => id === 'heavy')).toHaveLength(1)
    expect(bag.filter(id => id.startsWith('video'))).toHaveLength(60)
  })

  it('avoids placing the active preset first', () => {
    const bag = buildUniformShuffleBag(TEST_FAMILIES, ['alpha', 'beta'], () => 0.1)
    expect(bag[0]).not.toBe('alpha')
    expect(bag[0]).not.toBe('beta')
  })
})

describe('avoidEarlyPositions', () => {
  it('sweeps avoid ids out of the front window without dropping any', () => {
    const bag = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const result = avoidEarlyPositions(bag, ['a', 'c'], 4)

    expect(result.slice(0, 4)).not.toContain('a')
    expect(result.slice(0, 4)).not.toContain('c')
    expect(result.slice().sort()).toEqual(bag.slice().sort())
  })

  it('gives up gracefully when the bag is mostly avoid ids', () => {
    const bag = ['a', 'b', 'c']
    const result = avoidEarlyPositions(bag, ['a', 'b', 'c'], 4)
    expect(result.slice().sort()).toEqual(['a', 'b', 'c'])
  })

  it('returns the bag unchanged when nothing to avoid', () => {
    const bag = ['a', 'b', 'c']
    expect(avoidEarlyPositions(bag, [], 4)).toEqual(bag)
  })
})

describe('buildFxShuffleBag strategies', () => {
  it('supports presetWeighted behavior', () => {
    const entries = TEST_FAMILIES[0]!.presets.map(preset => ({ id: preset.id, weight: preset.weight }))
    const bag = buildFxShuffleBag({
      strategy: 'presetWeighted',
      entries,
      rng: () => 0.5,
    })

    expect(bag).toHaveLength(5)
  })

  it('supports familyWeighted behavior', () => {
    const bag = buildFxShuffleBag({
      strategy: 'familyWeighted',
      families: TEST_FAMILIES,
      rng: () => 0.5,
    })

    expect(bag).toHaveLength(3)
  })

  it('defaults to uniformShuffle — one copy per preset regardless of weight', () => {
    const bag = buildFxShuffleBag({
      families: TEST_FAMILIES,
      rng: () => 0.5,
    })

    expect(bag.slice().sort()).toEqual(['alpha', 'beta', 'gamma'])
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
    const bag = buildFxShuffleBag({
      strategy: 'presetWeighted',
      entries: TEST_FAMILIES[0]!.presets.map(preset => ({ id: preset.id, weight: preset.weight })),
      avoidFirstIds: ['alpha', 'beta'],
      rng: () => 0.1,
    })
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

  it('tracks recent consumption and keeps it out of the front of a fresh bag', () => {
    const presetIds = Array.from({ length: 16 }, (_, index) => `fx${index + 1}`)
    const families: WeightedFamilyCatalogEntry[] = [{
      familyId: 'catalog',
      familyWeight: 1,
      presets: presetIds.map(id => ({ id, weight: 1 })),
    }]
    const memory = createMemoryStorage(null)
    const selector = new FxSelector({
      storage: memory.storage,
      catalogVersion: TEST_VERSION,
      getCatalogFamilies: () => families,
      isValidPresetId: id => presetIds.includes(id),
    })

    const consumed: string[] = []
    for (let i = 0; i < presetIds.length; i++) {
      const preset = selector.consumeNext(ctx(null))
      expect(preset).not.toBeNull()
      consumed.push(preset!.id)
    }

    const state = memory.get()
    const recent = consumed.slice(-RECENT_PRESET_MEMORY)
    expect(state?.recentPresetIds).toEqual(recent)

    // Draining the bag triggered a refill — its front must avoid the recent tail.
    const freshFront = state!.bag.slice(0, FRESH_BAG_AVOID_WINDOW)
    for (const id of recent) {
      expect(freshFront).not.toContain(id)
    }
    expect(state!.bag.slice().sort()).toEqual(presetIds.slice().sort())
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
  it('builds deterministic version hash from family catalog', () => {
    const families: WeightedFamilyCatalogEntry[] = [
      {
        familyId: 'canvas',
        familyWeight: 1,
        presets: [{ id: 'alpha', weight: 1 }],
      },
      {
        familyId: 'videos',
        familyWeight: 2,
        presets: [{ id: 'video1', weight: 1 }],
      },
    ]

    const version = computeCatalogVersion(families)
    expect(version).toBe(hashCatalogPayload(buildCatalogVersionPayload(families)))
  })

  it('changes when package weight changes', () => {
    const base: WeightedFamilyCatalogEntry[] = [
      {
        familyId: 'videos',
        familyWeight: 1,
        presets: [{ id: 'video1', weight: 1 }],
      },
    ]
    const heavier: WeightedFamilyCatalogEntry[] = [
      {
        familyId: 'videos',
        familyWeight: 2,
        presets: [{ id: 'video1', weight: 1 }],
      },
    ]

    expect(computeCatalogVersion(base)).not.toBe(computeCatalogVersion(heavier))
  })
})

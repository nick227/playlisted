import type {
  WeightedFamilyCatalogEntry,
  WeightedPresetEntry,
} from './catalogVersion'

export type BagBuildStrategy = 'presetWeighted' | 'familyWeighted'

export const DEFAULT_BAG_BUILD_STRATEGY: BagBuildStrategy = 'familyWeighted'

export type BuildFxShuffleBagOptions = {
  strategy?: BagBuildStrategy
  entries?: WeightedPresetEntry[]
  families?: WeightedFamilyCatalogEntry[]
  avoidFirstIds?: string[]
  rng?: () => number
}

export function weightedPickWithRng<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rng: () => number = Math.random,
): T | null {
  if (items.length === 0) return null
  const total = items.reduce((sum, item) => sum + weightOf(item), 0)
  if (total <= 0) return items[0] ?? null

  let roll = rng() * total
  for (const item of items) {
    roll -= weightOf(item)
    if (roll <= 0) return item
  }
  return items[items.length - 1] ?? null
}

export function expandWeightedPresetIds(entries: WeightedPresetEntry[]): string[] {
  const expanded: string[] = []
  for (const entry of entries) {
    const copies = Math.max(1, Math.round(entry.weight))
    for (let i = 0; i < copies; i++) expanded.push(entry.id)
  }
  return expanded
}

export function shuffleIds(ids: string[], rng: () => number = Math.random): string[] {
  const bag = [...ids]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

export function avoidFirstPosition(bag: string[], avoidFirstIds: string[]): string[] {
  if (bag.length <= 1) return bag

  const avoid = new Set(avoidFirstIds.filter(Boolean))
  if (!avoid.has(bag[0]!)) return bag

  const swapIdx = bag.findIndex((id, index) => index > 0 && !avoid.has(id))
  if (swapIdx === -1) return bag

  const next = [...bag]
  ;[next[0], next[swapIdx]] = [next[swapIdx]!, next[0]!]
  return next
}

export function buildPresetWeightedShuffleBag(
  entries: WeightedPresetEntry[],
  avoidFirstIds: string[] = [],
  rng: () => number = Math.random,
): string[] {
  const expanded = expandWeightedPresetIds(entries)
  const shuffled = shuffleIds(expanded, rng)
  return avoidFirstPosition(shuffled, avoidFirstIds)
}

export function buildFamilyWeightedShuffleBag(
  families: WeightedFamilyCatalogEntry[],
  avoidFirstIds: string[] = [],
  rng: () => number = Math.random,
): string[] {
  if (families.length === 0) return []

  const maxPresetRound = Math.max(
    1,
    ...families.flatMap(family =>
      family.presets.map(preset => Math.max(1, Math.round(preset.weight))),
    ),
  )

  const bag: string[] = []

  for (let round = 0; round < maxPresetRound; round++) {
    for (const family of families) {
      const familySlots = Math.max(1, Math.round(family.familyWeight))
      for (let slot = 0; slot < familySlots; slot++) {
        const eligible = family.presets.filter(
          preset => round < Math.max(1, Math.round(preset.weight)),
        )
        if (eligible.length === 0) continue

        const picked = weightedPickWithRng(eligible, preset => preset.weight, rng)
        if (picked) bag.push(picked.id)
      }
    }
  }

  const shuffled = shuffleIds(bag, rng)
  return avoidFirstPosition(shuffled, avoidFirstIds)
}

/** @deprecated Use buildPresetWeightedShuffleBag or buildFxShuffleBag. */
export function buildWeightedShuffleBag(
  entries: WeightedPresetEntry[],
  avoidFirstIds: string[] = [],
  rng: () => number = Math.random,
): string[] {
  return buildPresetWeightedShuffleBag(entries, avoidFirstIds, rng)
}

export function buildFxShuffleBag(options: BuildFxShuffleBagOptions = {}): string[] {
  const {
    strategy = DEFAULT_BAG_BUILD_STRATEGY,
    entries = [],
    families = [],
    avoidFirstIds = [],
    rng = Math.random,
  } = options

  if (strategy === 'presetWeighted') {
    return buildPresetWeightedShuffleBag(entries, avoidFirstIds, rng)
  }

  return buildFamilyWeightedShuffleBag(families, avoidFirstIds, rng)
}

export function countFamilyRepresentation(bag: string[], familyOf: (presetId: string) => string | null) {
  const counts = new Map<string, number>()
  for (const presetId of bag) {
    const familyId = familyOf(presetId)
    if (!familyId) continue
    counts.set(familyId, (counts.get(familyId) ?? 0) + 1)
  }
  return counts
}

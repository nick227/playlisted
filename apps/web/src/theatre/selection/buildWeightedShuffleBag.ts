import type { WeightedPresetEntry } from './catalogVersion'

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

export function buildWeightedShuffleBag(
  entries: WeightedPresetEntry[],
  avoidFirstIds: string[] = [],
  rng: () => number = Math.random,
): string[] {
  const expanded = expandWeightedPresetIds(entries)
  const shuffled = shuffleIds(expanded, rng)
  return avoidFirstPosition(shuffled, avoidFirstIds)
}

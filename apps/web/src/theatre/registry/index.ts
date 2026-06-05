import type { AnimationMood, AnimationRole, RegistryEntry } from '../core/IAnimation'

const registry = new Map<string, RegistryEntry>()

export function register(entry: RegistryEntry) {
  registry.set(entry.id, entry)
}

export function has(id: string) {
  return registry.has(id)
}

export function get(id: string) {
  return registry.get(id) || null
}

export function list() {
  return Array.from(registry.values())
}

// pick weighted random among type filter
export function pickRandom(mood?: AnimationMood) {
  const entries = list().filter(e => !mood || e.mood === mood)
  const total = entries.reduce((s, e) => s + (e.weight || 1), 0)
  let r = Math.random() * total
  for (const e of entries) {
    r -= (e.weight || 1)
    if (r <= 0) return e
  }
  return entries[0] || null
}

// pick stacked factories (allow composition). If ids provided, return those in order.
// Return a curated stack of RegistryEntry matching roles. If roles not provided, use [background, central, foreground].
export function pickStack(count = 3, preferMood?: AnimationMood, roles: AnimationRole[] = ['background', 'subject', 'foreground']) {
  const all = list()
  const chosen: RegistryEntry[] = []

  // helper to choose one weighted random from candidates
  function chooseOne(cands: RegistryEntry[]) {
    if (cands.length === 0) return null
    const total = cands.reduce((s, e) => s + (e.weight || 1), 0)
    let r = Math.random() * total
    for (const e of cands) {
      r -= (e.weight || 1)
      if (r <= 0) return e
    }
    return cands[0]
  }

  for (let i = 0; i < Math.min(count, roles.length); i++) {
    const role = roles[i]
    // prefer entries that match role and optionally preferMood
    let candidates = all.filter(e => (e.role === role || e.role === 'any') && (!preferMood || e.mood === preferMood))
    if (candidates.length === 0) candidates = all.filter(e => (e.role === role || e.role === 'any'))
    if (candidates.length === 0) candidates = all
    const pick = chooseOne(candidates)
    if (pick && !chosen.includes(pick)) chosen.push(pick)
  }

  // if we need more to reach count, fill with random weighted entries
  while (chosen.length < count && all.length > 0) {
    const pick = chooseOne(all.filter(e => !chosen.includes(e)))
    if (!pick) break
    chosen.push(pick)
  }

  return chosen
}

export default { register, has, get, list, pickRandom, pickStack }

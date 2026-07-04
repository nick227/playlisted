export function hash2(seed: number, x: number, y: number): number {
  let h = seed ^ (x * 374761393 + y * 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

export function rand01(seed: number, x: number, y: number): number {
  return hash2(seed, x, y) / 0xffffffff
}

export function pick<T>(seed: number, x: number, y: number, items: readonly T[]): T {
  const i = hash2(seed, x, y) % items.length
  return items[i]
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function pickFrom<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededRandom(seed) * items.length)]!
}

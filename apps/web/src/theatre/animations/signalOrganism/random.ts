/** Deterministic 0..1 from numeric seed (stable across frames for a given seed). */
export function rand01(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function randSigned(seed: number) {
  return rand01(seed) * 2 - 1
}

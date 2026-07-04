/** Deterministic 32-bit hash for star/grain/atmosphere placement. */
export function hash2(a: number, b: number, c?: number): number {
  let h = (a ^ Math.imul(b, 668265263)) >>> 0
  if (c !== undefined) h = (h ^ Math.imul(c, 374761393)) >>> 0
  h = Math.imul(h ^ (h >>> 15), h | 1)
  h ^= h >>> 13
  h = Math.imul(h, 1274126177)
  h ^= h >>> 16
  return h >>> 0
}

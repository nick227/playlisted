/** Exponential smoothing — stable across frame rates. */
export function expSmooth(current: number, target: number, deltaMs: number, tauMs: number): number {
  if (tauMs <= 0 || deltaMs <= 0) return target
  const t = 1 - Math.exp(-deltaMs / tauMs)
  return current + (target - current) * t
}

export function expSmoothVec2(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  deltaMs: number,
  tauMs: number,
): [number, number] {
  return [
    expSmooth(cx, tx, deltaMs, tauMs),
    expSmooth(cy, ty, deltaMs, tauMs),
  ]
}

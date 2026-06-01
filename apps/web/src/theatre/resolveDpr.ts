/** Clamped backing-store scale; only place that reads `window.devicePixelRatio` for theatre canvases. */
export function resolveDevicePixelRatio(dprClamp = 2): number {
  const raw = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.min(raw, dprClamp)
}

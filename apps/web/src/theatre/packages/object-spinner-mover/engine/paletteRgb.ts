export function hexToRgb(hex: string): string {
  const raw = hex.replace('#', '')
  const full = raw.length === 3
    ? raw.split('').map(c => c + c).join('')
    : raw
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return '255,255,255'
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

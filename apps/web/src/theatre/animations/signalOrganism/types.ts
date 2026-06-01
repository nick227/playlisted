export type OrganismPhase = 'dormant' | 'feeding' | 'signaling' | 'frenzy' | 'exhaust'

export type CellNode = {
  gx: number
  gy: number
  x: number
  y: number
  r: number
  heat: number
  splitHold: number
  stress: number
  driftX: number
  driftY: number
}

export type EchoRing = { t: number; life: number; strength: number }

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

import { METRO_SETTINGS } from './constants'

export function isBorderRoad(gx: number, gy: number, size: number): boolean {
  return gx === 0 || gy === 0 || gx === size - 1 || gy === size - 1
}

export function isHighway(gx: number, gy: number): boolean {
  return gx % 16 === 0 || gy % 16 === 0
}

export function isArterial(gx: number, gy: number): boolean {
  return gx % 8 === 0 || gy % 8 === 0
}

export function isLocalRoad(gx: number, gy: number, size: number): boolean {
  const nx = gx / size - 0.5
  const ny = gy / size - 0.5
  const core = Math.abs(nx) + Math.abs(ny) < 0.42
  return core && (gx % 4 === 0 || gy % 4 === 0)
}

export function isRoad(gx: number, gy: number, size: number): boolean {
  if (isBorderRoad(gx, gy, size)) return true
  if (isHighway(gx, gy)) return true
  if (isArterial(gx, gy)) return true
  if (isLocalRoad(gx, gy, size)) return true
  return false
}

export function isWater(gx: number, gy: number, size: number): boolean {
  const margin = Math.floor(size * 8 / 48)
  const depth = Math.floor(size * 10 / 48)
  return gx >= size - margin && gy < depth
}

export function isRail(gx: number, gy: number): boolean {
  return gy === METRO_SETTINGS.trainTrackGy
}

export function roadKind(gx: number, gy: number, size: number): 'highway' | 'arterial' | 'local' | 'border' | 'none' {
  if (!isRoad(gx, gy, size)) return 'none'
  if (isBorderRoad(gx, gy, size)) return 'border'
  if (isHighway(gx, gy)) return 'highway'
  if (isArterial(gx, gy)) return 'arterial'
  return 'local'
}

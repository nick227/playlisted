import { METRO_SETTINGS } from './constants'
import { projectTile } from './coords'
import type { CameraState } from './types'

export function chunkKey(gx: number, gy: number, chunkSize = METRO_SETTINGS.chunkSize): number {
  const cx = Math.floor(gx / chunkSize)
  const cy = Math.floor(gy / chunkSize)
  return cx * 1000 + cy
}

export function buildVisibleChunks(
  citySize: number,
  cam: CameraState,
  cssW: number,
  cssH: number,
  chunkSize = METRO_SETTINGS.chunkSize,
): Set<number> {
  const chunksPerSide = Math.ceil(citySize / chunkSize)
  const visible = new Set<number>()
  const pad = 48

  for (let cy = 0; cy < chunksPerSide; cy++) {
    for (let cx = 0; cx < chunksPerSide; cx++) {
      const gx0 = cx * chunkSize
      const gy0 = cy * chunkSize
      const gx1 = Math.min(citySize, gx0 + chunkSize)
      const gy1 = Math.min(citySize, gy0 + chunkSize)
      if (chunkIntersectsViewport(gx0, gy0, gx1, gy1, cam, cssW, cssH, pad)) {
        visible.add(cx * 1000 + cy)
      }
    }
  }
  return visible
}

function chunkIntersectsViewport(
  gx0: number,
  gy0: number,
  gx1: number,
  gy1: number,
  cam: CameraState,
  cssW: number,
  cssH: number,
  pad: number,
): boolean {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const samples = [
    [gx0, gy0, 0], [gx1, gy0, 0], [gx0, gy1, 0], [gx1, gy1, 0],
    [gx0, gy0, 3], [gx1, gy1, 3],
  ]
  for (const [gx, gy, elev] of samples) {
    const p = projectTile(gx, gy, elev, cam)
    minX = Math.min(minX, p.sx)
    maxX = Math.max(maxX, p.sx)
    minY = Math.min(minY, p.sy)
    maxY = Math.max(maxY, p.sy)
  }
  return maxX >= -pad && minX <= cssW + pad && maxY >= -pad && minY <= cssH + pad
}

export function iterateVisibleCells(
  size: number,
  visible: Set<number>,
  fn: (gx: number, gy: number) => void,
  chunkSize = METRO_SETTINGS.chunkSize,
) {
  for (let sum = 0; sum < size * 2; sum++) {
    for (let gx = 0; gx <= sum; gx++) {
      const gy = sum - gx
      if (gx >= size || gy >= size) continue
      if (!visible.has(chunkKey(gx, gy, chunkSize))) continue
      fn(gx, gy)
    }
  }
}

import { METRO_SETTINGS } from './constants'
import type { CameraState, ProjectedPoint } from './types'

const { tileHalfW, tileHalfH, isoYScale } = METRO_SETTINGS

/** Dimetric 3/4: +X screen-right, +Y screen-down-right, +Z up. */
export function projectTile(
  gx: number,
  gy: number,
  elev: number,
  cam: CameraState,
): ProjectedPoint {
  const wx = gx - gy
  const wy = (gx + gy) * isoYScale - elev
  const sx = wx * tileHalfW * cam.zoom + cam.originX + cam.swayX
  const sy = wy * tileHalfH * cam.zoom + cam.originY + cam.swayY
  const depth = gx + gy + elev * 0.01
  return { sx, sy, depth }
}

export function depthKey(gx: number, gy: number, elev = 0): number {
  return gx + gy + elev
}

export function fitCameraToCity(
  citySize: number,
  cssW: number,
  cssH: number,
  zoom: number,
): Pick<CameraState, 'originX' | 'originY'> {
  const corners = [
    projectTile(0, 0, 0, { originX: 0, originY: 0, zoom, swayX: 0, swayY: 0 }),
    projectTile(citySize, 0, 0, { originX: 0, originY: 0, zoom, swayX: 0, swayY: 0 }),
    projectTile(0, citySize, 0, { originX: 0, originY: 0, zoom, swayX: 0, swayY: 0 }),
    projectTile(citySize, citySize, 0, { originX: 0, originY: 0, zoom, swayX: 0, swayY: 0 }),
  ]
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const c of corners) {
    minX = Math.min(minX, c.sx)
    maxX = Math.max(maxX, c.sx)
    minY = Math.min(minY, c.sy)
    maxY = Math.max(maxY, c.sy)
  }
  const mapW = maxX - minX
  const mapH = maxY - minY
  const pad = 24
  const originX = (cssW - mapW) / 2 - minX
  const skyBand = cssH * 0.28
  const originY = skyBand + (cssH - skyBand - pad - mapH) / 2 - minY
  return { originX, originY }
}

/** Zoom that fits the full city footprint in the viewport. */
export function computeAutoZoom(citySize: number, cssW: number, cssH: number): number {
  const probe = { originX: 0, originY: 0, zoom: 1, swayX: 0, swayY: 0 }
  const corners = [
    projectTile(0, 0, 0, probe),
    projectTile(citySize, 0, 0, probe),
    projectTile(0, citySize, 0, probe),
    projectTile(citySize, citySize, 0, probe),
  ]
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const c of corners) {
    minX = Math.min(minX, c.sx)
    maxX = Math.max(maxX, c.sx)
    minY = Math.min(minY, c.sy)
    maxY = Math.max(maxY, c.sy)
  }
  const mapW = maxX - minX
  const mapH = maxY - minY
  const pad = 48
  const skyBand = cssH * 0.28
  const fitX = (cssW - pad) / mapW
  const fitY = (cssH - skyBand - pad) / mapH
  return Math.min(METRO_SETTINGS.maxZoom, Math.max(METRO_SETTINGS.minZoom, Math.min(fitX, fitY) * 0.96))
}

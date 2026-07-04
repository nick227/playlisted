import { fitCameraToCity, computeAutoZoom } from '../world/coords'
import { METRO_SETTINGS } from '../world/constants'
import type { CameraState, MetropolisAudio } from '../world/types'

export function createCamera(): CameraState {
  return { originX: 0, originY: 0, zoom: METRO_SETTINGS.minZoom, swayX: 0, swayY: 0 }
}

export function updateCamera(
  elapsed: number,
  cssW: number,
  cssH: number,
  citySize: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
): CameraState {
  const sweep = elapsed * 0.000011
  const driftX = reducedMotion ? 0 : Math.sin(sweep) * 36 + Math.sin(elapsed * 0.0035) * 10
  const driftY = reducedMotion ? 0 : Math.cos(sweep * 0.72) * 18 + Math.cos(elapsed * 0.0028) * 6
  const swayX = reducedMotion ? 0 : audio.bass * METRO_SETTINGS.audioSwayMaxPx * 1.15
  const swayY = reducedMotion ? 0 : audio.mids * METRO_SETTINGS.audioSwayMaxPx * 0.4
  const breathe = reducedMotion ? 0 : Math.sin(elapsed * 0.00045) * 0.012
  const zoomPulse = reducedMotion ? 0 : audio.energy * METRO_SETTINGS.audioZoomPulse
  const baseZoom = computeAutoZoom(citySize, cssW, cssH)
  const zoom = Math.min(
    METRO_SETTINGS.maxZoom,
    Math.max(METRO_SETTINGS.minZoom, baseZoom + zoomPulse + breathe),
  )
  const base = fitCameraToCity(citySize, cssW, cssH, zoom)
  return {
    originX: base.originX + driftX,
    originY: base.originY + driftY,
    zoom,
    swayX,
    swayY,
  }
}

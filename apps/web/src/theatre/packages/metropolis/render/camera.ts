import { fitCameraToCity } from '../world/coords'
import { METRO_SETTINGS } from '../world/constants'
import type { CameraState, MetropolisAudio } from '../world/types'

export function createCamera(): CameraState {
  return { originX: 0, originY: 0, zoom: 0.95, swayX: 0, swayY: 0 }
}

export function updateCamera(
  elapsed: number,
  cssW: number,
  cssH: number,
  citySize: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
): CameraState {
  const driftX = reducedMotion ? 0 : Math.sin(elapsed * METRO_SETTINGS.cameraDriftX) * 18
  const driftY = reducedMotion ? 0 : Math.cos(elapsed * METRO_SETTINGS.cameraDriftY * 0.9) * 10
  const swayX = reducedMotion ? 0 : audio.bass * METRO_SETTINGS.audioSwayMaxPx
  const swayY = reducedMotion ? 0 : audio.mids * METRO_SETTINGS.audioSwayMaxPx * 0.35
  const zoomPulse = reducedMotion ? 0 : audio.energy * METRO_SETTINGS.audioZoomPulse
  const zoom = Math.min(
    METRO_SETTINGS.maxZoom,
    Math.max(METRO_SETTINGS.minZoom, 0.95 + zoomPulse),
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

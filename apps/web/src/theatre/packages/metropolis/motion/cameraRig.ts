import { fitCameraToCity, computeAutoZoom } from '../world/coords'
import { METRO_SETTINGS } from '../world/constants'
import type { CameraState } from '../world/types'
import type { AudioEnvelope } from './audioEnvelope'
import { expSmooth, expSmoothVec2 } from './expSmooth'

export type CameraRig = {
  display: CameraState
  zoom: number
  originX: number
  originY: number
  swayX: number
  swayY: number
}

export function createCameraRig(): CameraRig {
  const z = METRO_SETTINGS.minZoom
  return {
    display: { originX: 0, originY: 0, zoom: z, swayX: 0, swayY: 0 },
    zoom: z,
    originX: 0,
    originY: 0,
    swayX: 0,
    swayY: 0,
  }
}

export function updateCameraRig(
  rig: CameraRig,
  elapsed: number,
  cssW: number,
  cssH: number,
  citySize: number,
  audio: AudioEnvelope,
  reducedMotion: boolean,
  deltaMs: number,
): CameraRig {
  const sweep = elapsed * 0.000011
  const driftX = reducedMotion ? 0 : Math.sin(sweep) * 36 + Math.sin(elapsed * 0.0035) * 10
  const driftY = reducedMotion ? 0 : Math.cos(sweep * 0.72) * 18 + Math.cos(elapsed * 0.0028) * 6
  const targetSwayX = reducedMotion ? 0 : audio.bass * METRO_SETTINGS.audioSwayMaxPx * 1.15
  const targetSwayY = reducedMotion ? 0 : audio.mids * METRO_SETTINGS.audioSwayMaxPx * 0.4
  const breathe = reducedMotion ? 0 : Math.sin(elapsed * 0.00045) * 0.012
  const zoomPulse = reducedMotion ? 0 : audio.energy * METRO_SETTINGS.audioZoomPulse
  const baseZoom = computeAutoZoom(citySize, cssW, cssH)
  const targetZoom = Math.min(
    METRO_SETTINGS.maxZoom,
    Math.max(METRO_SETTINGS.minZoom, baseZoom + zoomPulse + breathe),
  )
  const base = fitCameraToCity(citySize, cssW, cssH, targetZoom)
  const targetOriginX = base.originX + driftX
  const targetOriginY = base.originY + driftY

  const zoom = expSmooth(rig.zoom, targetZoom, deltaMs, 180)
  const [originX, originY] = expSmoothVec2(
    rig.originX, rig.originY, targetOriginX, targetOriginY, deltaMs, 220,
  )
  const swayX = expSmooth(rig.swayX, targetSwayX, deltaMs, 70)
  const swayY = expSmooth(rig.swayY, targetSwayY, deltaMs, 80)

  const display: CameraState = { originX, originY, zoom, swayX, swayY }
  return { display, zoom, originX, originY, swayX, swayY }
}

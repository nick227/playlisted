import { fitCameraToCity } from '../world/coords'
import type { CityGrid } from '../world/cityGen'
import type { CameraState } from '../world/types'
import { drawCityStatic } from './cityStatic'

export class CityStaticCache {
  private canvas: HTMLCanvasElement | null = null
  private cacheCtx: CanvasRenderingContext2D | null = null
  private cacheKey = ''

  private ensureCanvas(w: number, h: number, dpr: number) {
    const pw = Math.ceil(w * dpr)
    const ph = Math.ceil(h * dpr)
    if (!this.canvas || this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas = document.createElement('canvas')
      this.canvas.width = pw
      this.canvas.height = ph
      this.cacheCtx = this.canvas.getContext('2d')
      this.cacheKey = ''
    }
  }

  private bakeKey(layoutKey: string, cam: CameraState): string {
    return `${layoutKey}|${cam.zoom.toFixed(2)}`
  }

  private bakeCam(cam: CameraState, citySize: number, cssW: number, cssH: number): CameraState {
    const base = fitCameraToCity(citySize, cssW, cssH, cam.zoom)
    return { ...cam, originX: base.originX, originY: base.originY, swayX: 0, swayY: 0 }
  }

  draw(
    mainCtx: CanvasRenderingContext2D,
    grid: CityGrid,
    cam: CameraState,
    cssW: number,
    cssH: number,
    dpr: number,
    layoutKey: string,
  ) {
    this.ensureCanvas(cssW, cssH, dpr)
    const key = this.bakeKey(layoutKey, cam)
    if (key !== this.cacheKey && this.cacheCtx && this.canvas) {
      this.cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.cacheCtx.clearRect(0, 0, cssW, cssH)
      drawCityStatic(this.cacheCtx, grid, this.bakeCam(cam, grid.size, cssW, cssH), cssW, cssH)
      this.cacheKey = key
    }

    const base = fitCameraToCity(grid.size, cssW, cssH, cam.zoom)
    const ox = cam.originX - base.originX + cam.swayX
    const oy = cam.originY - base.originY + cam.swayY
    mainCtx.save()
    mainCtx.translate(ox, oy)
    if (this.canvas) mainCtx.drawImage(this.canvas, 0, 0, cssW, cssH)
    mainCtx.restore()
  }
}

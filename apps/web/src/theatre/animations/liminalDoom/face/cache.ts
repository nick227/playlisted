import type { CacheCtx, FaceGender } from './faceUtil'

/** Max baked head diameter in backing-store pixels (memory cap per cast member). */
export const FACE_CACHE_MAX_PX = 320
/** Below this on-screen diameter we bake to an offscreen bitmap; above, draw vector at full size. */
export const FACE_CACHE_MAX_DISPLAY_D = 168

export class FaceCacheEntry {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement
  readonly ctx: CacheCtx
  dirty = true
  private lastDistort = -1
  private lastSeed = -1
  private lastGender: FaceGender = 'male'
  private lastFaceId = ''

  constructor(size: number) {
    if (typeof OffscreenCanvas !== 'undefined') {
      const oc = new OffscreenCanvas(size, size)
      this.canvas = oc
      this.ctx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D
    } else {
      const el = document.createElement('canvas')
      el.width = size
      el.height = size
      this.canvas = el
      this.ctx = el.getContext('2d') as CanvasRenderingContext2D
    }
  }

  needsRebake(distort: number, seed: number, gender: FaceGender, faceId: string): boolean {
    return this.dirty
      || Math.abs(distort - this.lastDistort) > 0.04
      || seed !== this.lastSeed
      || gender !== this.lastGender
      || faceId !== this.lastFaceId
  }

  markClean(distort: number, seed: number, gender: FaceGender, faceId: string) {
    this.dirty = false
    this.lastDistort = distort
    this.lastSeed = seed
    this.lastGender = gender
    this.lastFaceId = faceId
  }

  markDirty() {
    this.dirty = true
  }

  ensureBakePixels(backingStoreDiameter: number) {
    const size = Math.min(FACE_CACHE_MAX_PX, Math.max(64, Math.ceil(backingStoreDiameter)))
    if (this.canvas.width === size) return
    this.canvas.width = size
    this.canvas.height = size
    this.dirty = true
  }
}

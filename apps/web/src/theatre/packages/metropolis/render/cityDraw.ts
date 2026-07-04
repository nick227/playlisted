import { drawCityDynamic } from './cityDynamic'
import { CityStaticCache } from './cityCache'
import type { CityGrid } from '../world/cityGen'
import type { CameraState, MetropolisAudio } from '../world/types'
import type { DirectorState } from '../director/MetropolisDirector'

const cache = new CityStaticCache()

export function drawCity(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  cssW: number,
  cssH: number,
  dpr: number,
  layoutKey: string,
  elapsed: number,
  audio: MetropolisAudio,
  reducedMotion: boolean,
  director: DirectorState,
) {
  cache.draw(ctx, grid, cam, cssW, cssH, dpr, layoutKey)
  drawCityDynamic(ctx, grid, cam, cssW, cssH, elapsed, audio, reducedMotion, {
    blackout: director.blackout,
    blackoutWave: director.blackoutWave,
    blackoutRolling: director.blackoutRolling,
    horror: director.horror,
    neonSurge: director.neonSurge,
  })
}

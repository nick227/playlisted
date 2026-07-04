import CanvasAnimation from '../../core/CanvasAnimation'
import type { PublicAnimationContext } from '../../author/types'
import type { IAnimation } from '../../core/IAnimation'

import { createDirector, drawDirectorFx, updateDirector } from './director/MetropolisDirector'
import { spawnPedestrians, updatePedestrians, drawPedestrians } from './entities/pedestrians'
import { spawnTraffic, updateTraffic, drawTraffic } from './entities/traffic'
import { createTrain, drawTrain, updateTrain } from './entities/train'
import { createCamera, updateCamera } from './render/camera'
import { drawCity } from './render/cityDraw'
import { drawSky } from './render/sky'
import { drawAtmosphere } from './render/atmosphere'
import { drawIndustrialVents } from './render/industrialVents'
import { METRO_SETTINGS } from './world/constants'
import { generateCity } from './world/cityGen'
import type { MetropolisAudio } from './world/types'

export function metropolisFactory(): IAnimation {
  class MetropolisScene extends CanvasAnimation {
    private grid = generateCity(METRO_SETTINGS.citySeed, METRO_SETTINGS.citySize)
    private cam = createCamera()
    private director = createDirector()
    private train = createTrain()
    private cars = spawnTraffic(this.grid, METRO_SETTINGS.trafficCount)
    private peds = spawnPedestrians(this.grid, METRO_SETTINGS.pedestrianCount)
    private lastElapsed = 0
    private layoutKey = ''

    constructor() {
      super({ useEffects: true, defaultOpacity: 1, defaultZIndex: 101 })
    }

    private readAudio(context: PublicAnimationContext): MetropolisAudio {
      const bands = this.readBands(context)
      const triggers = context.shared.getTriggers(context.options.preset ?? 'vivid')
      const sensitivity = context.options.sensitivity ?? 1
      const intensity = context.options.intensity ?? 1
      return {
        bass: bands.bass * sensitivity * intensity,
        mids: bands.mids * sensitivity * intensity,
        highs: bands.highs * sensitivity * intensity,
        energy: triggers.energy,
        beat: triggers.beat,
        chaos: triggers.chaosHit,
      }
    }

    protected draw(context: PublicAnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w < 16 || h < 16) return

      const elapsed = context.shared.time.elapsed
      const delta = Math.min(50, context.shared.time.delta || Math.max(16, elapsed - this.lastElapsed))
      this.lastElapsed = elapsed

      const audio = this.readAudio(context)
      const reduced = context.shared.reducedMotion
      const layoutKey = `${w}|${h}`
      if (layoutKey !== this.layoutKey) this.layoutKey = layoutKey

      this.cam = updateCamera(elapsed, w, h, this.grid.size, audio, reduced)
      this.director = updateDirector(this.director, delta, audio, reduced)
      this.train = updateTrain(this.train, delta, this.director.train)
      const trafficBoost = this.director.loopT >= 8_000 && this.director.loopT < 20_000 ? 0.5 : 0
      updateTraffic(this.cars, this.grid, delta * 0.06, trafficBoost)
      if (!reduced && context.shared.particleScale > 0) {
        updatePedestrians(this.peds, this.grid, delta * 0.06)
      }

      const horizonY = h * 0.34
      const cityGlow = audio.energy + audio.bass * 0.5 + this.director.neonSurge * 0.3

      drawSky(this.ctx, w, h, elapsed, horizonY, cityGlow, reduced, this.director.moonCover)
      drawCity(
        this.ctx, this.grid, this.cam, w, h, this.pixelRatio, layoutKey,
        elapsed, audio, reduced, this.director,
      )
      drawIndustrialVents(this.ctx, this.grid, this.cam, w, h, elapsed, reduced, context.shared.particleScale)
      drawTrain(this.ctx, this.grid, this.cam, this.train)
      drawTraffic(this.ctx, this.cars, this.cam)
      if (!reduced && context.shared.particleScale > 0) {
        drawPedestrians(this.ctx, this.peds, this.cam)
      }
      drawAtmosphere(this.ctx, w, h, elapsed, cityGlow, reduced, context.shared.particleScale)
      drawDirectorFx(this.ctx, w, h, this.director)

      if (this.effects && !reduced && context.shared.particleScale > 0) {
        if (audio.beat) this.effects.triggerScreenPunch(0.15 + audio.bass * 0.2)
        this.effects.update(this.ctx, elapsed, this.pixelRatio)
      }
    }
  }

  return new MetropolisScene()
}

export default metropolisFactory

import CanvasAnimation from '../../core/CanvasAnimation'
import type { PublicAnimationContext } from '../../author/types'
import type { IAnimation } from '../../core/IAnimation'

import { createDirector, drawDirectorFx, updateDirector } from './director/MetropolisDirector'
import { updateHumanDrama, drawHumanDrama } from './entities/humanDrama'
import { spawnTraffic, updateTraffic, drawTraffic } from './entities/traffic'
import { createTrain, drawTrain, updateTrain } from './entities/train'
import { createAudioEnvelope, updateAudioEnvelope } from './motion/audioEnvelope'
import { createCameraRig, updateCameraRig } from './motion/cameraRig'
import { drawCity } from './render/cityDraw'
import { drawSky } from './render/sky'
import { drawAtmosphere } from './render/atmosphere'
import { drawIndustrialVents } from './render/industrialVents'
import { drawStreetFurniture } from './render/streetFurniture'
import { drawWaterfrontLandmarks } from './render/waterfrontLandmarks'
import { drawHeroLandmarks } from './render/heroLandmarks'
import { drawLocalizedEvents } from './render/localizedEvents'
import { drawCinematicGrade } from './render/cinematicGrade'
import { projectTile } from './world/coords'
import { METRO_SETTINGS } from './world/constants'
import { generateCity } from './world/cityGen'
import { spawnHumanDrama } from './world/humanSpawn'
import type { MetropolisAudio } from './world/types'

export function metropolisFactory(): IAnimation {
  class MetropolisScene extends CanvasAnimation {
    private grid = generateCity(METRO_SETTINGS.citySeed, METRO_SETTINGS.citySize)
    private cameraRig = createCameraRig()
    private audioEnv = createAudioEnvelope()
    private director = createDirector()
    private train = createTrain()
    private cars = spawnTraffic(this.grid, METRO_SETTINGS.trafficCount)
    private humanDrama = spawnHumanDrama(this.grid)
    private beatCooldownMs = 0

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

    private sceneAudio(raw: MetropolisAudio): MetropolisAudio {
      return { ...raw, bass: this.audioEnv.bass, mids: this.audioEnv.mids, highs: this.audioEnv.highs, energy: this.audioEnv.energy }
    }

    protected draw(context: PublicAnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w < 16 || h < 16) return

      const elapsed = context.shared.time.elapsed
      const deltaMs = Math.min(32, Math.max(8, context.shared.time.delta || 16))

      const rawAudio = this.readAudio(context)
      this.audioEnv = updateAudioEnvelope(this.audioEnv, rawAudio, deltaMs)
      const audio = this.sceneAudio(rawAudio)
      const reduced = context.shared.reducedMotion
      const layoutKey = `${w}|${h}`

      this.cameraRig = updateCameraRig(
        this.cameraRig, elapsed, w, h, this.grid.size, this.audioEnv, reduced, deltaMs,
      )
      const cam = this.cameraRig.display

      this.director = updateDirector(this.director, deltaMs, rawAudio, reduced)
      this.train = updateTrain(this.train, deltaMs, this.director.train)
      const trafficBoost = this.director.loopT >= 8_000 && this.director.loopT < 20_000 ? 0.5 : 0
      updateTraffic(this.cars, this.grid, deltaMs, trafficBoost)
      if (!reduced && context.shared.particleScale > 0) {
        updateHumanDrama(this.humanDrama, {
          grid: this.grid,
          audio: { ...audio, beat: rawAudio.beat, chaos: rawAudio.chaos },
          director: this.director,
          deltaMs,
          reducedMotion: reduced,
        })
      }

      this.beatCooldownMs = Math.max(0, this.beatCooldownMs - deltaMs)
      const horizonY = h * 0.34
      const cityGlow = audio.energy + audio.bass * 0.5 + this.director.neonSurge * 0.35

      drawSky(this.ctx, w, h, elapsed, horizonY, {
        cityGlow,
        neonSurge: this.director.neonSurge,
        moonCover: this.director.moonCover,
      }, reduced)
      drawCity(
        this.ctx, this.grid, cam, w, h, this.pixelRatio, layoutKey,
        elapsed, audio, reduced, this.director,
      )
      drawHeroLandmarks(this.ctx, this.grid, cam, elapsed, reduced)
      drawLocalizedEvents(this.ctx, this.grid, cam, w, h, this.director, elapsed, reduced)
      drawWaterfrontLandmarks(this.ctx, this.grid.landmarks, cam, elapsed, reduced)
      drawStreetFurniture(this.ctx, this.grid.streetProps, cam, elapsed, reduced)
      drawIndustrialVents(this.ctx, this.grid, cam, w, h, elapsed, reduced, context.shared.particleScale)
      drawTrain(this.ctx, this.grid, cam, this.train)
      drawTraffic(this.ctx, this.cars, cam)
      if (!reduced && context.shared.particleScale > 0) {
        drawHumanDrama(this.ctx, this.humanDrama, this.grid, cam, elapsed, { ...audio, beat: rawAudio.beat, chaos: rawAudio.chaos }, reduced)
      }
      drawAtmosphere(this.ctx, w, h, elapsed, cityGlow, reduced, context.shared.particleScale)

      const fw = projectTile(this.grid.size - 10, 8, 1.5, cam)
      drawDirectorFx(this.ctx, w, h, this.director, { fireworksX: fw.sx, fireworksY: fw.sy })

      if (!reduced) {
        drawCinematicGrade(this.ctx, w, h, elapsed, {
          neonSurge: this.director.neonSurge,
          energy: audio.energy,
        }, reduced)
      }

      if (this.effects && !reduced && context.shared.particleScale > 0) {
        if (rawAudio.beat && this.beatCooldownMs <= 0) {
          this.effects.triggerScreenPunch(0.12 + audio.bass * 0.18)
          this.beatCooldownMs = 180
        }
        this.effects.update(this.ctx, elapsed, this.pixelRatio)
      }
    }
  }

  return new MetropolisScene()
}

export default metropolisFactory

import CanvasAnimation from '../../core/CanvasAnimation'
import type { PublicAnimationContext } from '../../author/types'
import type { IAnimation } from '../../core/IAnimation'

import { createDirector, drawDirectorFx, updateDirector } from './director/MetropolisDirector'
import { createAudioEnvelope, updateAudioEnvelope } from './motion/audioEnvelope'
import { drawSky } from './render/sky'
import { drawAtmosphere } from './render/atmosphere'
import { drawGraphicNovelPanel } from './render/graphicNovelPanel'
import { drawCinematicGrade } from './render/cinematicGrade'
import type { MetropolisAudio } from './world/types'

export function metropolisFactory(): IAnimation {
  class MetropolisScene extends CanvasAnimation {
    private audioEnv = createAudioEnvelope()
    private director = createDirector()
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
      return {
        ...raw,
        bass: this.audioEnv.bass,
        mids: this.audioEnv.mids,
        highs: this.audioEnv.highs,
        energy: this.audioEnv.energy,
      }
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

      this.director = updateDirector(this.director, deltaMs, rawAudio, reduced)
      this.beatCooldownMs = Math.max(0, this.beatCooldownMs - deltaMs)

      const horizonY = h * 0.32
      const cityGlow = audio.energy + audio.bass * 0.5 + this.director.neonSurge * 0.35

      drawSky(this.ctx, w, h, elapsed, horizonY, {
        cityGlow,
        neonSurge: this.director.neonSurge,
        moonCover: this.director.moonCover,
      }, reduced)

      drawGraphicNovelPanel(
        this.ctx, w, h, elapsed, audio, rawAudio.beat, this.director, reduced,
      )

      drawAtmosphere(this.ctx, w, h, elapsed, cityGlow, reduced, context.shared.particleScale)
      drawDirectorFx(this.ctx, w, h, this.director, { fireworksX: w * 0.82, fireworksY: h * 0.2 })

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

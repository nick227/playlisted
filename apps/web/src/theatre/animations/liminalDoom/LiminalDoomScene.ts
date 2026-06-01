import { AnimationContext, IAnimation } from '../../IAnimation'
import CanvasAnimation from '../../CanvasAnimation'
import { buildWallDecals, queueCorridorDecals, queueWallDecals } from './decals'
import { doorThresholdState, queueDoor } from './doors'
import { LiminalRenderer } from './renderer'
import { queueRoomShell } from './roomShell'
import { composeScene } from './scenes'
import type { AudioReact, RoomPhase, SceneType } from './types'
import { backWallBounds, clamp } from './types'
import { palette } from './palette'

const SCENE_CYCLE: SceneType[] = ['bandStage', 'bar', 'danceFloor', 'conversation', 'hallwayCrowd']
const CYCLE_MS = 10000

function phaseForTime(elapsed: number): RoomPhase {
  const t = (elapsed % CYCLE_MS) / CYCLE_MS
  if (t < 0.35) return 'approach'
  if (t < 0.65) return 'watch'
  if (t < 0.82) return 'threshold'
  if (t < 0.92) return 'passage'
  return 'inhabited'
}

export function liminalDoomFactory(): IAnimation {
  class LiminalDoomScene extends CanvasAnimation {
    private renderer = new LiminalRenderer()
    private decals = buildWallDecals(42, 400, 280)
    private readonly seed = 42

    constructor() {
      super({ defaultOpacity: 1, defaultZIndex: 101, defaultBlendMode: 'normal', useEffects: true })
    }

    private readAudio(context: AnimationContext): AudioReact {
      const { bass, mids, highs } = this.readBands(context)
      const features = context.shared?.features
      const triggers = context.shared?.getTriggers?.('vivid')
      const sensitivity = context.options?.sensitivity ?? 1
      const intensity = context.options?.intensity ?? 1
      return {
        bass: clamp(bass * sensitivity * intensity, 0, 1),
        mids: clamp(mids * sensitivity * intensity * 0.85, 0, 1),
        highs: clamp(highs * sensitivity * intensity * 0.65, 0, 1),
        beat: triggers?.beat ? 1 : clamp((features?.flux.overall ?? 0) * 2, 0, 0.6),
        chaos: triggers?.chaosHit ? 1 : clamp(triggers?.energy ?? 0, 0, 1),
      }
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w < 8 || h < 8) return

      const now = context.shared?.time?.elapsed ?? performance.now()
      const reducedMotion = context.shared?.reducedMotion ?? false
      const lowPower = context.shared?.lowPower ?? false
      const audio = this.readAudio(context)
      const phase = phaseForTime(now)
      const sceneIndex = Math.floor(now / CYCLE_MS) % SCENE_CYCLE.length
      const sceneType = SCENE_CYCLE[sceneIndex]
      const bounds = backWallBounds(w, h)

      this.ctx.fillStyle = palette.void
      this.ctx.fillRect(0, 0, w, h)

      this.renderer.clear()
      queueRoomShell(this.renderer, w, h)
      queueWallDecals(this.renderer, this.decals, bounds.left, bounds.top, audio.highs, 0.07)
      if (phase === 'passage') {
        queueCorridorDecals(this.renderer, this.decals, w * 0.08, h * 0.35, audio.mids)
      }
      composeScene(this.renderer, sceneType, {
        bounds,
        audio,
        phase,
        time: now,
        seed: this.seed + sceneIndex * 17,
        reducedMotion,
        lowPower,
      })
      queueDoor(this.renderer, bounds, doorThresholdState(phase, audio, now))
      this.renderer.sortDrawList()
      this.renderer.render(this.ctx)

      if (this.effects && audio.beat > 0.5 && !reducedMotion) {
        this.effects.triggerScreenPunch(Math.min(0.5, audio.bass * 0.4))
      }
    }
  }

  return new LiminalDoomScene()
}

export default liminalDoomFactory

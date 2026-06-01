import { AnimationContext, IAnimation } from '../../IAnimation'
import CanvasAnimation from '../../CanvasAnimation'
import { buildWallDecals, queueCorridorDecals, queueWallDecals } from './decals'
import { doorThresholdState, queueDoor } from './doors'
import { CastDirector } from './castDirector'
import { castSignature, collectSceneCast } from './castSync'
import { PhaseController } from './phases'
import { PostFxController } from './postFx'
import { palette, scenePalettes } from './palette'
import { LiminalRenderer } from './renderer'
import { queueRoomShell } from './roomShell'
import { resolveCastIds } from '../../sceneKit'
import { composeScene } from './scenes'
import { ensureLiminalScenesRegistered } from './registerScenes'
import { createWorld, getRoomAtZ } from './world'
import { advanceWorld } from './world'
import { createAutopilotState, updateAutopilotCamera } from './autopilotCamera'
import type { AudioReact, RoomPhase, SceneType } from './types'
import { backWallBounds, clamp, lerp } from './types'
import type { WallDecalSet } from './decals'

export function liminalDoomFactory(): IAnimation {
  class LiminalDoomScene extends CanvasAnimation {
    private renderer  = new LiminalRenderer()
    private phaseCtrl = new PhaseController()
    private postFx    = new PostFxController()
    private castDir   = new CastDirector()

    private prevTime      = 0
    private castSig       = ''
    private readonly seed = 42

    private world = createWorld({ seed: this.seed })
    private autopilot = createAutopilotState({ seed: this.seed })
    private lastRoomId: string | null = null
    private decalsByRoom = new Map<string, WallDecalSet>()
    private inhabitedUntilMs = 0

    private bobTime = 0
    private swayTime = 0
    private speedFactor = 0

    constructor() {
      super({ defaultOpacity: 1, defaultZIndex: 101, defaultBlendMode: 'normal', useEffects: true })
      ensureLiminalScenesRegistered()
    }

    // ── Audio ───────────────────────────────────────────────────────────────

    private readAudio(context: AnimationContext): AudioReact {
      const { bass, mids, highs } = this.readBands(context)
      const features = context.shared?.features
      const triggers = context.shared?.getTriggers?.('vivid')
      const sensitivity = context.options?.sensitivity ?? 1
      const intensity   = context.options?.intensity   ?? 1
      return {
        bass:  clamp(bass  * sensitivity * intensity,        0, 1),
        mids:  clamp(mids  * sensitivity * intensity * 0.85, 0, 1),
        highs: clamp(highs * sensitivity * intensity * 0.65, 0, 1),
        beat:  triggers?.beat ? 1 : clamp((features?.flux.overall ?? 0) * 2, 0, 0.6),
        chaos: triggers?.chaosHit ? 1 : clamp(triggers?.energy ?? 0, 0, 1),
      }
    }

    private syncCast(sceneType: SceneType, extraCast: ReturnType<typeof resolveCastIds>, seed: number) {
      const members = collectSceneCast(sceneType, extraCast)
      const sig = castSignature(members)
      if (sig === this.castSig) return
      this.castSig = sig
      this.castDir.setCast(members, seed)
    }

    // ── Main draw ───────────────────────────────────────────────────────────

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w < 8 || h < 8) return

      const nowMs = context.shared?.time?.elapsed ?? performance.now()
      const dtMs  = Math.min(nowMs - this.prevTime, 100)
      this.prevTime = nowMs

      const rm = context.shared?.reducedMotion ?? false
      const lp = context.shared?.lowPower      ?? false
      const audio = this.readAudio(context)

      const dtSec = dtMs / 1000
      this.world = advanceWorld(this.world, this.autopilot.camera.position.z)
      this.autopilot = updateAutopilotCamera(this.autopilot, this.world, dtSec, {
        bass: audio.bass,
        mids: audio.mids,
        highs: audio.highs,
        chaos: audio.chaos,
        beat: audio.beat > 0.6,
      })

      const room = getRoomAtZ(this.world, this.autopilot.camera.position.z)
      const sceneType: SceneType = room?.sceneType ?? 'hallwayCrowd'
      const sceneSeed = room?.seed ?? this.seed

      if (room?.id && room.id !== this.lastRoomId) {
        this.lastRoomId = room.id
        this.phaseCtrl.reset(sceneType, nowMs, sceneSeed)
        this.castDir.dissolveAll()
        this.castSig = ''
        this.inhabitedUntilMs = 0
      }

      const apPhase = this.autopilot.phase
      let phase: RoomPhase = apPhase
      if (apPhase === 'passage') {
        // Brief inhabited tail after passage so crowd scenes can swell.
        if (this.inhabitedUntilMs === 0) this.inhabitedUntilMs = nowMs + 1800
        if (nowMs < this.inhabitedUntilMs) phase = 'inhabited'
      } else {
        this.inhabitedUntilMs = 0
      }

      const pfBase = this.phaseCtrl.tick(nowMs, audio, rm)
      const pf = { ...pfBase, phase }
      this.postFx.tick(audio, pf.phase, rm, dtMs)

      if (!rm && audio.chaos > 0.7) this.postFx.triggerShake(audio.chaos - 0.5)
      if (!rm && audio.beat > 0.5)  this.postFx.triggerBeatPunch(audio.bass)

      const { x: sx, y: sy } = this.postFx.getShakeOffset()
      const bounds = backWallBounds(w, h)

      // Clear
      this.ctx.fillStyle = palette.void
      this.ctx.fillRect(0, 0, w, h)

      // Update camera bobbing & sway
      this.tickBobbing(dtMs, pf.phase, audio, rm)
      const bob = this.getBobbingOffset(rm)

      // Save context for bobbing + shaking scene translation
      this.ctx.save()

      // Apply bobbing & shaking translations (no room roll/tilt)
      this.ctx.translate(bob.x + sx, bob.y + sy)

      // Renderer pass
      this.renderer.clear()
      queueRoomShell(this.renderer, w, h, sceneType, sceneSeed)
      const roomKey = room?.id ?? 'fallback'
      let decals = this.decalsByRoom.get(roomKey)
      if (!decals) {
        decals = buildWallDecals(sceneSeed, 400, 280)
        this.decalsByRoom.set(roomKey, decals)
      }
      // Cull decal cache to rooms that still exist in-world (avoid unbounded growth).
      if (this.decalsByRoom.size > this.world.rooms.length + 3) {
        const keep = new Set(this.world.rooms.map((r) => r.id))
        keep.add('fallback')
        for (const key of this.decalsByRoom.keys()) {
          if (!keep.has(key)) this.decalsByRoom.delete(key)
        }
      }
      queueWallDecals(this.renderer, decals, bounds.left, bounds.top, audio.highs, 0.07)
      if (pf.phase === 'passage') {
        queueCorridorDecals(this.renderer, decals, w * 0.08, h * 0.35, audio.mids)
      }
      const extraCast = (pf.phase === 'threshold' || pf.phase === 'passage')
        ? resolveCastIds(['liminal.doorWhisper'])
        : []
      this.syncCast(sceneType, extraCast, sceneSeed)
      composeScene(this.renderer, sceneType, {
        bounds,
        audio,
        phase: pf.phase,
        time: nowMs,
        seed: sceneSeed,
        reducedMotion: rm,
        lowPower: lp,
      }, extraCast)
      queueDoor(this.renderer, bounds, doorThresholdState(pf.phase, audio, nowMs))
      this.renderer.sortDrawList()
      this.renderer.render(this.ctx)

      if (!lp) {
        this.castDir.tick(dtMs, nowMs, audio, pf.phase, rm)
        this.castDir.draw(this.ctx, nowMs, bounds, audio)
      }

      // Restore scene context - return to steady screen-space
      this.ctx.restore()

      // Phase one: no HUD / weapon viewmodel.

      // Scene ambient tint
      if (!lp && sceneType in scenePalettes) {
        const sp = scenePalettes[sceneType as keyof typeof scenePalettes]
        this.postFx.applySceneAmbient(this.ctx, w, h, sp.accent, pf.intensity * 0.5)
      }

      // Post-render overlays (bloom, vignette, punch)
      this.postFx.applyOverlays(this.ctx, w, h, rm)

      // VoidBloom collapse
      if (pf.inVoidBloom && !rm) {
        this.postFx.applyVoidBloom(this.ctx, w, h, pf.voidBloomT)
        this.castDir.dissolveAll()
      }

      // EffectsManager passthrough (screen punch particle burst)
      if (this.effects && audio.beat > 0.65 && !rm) {
        this.effects.triggerScreenPunch(Math.min(0.4, audio.bass * 0.35))
      }
    }

    private tickBobbing(dtMs: number, phase: RoomPhase, audio: AudioReact, rm: boolean) {
      let targetSpeed = 0
      if (phase === 'approach') {
        targetSpeed = 1.0 + audio.bass * 0.4
      } else if (phase === 'passage') {
        targetSpeed = 2.2 + audio.chaos * 0.8
      } else if (phase === 'threshold') {
        targetSpeed = 0.4
      } else if (phase === 'watch') {
        targetSpeed = 0.08
      }

      if (rm) targetSpeed *= 0.3
      this.speedFactor = lerp(this.speedFactor, targetSpeed, 0.1)

      this.bobTime += dtMs * (rm ? 0.003 : 0.007) * this.speedFactor
      this.swayTime += dtMs * (rm ? 0.0015 : 0.0035) * this.speedFactor
    }

    private getBobbingOffset(rm: boolean) {
      if (this.speedFactor < 0.01) return { x: 0, y: 0 }
      return {
        x: Math.sin(this.swayTime) * (rm ? 1.5 : 6) * this.speedFactor,
        y: Math.abs(Math.cos(this.bobTime)) * -(rm ? 1.2 : 5) * this.speedFactor,
      }
    }
  }

  return new LiminalDoomScene()
}

export default liminalDoomFactory

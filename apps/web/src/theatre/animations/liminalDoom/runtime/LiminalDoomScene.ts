import { AnimationContext, IAnimation } from '../../../core/IAnimation'
import CanvasAnimation from '../../../core/CanvasAnimation'
import { buildWallDecals, queueCorridorDecals, queueWallDecals } from '../room/decals'
import { doorThresholdState, queueDoor } from '../room/doors'
import { CastDirector } from '../cast/director'
import { castSignature, collectSceneCast } from '../cast/sync'
import { PhaseController } from './phases'
import { PostFxController } from './postFx'
import { palette, scenePalettes } from '../core/palette'
import { LiminalRenderer } from '../render/renderer'
import { queueRoomShell } from '../room/shell'
import { resolveCastIds } from '../../../sceneKit'
import { composeScene } from '../scenes/compose'
import { ensureLiminalScenesRegistered } from '../scenes/register'
import { createWorld, getRoomAtZ } from '../world/world'
import { advanceWorld } from '../world/world'
import { createAutopilotState, updateAutopilotCamera } from '../world/autopilotCamera'
import { CameraBobbing } from './bobbing'
import type { AudioMotionInput, AudioReact, RoomPhase, SceneType } from '../core/types'
import { backWallBounds, clamp } from '../core/math'
import type { WallDecalSet } from '../room/decals'

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

    private bobbing = new CameraBobbing()
    private _audioReact: AudioReact = { bass: 0, mids: 0, highs: 0, beat: 0, chaos: 0 }
    private _audioMotion: AudioMotionInput = { bass: 0, mids: 0, highs: 0, chaos: 0, beat: false }

    constructor() {
      super({ defaultOpacity: 1, defaultZIndex: 101, defaultBlendMode: 'normal', useEffects: true })
      ensureLiminalScenesRegistered()
    }

    // ── Audio ───────────────────────────────────────────────────────────────

    private readAudio(context: AnimationContext): AudioReact {
      const bands = this.readBands(context)
      const features = context.shared?.features
      const triggers = context.shared?.getTriggers?.('vivid')
      const sensitivity = context.options?.sensitivity ?? 1
      const intensity = context.options?.intensity ?? 1
      this._audioReact.bass = clamp(bands.bass * sensitivity * intensity, 0, 1)
      this._audioReact.mids = clamp(bands.mids * sensitivity * intensity * 0.85, 0, 1)
      this._audioReact.highs = clamp(bands.highs * sensitivity * intensity * 0.65, 0, 1)
      this._audioReact.beat = triggers?.beat ? 1 : clamp((features?.flux.overall ?? 0) * 2, 0, 0.6)
      this._audioReact.chaos = triggers?.chaosHit ? 1 : clamp(triggers?.energy ?? 0, 0, 1)
      return this._audioReact
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
      this._audioMotion.bass = audio.bass
      this._audioMotion.mids = audio.mids
      this._audioMotion.highs = audio.highs
      this._audioMotion.chaos = audio.chaos
      this._audioMotion.beat = audio.beat > 0.6
      updateAutopilotCamera(this.autopilot, this.world, dtSec, this._audioMotion)

      const room = getRoomAtZ(this.world, this.autopilot.camera.position.z)
      // venueType drives background geometry; castType drives which characters appear.
      // They are generated independently so a bar background can host dancers,
      // a band stage can have hallway watchers, etc. — 25 combinations from 5 types.
      const venueType: SceneType = room?.sceneType ?? 'hallwayCrowd'
      const castType:  SceneType = room?.castType  ?? venueType
      const sceneSeed = room?.seed ?? this.seed

      if (room?.id && room.id !== this.lastRoomId) {
        this.lastRoomId = room.id
        this.phaseCtrl.reset(venueType, nowMs, sceneSeed)
        this.castDir.dissolveAll()
        this.castSig = ''
        this.inhabitedUntilMs = 0
      }

      const apPhase = this.autopilot.phase
      const inPassage = apPhase === 'passage'
      let phase: RoomPhase = apPhase
      if (inPassage) {
        if (this.inhabitedUntilMs === 0) this.inhabitedUntilMs = nowMs + 1800
        if (nowMs < this.inhabitedUntilMs) phase = 'inhabited'
      } else {
        this.inhabitedUntilMs = 0
      }

      const pf = this.phaseCtrl.tick(nowMs, audio, rm)
      pf.phase = phase
      this.postFx.tick(audio, pf.phase, rm, dtMs)

      if (!rm && audio.chaos > 0.7) this.postFx.triggerShake(audio.chaos - 0.5)
      if (!rm && audio.beat > 0.5)  this.postFx.triggerBeatPunch(audio.bass)

      const { x: sx, y: sy } = this.postFx.getShakeOffset()
      const bounds = backWallBounds(w, h)

      // Clear
      this.ctx.fillStyle = palette.void
      this.ctx.fillRect(0, 0, w, h)

      // Update camera bobbing & sway
      this.bobbing.tick(dtMs, pf.phase, audio, rm)
      const bob = this.bobbing.offset(rm)

      // Save context for bobbing + shaking scene translation
      this.ctx.save()
      this.ctx.translate(bob.x + sx, bob.y + sy)

      // Renderer pass
      this.renderer.clear()

      // During passage the room shell draws bare (no floor/wall/ceiling patterns)
      // so the transition feels like a featureless connecting corridor.
      queueRoomShell(this.renderer, w, h, inPassage ? undefined : venueType, sceneSeed)

      const roomKey = room?.id ?? 'fallback'
      let decals = this.decalsByRoom.get(roomKey)
      if (!decals) {
        decals = buildWallDecals(sceneSeed, 400, 280)
        this.decalsByRoom.set(roomKey, decals)
      }
      if (this.decalsByRoom.size > this.world.rooms.length + 3) {
        const keep = new Set(this.world.rooms.map((r) => r.id))
        keep.add('fallback')
        for (const key of this.decalsByRoom.keys()) if (!keep.has(key)) this.decalsByRoom.delete(key)
      }

      queueWallDecals(this.renderer, decals, bounds.left, bounds.top, audio.highs, 0.07)
      if (inPassage) {
        queueCorridorDecals(this.renderer, decals, w * 0.08, h * 0.35, audio.mids)
      }

      const extraCast = (pf.phase === 'threshold' || pf.phase === 'passage')
        ? resolveCastIds(['liminal.doorWhisper'])
        : []

      // Venue furniture (speakers, counter, etc.) from venueType.
      // Cast (characters) from castType — independent.
      if (!inPassage) {
        composeScene(this.renderer, venueType, {
          bounds, audio, phase: pf.phase, time: nowMs,
          seed: sceneSeed, reducedMotion: rm, lowPower: lp,
        }, extraCast)
      }
      this.syncCast(castType, extraCast, sceneSeed)

      queueDoor(this.renderer, bounds, doorThresholdState(pf.phase, audio, nowMs))
      this.renderer.sortDrawList()
      this.renderer.render(this.ctx)

      if (!lp) {
        this.castDir.tick(dtMs, nowMs, audio, pf.phase, rm)
        this.castDir.draw(this.ctx, nowMs, bounds, audio)
      }

      // Restore scene context
      this.ctx.restore()

      // Phase one: no HUD / weapon viewmodel.

      // Scene ambient tint
      if (!lp && venueType in scenePalettes) {
        const sp = scenePalettes[venueType as keyof typeof scenePalettes]
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

  }

  return new LiminalDoomScene()
}

export default liminalDoomFactory

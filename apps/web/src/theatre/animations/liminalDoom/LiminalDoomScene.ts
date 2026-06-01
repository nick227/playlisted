import { AnimationContext, IAnimation } from '../../IAnimation'
import CanvasAnimation from '../../CanvasAnimation'
import { buildWallDecals, queueCorridorDecals, queueWallDecals } from './decals'
import { doorThresholdState, queueDoor } from './doors'
import { drawFace, FaceCacheEntry } from './faces'
import type { FaceConfig } from './faces'
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
import type { AudioReact, RoomPhase, SceneType } from './types'
import { backWallBounds, clamp, lerp } from './types'

const SCENE_CYCLE: SceneType[] = ['bandStage', 'bar', 'danceFloor', 'conversation', 'hallwayCrowd']
const SCENE_ROTATE_MS = 16000

export function liminalDoomFactory(): IAnimation {
  class LiminalDoomScene extends CanvasAnimation {
    private renderer  = new LiminalRenderer()
    private decals    = buildWallDecals(42, 400, 280)
    private phaseCtrl = new PhaseController()
    private postFx    = new PostFxController()
    private castDir   = new CastDirector()

    private sceneIndex    = 0
    private lastSceneIdx  = -1
    private prevTime      = 0
    private castSig       = ''
    private readonly seed = 42

    // ── FPS Game Emulation Fields ───────────────────────────────────────────
    private bobTime = 0
    private swayTime = 0
    private speedFactor = 0
    private health = 100
    private lastBeatPunchTime = 0
    private weaponRecoil = 0
    private mugshotConfig: FaceConfig = {
      state: 'idle',
      talkLevel: 0,
      trackX: 0,
      trackY: 0,
      distort: 0,
      dissolveAlpha: 1,
      fragmentLevel: 0,
      seed: 1337,
    }
    private mugshotCache = new FaceCacheEntry(64)

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

    // ── Scene rotation ──────────────────────────────────────────────────────

    private updateScene(nowMs: number) {
      const idx = Math.floor(nowMs / SCENE_ROTATE_MS) % SCENE_CYCLE.length
      if (idx === this.lastSceneIdx) return
      this.lastSceneIdx = idx
      this.sceneIndex   = idx
      this.phaseCtrl.reset(SCENE_CYCLE[idx], nowMs, this.seed + idx * 17)
      this.castDir.dissolveAll()
      this.castSig = ''
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

      this.updateScene(nowMs)
      const sceneType = SCENE_CYCLE[this.sceneIndex]

      const pf = this.phaseCtrl.tick(nowMs, audio, rm)
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

      // Trigger weapon fire on beat
      if (audio.beat > 0.62 && nowMs - this.lastBeatPunchTime > 220) {
        this.weaponRecoil = 1.0
        this.lastBeatPunchTime = nowMs
      }

      // Save context for bobbing + shaking scene translation
      this.ctx.save()

      // Apply bobbing & shaking translations
      this.ctx.translate(bob.x + sx, bob.y + sy)
      if (bob.roll !== 0) {
        const cx = w * 0.5
        const cy = h * 0.44
        this.ctx.translate(cx, cy)
        this.ctx.rotate(bob.roll)
        this.ctx.translate(-cx, -cy)
      }

      // Renderer pass
      const sceneSeed = this.seed + this.sceneIndex * 17
      this.renderer.clear()
      queueRoomShell(this.renderer, w, h, sceneType, sceneSeed)
      queueWallDecals(this.renderer, this.decals, bounds.left, bounds.top, audio.highs, 0.07)
      if (pf.phase === 'passage') {
        queueCorridorDecals(this.renderer, this.decals, w * 0.08, h * 0.35, audio.mids)
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

      // Draw HUD elements (if not in low power/minimal display)
      if (!lp) {
        this.drawCrosshair(w, h, audio)
        this.drawWeaponViewmodel(w, h, audio, nowMs)
        this.drawFPSHUD(w, h, pf.phase, audio, nowMs)
      }

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

    // ── FPS Emulation Helpers ────────────────────────────────────────────────
    
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
      if (this.speedFactor < 0.01) return { x: 0, y: 0, roll: 0 }
      return {
        x: Math.sin(this.swayTime) * (rm ? 1.5 : 6) * this.speedFactor,
        y: Math.abs(Math.cos(this.bobTime)) * -(rm ? 1.2 : 5) * this.speedFactor,
        roll: rm ? 0 : Math.sin(this.swayTime) * 0.012 * this.speedFactor,
      }
    }

    private drawCrosshair(w: number, h: number, audio: AudioReact) {
      const cx = w * 0.5
      const cy = h * 0.44
      const gap = 4 + audio.bass * 12
      const size = 6

      this.ctx.strokeStyle = 'rgba(232, 176, 80, 0.75)'
      this.ctx.lineWidth = 1.2

      this.ctx.beginPath()
      this.ctx.moveTo(cx, cy - gap - size); this.ctx.lineTo(cx, cy - gap)
      this.ctx.moveTo(cx, cy + gap); this.ctx.lineTo(cx, cy + gap + size)
      this.ctx.moveTo(cx - gap - size, cy); this.ctx.lineTo(cx - gap, cy)
      this.ctx.moveTo(cx + gap, cy); this.ctx.lineTo(cx + gap + size, cy)
      this.ctx.stroke()

      this.ctx.fillStyle = 'rgba(160, 56, 120, 0.85)'
      this.ctx.beginPath()
      this.ctx.arc(cx, cy, 1.5, 0, Math.PI * 2)
      this.ctx.fill()
    }

    private drawWeaponViewmodel(w: number, h: number, audio: AudioReact, nowMs: number) {
      const hudHeight = Math.max(45, h * 0.09)
      const bottomY = h - hudHeight

      this.weaponRecoil = Math.max(0, this.weaponRecoil - 0.15)
      const rx = -this.weaponRecoil * 15
      const ry = this.weaponRecoil * 18

      const speed = this.speedFactor
      const swayX = Math.sin(this.swayTime - 0.35) * 5 * speed + rx
      const swayY = Math.abs(Math.cos(this.bobTime - 0.35)) * -4 * speed + ry

      const gunW = Math.max(70, w * 0.18)
      const gunH = Math.max(90, h * 0.25)
      const gunX = w * 0.78 + swayX
      const gunY = bottomY + swayY - gunH * 0.85

      this.ctx.save()

      if (audio.beat > 0.6 && this.weaponRecoil > 0.5) {
        const flashX = gunX - gunW * 0.3
        const flashY = gunY + gunH * 0.12
        const r = 25 + audio.bass * 30
        const g = this.ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, r)
        g.addColorStop(0, 'rgba(255, 240, 200, 0.95)')
        g.addColorStop(0.3, 'rgba(196, 138, 58, 0.7)')
        g.addColorStop(1, 'rgba(196, 138, 58, 0)')
        this.ctx.fillStyle = g
        this.ctx.beginPath()
        this.ctx.arc(flashX, flashY, r, 0, Math.PI * 2)
        this.ctx.fill()

        this.ctx.strokeStyle = '#e8b050'
        this.ctx.lineWidth = 3
        this.ctx.beginPath()
        this.ctx.moveTo(flashX, flashY)
        this.ctx.lineTo(w * 0.5, h * 0.44)
        this.ctx.stroke()
      }

      this.ctx.fillStyle = '#1c1824'
      this.ctx.strokeStyle = '#3e3848'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(gunX, gunY + gunH * 0.1)
      this.ctx.lineTo(gunX - gunW * 0.4, gunY + gunH * 0.1)
      this.ctx.lineTo(gunX - gunW * 0.4, gunY + gunH * 0.28)
      this.ctx.lineTo(gunX, gunY + gunH * 0.32)
      this.ctx.lineTo(gunX + gunW * 0.4, gunY + gunH * 0.5)
      this.ctx.lineTo(gunX + gunW * 0.5, gunY + gunH * 1.1)
      this.ctx.lineTo(gunX - gunW * 0.1, gunY + gunH * 1.1)
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.stroke()

      this.ctx.fillStyle = '#211e2a'
      this.ctx.beginPath()
      this.ctx.moveTo(gunX - gunW * 0.1, gunY + gunH * 0.35)
      this.ctx.lineTo(gunX + gunW * 0.3, gunY + gunH * 0.48)
      this.ctx.lineTo(gunX + gunW * 0.35, gunY + gunH * 0.9)
      this.ctx.lineTo(gunX - gunW * 0.05, gunY + gunH * 0.9)
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.stroke()

      this.ctx.strokeStyle = audio.beat > 0.5 ? '#a03878' : '#602040'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.moveTo(gunX - gunW * 0.15, gunY + gunH * 0.22)
      this.ctx.lineTo(gunX + gunW * 0.2, gunY + gunH * 0.36)
      this.ctx.stroke()

      const scrX = gunX + gunW * 0.1
      const scrY = gunY + gunH * 0.55
      const scrR = Math.max(12, gunW * 0.18)

      this.ctx.fillStyle = '#08080c'
      this.ctx.beginPath()
      this.ctx.arc(scrX, scrY, scrR, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.strokeStyle = '#c48a3a'
      this.ctx.lineWidth = 1.5
      this.ctx.stroke()

      this.ctx.strokeStyle = 'rgba(58,120,136,0.12)'
      this.ctx.lineWidth = 0.5
      this.ctx.beginPath(); this.ctx.moveTo(scrX, scrY - scrR); this.ctx.lineTo(scrX, scrY + scrR); this.ctx.stroke()
      this.ctx.beginPath(); this.ctx.moveTo(scrX - scrR, scrY); this.ctx.lineTo(scrX + scrR, scrY); this.ctx.stroke()

      this.ctx.strokeStyle = '#3a7888'
      this.ctx.lineWidth = 1
      this.ctx.beginPath()
      const samples = 16
      const freq = 1.5 + audio.mids * 3
      const amp = scrR * 0.4 * (0.2 + audio.highs * 0.8)
      for (let i = 0; i <= samples; i++) {
        const sx = scrX - scrR + (i / samples) * scrR * 2
        const dx = sx - scrX
        const maxH = Math.sqrt(Math.max(0, scrR * scrR - dx * dx)) * 0.85
        const angle = (i / samples) * Math.PI * 2 * freq + nowMs * 0.015
        const dy = Math.sin(angle) * amp
        const sy = scrY + clamp(dy, -maxH, maxH)
        if (i === 0) this.ctx.moveTo(sx, sy)
        else this.ctx.lineTo(sx, sy)
      }
      this.ctx.stroke()

      this.ctx.restore()
    }

    private drawFPSHUD(w: number, h: number, phase: RoomPhase, audio: AudioReact, nowMs: number) {
      const hudHeight = Math.max(45, h * 0.09)
      const hudY = h - hudHeight

      this.ctx.fillStyle = '#161220'
      this.ctx.fillRect(0, hudY, w, hudHeight)

      this.ctx.strokeStyle = '#c48a3a'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.moveTo(0, hudY); this.ctx.lineTo(w, hudY)
      this.ctx.stroke()

      const colWidth = w / 4
      this.ctx.strokeStyle = 'rgba(196,138,58,0.25)'
      this.ctx.lineWidth = 1.5
      for (let i = 1; i < 4; i++) {
        const cx = colWidth * i
        this.ctx.beginPath(); this.ctx.moveTo(cx, hudY); this.ctx.lineTo(cx, h); this.ctx.stroke()
      }

      if (audio.chaos > 0.72 && Math.random() > 0.6) {
        this.health = Math.max(12, this.health - Math.floor(Math.random() * 4))
      } else if (audio.beat > 0.8 && Math.random() > 0.8) {
        this.health = Math.max(15, this.health - 2)
      } else if (Math.random() > 0.99) {
        this.health = Math.min(100, this.health + 1)
      }

      const hpY = hudY + hudHeight * 0.4
      this.ctx.fillStyle = '#7a6878'
      this.ctx.font = '9px monospace'
      this.ctx.fillText('HEALTH', 12, hpY)
      this.ctx.fillStyle = this.health < 30 ? '#a03878' : '#e8b050'
      this.ctx.font = 'bold 18px monospace'
      this.ctx.fillText(`${this.health}%`, 12, hpY + hudHeight * 0.42)

      this.mugshotConfig.state = phase === 'voidBloom' ? 'dissolving' : (audio.beat > 0.65 ? 'talking' : 'watching')
      this.mugshotConfig.talkLevel = lerp(this.mugshotConfig.talkLevel, audio.mids * 0.8, 0.2)
      if (Math.random() > 0.96) {
        this.mugshotConfig.trackX = (Math.random() - 0.5) * 1.5
        this.mugshotConfig.trackY = (Math.random() - 0.5) * 1.0
      }
      this.mugshotConfig.distort = lerp(this.mugshotConfig.distort, audio.chaos * 0.5 + (this.health < 30 ? 0.3 : 0), 0.1)
      this.mugshotConfig.dissolveAlpha = phase === 'voidBloom' ? 0.5 + Math.sin(nowMs * 0.05) * 0.5 : 1

      const faceCenterX = colWidth * 1.5
      const faceCenterY = hudY + hudHeight * 0.5
      const faceScale = Math.min(hudHeight * 0.35, 18)

      this.ctx.fillStyle = '#08080c'
      this.ctx.fillRect(faceCenterX - faceScale * 1.6, hudY + 4, faceScale * 3.2, hudHeight - 8)
      this.ctx.strokeStyle = '#c48a3a'
      this.ctx.lineWidth = 1
      this.ctx.strokeRect(faceCenterX - faceScale * 1.6, hudY + 4, faceScale * 3.2, hudHeight - 8)

      drawFace(this.ctx, faceCenterX, faceCenterY, faceScale, this.mugshotConfig, this.mugshotCache)

      const sigX = colWidth * 2 + 12
      const barMaxW = colWidth - 24
      const barH = Math.max(3, hudHeight * 0.08)
      const sigY = hudY + hudHeight * 0.28

      this.ctx.fillStyle = '#7a6878'
      this.ctx.font = '8px monospace'
      this.ctx.fillText('SIGNAL MONITOR', sigX, sigY - 2)

      const bands = [
        { label: 'BASS', val: audio.bass, col: '#e8b050' },
        { label: 'MIDS', val: audio.mids, col: '#a03878' },
        { label: 'HIGH', val: audio.highs, col: '#3a7888' },
      ]
      bands.forEach((b, idx) => {
        const y = sigY + idx * (barH + 4)
        this.ctx.fillStyle = '#08080c'; this.ctx.fillRect(sigX, y, barMaxW, barH)
        this.ctx.fillStyle = b.col; this.ctx.fillRect(sigX, y, barMaxW * b.val, barH)
      })

      const locX = colWidth * 3 + 12
      const locY = hudY + hudHeight * 0.4
      this.ctx.fillStyle = '#7a6878'
      this.ctx.font = '8px monospace'
      this.ctx.fillText('LOCATION BEACON', locX, locY)

      const sceneNames: Record<string, string> = {
        bandStage: 'LIVE AREA',
        bar: 'THE RECTOR',
        danceFloor: 'STROBE CHAMBER',
        conversation: 'THE WHISPER',
        hallwayCrowd: 'THE TRANSIT',
      }
      const sceneType = SCENE_CYCLE[this.sceneIndex]
      const locName = sceneNames[sceneType] ?? 'UNKNOWN AREA'
      this.ctx.fillStyle = '#3a7888'
      this.ctx.font = 'bold 11px monospace'
      let displayName = locName
      if (audio.chaos > 0.7 && Math.random() > 0.7) {
        displayName = locName.split('').map(c => Math.random() > 0.6 ? '?' : c).join('')
      }
      this.ctx.fillText(displayName, locX, locY + hudHeight * 0.35)
    }
  }

  return new LiminalDoomScene()
}

export default liminalDoomFactory

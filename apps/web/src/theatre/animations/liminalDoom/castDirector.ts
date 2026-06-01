import type { CastMemberDef, StageRect } from '../../sceneKit'
import { placementToXY } from '../../sceneKit'
import type { AudioReact, BackWallBounds, RoomPhase } from './types'
import { clamp, hash01, lerp } from './types'
import {
  drawStyledBody, headAnchor, resolveBodyStyle, resolveGender,
} from './bodies'
import type { BodyLook, CastActivity } from './bodies'
import {
  drawFace, FaceCacheEntry, idleBreath, watchingGaze, tickDissolve,
} from './faces'
import type { FaceConfig, FaceState } from './faces'
import {
  PhraseTicker, drawPhraseState, pickFormat, pickPhraseFromBank,
} from './phrases'
import type { PhraseTickState } from './phrases'

type MemberRuntime = {
  def: CastMemberDef
  look: BodyLook
  config: FaceConfig
  cache: FaceCacheEntry
  phrase: PhraseTicker | null
  phraseState: PhraseTickState | null
  appeared: boolean
  dissolving: boolean
  speakArmed: boolean
  speakDelayLeft: number
  phraseUsed: boolean
  glanceX: number
  glanceY: number
  wanderAmp: number
}

export class CastDirector {
  private members: MemberRuntime[] = []
  private seed = 0
  private speakerNx = 0.5

  setCast(members: readonly CastMemberDef[], seed: number) {
    this.seed = seed
    const next: MemberRuntime[] = []
    for (let i = 0; i < members.length; i++) {
      const def = members[i]
      const existing = this.members.find((m) => m.def.id === def.id)
      if (existing) {
        existing.def = { ...def, role: def.role ?? existing.def.role, faceLayer: 'studio' }
        existing.look = bodyLookFromDef(def, this.seed, i)
        next.push(existing)
      } else {
        next.push(this.spawnMember(def, i))
      }
    }
    this.members = next.sort((a, b) => (a.def.placement.z ?? 0.5) - (b.def.placement.z ?? 0.5))
    const speaker = members.find((m) => m.role === 'speaker' || m.speaks)
    this.speakerNx = speaker?.placement.nx ?? 0.5
  }

  dissolveAll() {
    for (const m of this.members) {
      if (m.appeared && !m.dissolving) m.dissolving = true
      m.phrase?.dissolveNow()
    }
  }

  tick(
    dtMs: number,
    nowMs: number,
    audio: AudioReact,
    phase: RoomPhase,
    reducedMotion: boolean,
  ) {
    const show = !reducedMotion && phase !== 'passage' && phase !== 'voidBloom'
    const allowSpeech = phase === 'watch' || phase === 'threshold'

    for (const m of this.members) {
      this.tickMember(m, dtMs, nowMs, audio, phase, show, allowSpeech)
      if (m.phrase && !m.phrase.isDone) {
        m.phraseState = m.phrase.tick(dtMs, audio.mids, audio.highs)
      } else {
        m.phraseState = null
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, nowMs: number, bounds: BackWallBounds, audio: AudioReact) {
    const stage = boundsToStage(bounds)
    const stageScale = stage.width / 400

    for (const m of this.members) {
      if (m.config.dissolveAlpha <= 0.01 && !m.dissolving) continue

      const { x, y } = placementToXY(stage, m.def.placement)
      const bodyScale = (m.def.bodyScale ?? m.def.placement.scale) * stageScale
      const energy = activityEnergy(m.look.activity, audio, nowMs, m.look.seed)
      const alpha = (m.def.alpha ?? 1) * m.config.dissolveAlpha

      drawStyledBody(ctx, x, y, bodyScale, m.look, energy, nowMs, m.wanderAmp, alpha)

      if (shouldDrawFace(m.def)) {
        const head = headAnchor(x, y, bodyScale, m.look)
        const faceScale = (m.def.faceScale ?? m.def.placement.scale) * stageScale
        const breathe = m.config.state !== 'dissolving' ? idleBreath(nowMs, m.config.seed) : 1
        drawFace(ctx, head.x, head.y, faceScale * breathe * 0.38, m.config, m.cache)
      }

      if (m.phraseState && m.phraseState.alpha > 0.01) {
        const faceScale = (m.def.faceScale ?? m.def.placement.scale) * stageScale
        const pos = phraseAnchor(stage, m.def, faceScale)
        const tailX = m.def.phraseFormat === 'bubble' ? x : undefined
        drawPhraseState(ctx, m.phraseState, pos.x, pos.y, pos.w, m.config.seed, tailX)
      }
    }
  }

  private spawnMember(def: CastMemberDef, index: number): MemberRuntime {
    const role = def.role ?? (def.speaks ? 'speaker' : 'listener')
    const look = bodyLookFromDef(def, this.seed, index)
    return {
      def: { ...def, role, faceLayer: 'studio', activity: def.activity ?? 'hangOut' },
      look,
      config: {
        state: 'idle',
        talkLevel: 0,
        trackX: def.eyeTrackX ?? 0,
        trackY: def.eyeTrackY ?? 0,
        distort: 0.22 + hash01(this.seed, index * 9) * 0.35,
        dissolveAlpha: 0,
        fragmentLevel: 0,
        seed: this.seed + index * 31,
      },
      cache: new FaceCacheEntry(96),
      phrase: def.speaks ? new PhraseTicker() : null,
      phraseState: null,
      appeared: false,
      dissolving: false,
      speakArmed: false,
      speakDelayLeft: 0,
      phraseUsed: false,
      glanceX: 0,
      glanceY: 0,
      wanderAmp: def.wanderRadius ?? (def.activity === 'wander' ? 0.04 : 0),
    }
  }

  private tickMember(
    m: MemberRuntime,
    dtMs: number,
    nowMs: number,
    audio: AudioReact,
    phase: RoomPhase,
    show: boolean,
    allowSpeech: boolean,
  ) {
    const cfg = m.config
    const def = m.def
    const role = def.role ?? 'listener'
    const isSpeaker = role === 'speaker' || !!def.speaks
    const isListener = role === 'listener' && !def.speaks

    if (phase === 'passage' || phase === 'voidBloom') {
      if (m.appeared && !m.dissolving) m.dissolving = true
      m.phrase?.dissolveNow()
    }

    const fadeMs = def.faceMode === 'dissolving' ? 450 : 900
    if (show && !m.appeared) {
      cfg.dissolveAlpha = clamp(cfg.dissolveAlpha + dtMs / fadeMs, 0, 1)
      if (cfg.dissolveAlpha >= 1) m.appeared = true
    }
    if (!show && m.appeared && !m.dissolving) m.dissolving = true

    if (m.dissolving) {
      const r = tickDissolve(cfg.dissolveAlpha, cfg.fragmentLevel, dtMs, audio.highs)
      cfg.dissolveAlpha = r.dissolveAlpha
      cfg.fragmentLevel = r.fragmentLevel
      if (cfg.dissolveAlpha <= 0) {
        m.dissolving = false
        m.appeared = false
        cfg.fragmentLevel = 0
        m.speakArmed = false
        m.phraseUsed = false
      }
    }

    if (shouldDrawFace(def)) {
      cfg.state = resolveFaceState(def, m.dissolving, isSpeaker, allowSpeech)
      const beatPop = audio.beat > 0.55 ? 0.25 : 0
      if (isSpeaker && allowSpeech) {
        cfg.talkLevel = lerp(cfg.talkLevel, audio.mids * 0.9 + beatPop, 0.15)
      } else if (isListener && this.anyPhraseActive()) {
        cfg.talkLevel = lerp(cfg.talkLevel, audio.mids * 0.15, 0.1)
      } else if (m.look.activity === 'look' || m.look.activity === 'hangOut') {
        cfg.talkLevel = lerp(cfg.talkLevel, audio.bass * 0.12, 0.08)
      } else {
        cfg.talkLevel = lerp(cfg.talkLevel, activityEnergy(m.look.activity, audio, nowMs, m.look.seed) * 0.2, 0.1)
      }
      this.tickGaze(m, nowMs, isListener, isSpeaker)
      cfg.distort = lerp(cfg.distort, 0.2 + audio.highs * 0.4, 0.05)
      if (audio.highs > 0.68) m.cache.markDirty()
    }

    if (m.phrase && !m.phrase.isDone && audio.chaos > 0.72 && audio.highs > 0.55) {
      m.phrase.dissolveNow()
    }

    if (m.phrase && allowSpeech && isSpeaker && !m.phraseUsed && m.appeared) {
      if (!m.speakArmed) {
        m.speakArmed = true
        m.speakDelayLeft = def.speakDelayMs ?? 800
      }
      if (m.speakDelayLeft > 0) m.speakDelayLeft -= dtMs
      else this.startPhrase(m)
    }
  }

  private tickGaze(m: MemberRuntime, nowMs: number, isListener: boolean, isSpeaker: boolean) {
    const cfg = m.config
    const gaze = watchingGaze(nowMs, cfg.seed)
    if (isSpeaker) {
      cfg.trackX = lerp(cfg.trackX, gaze.trackX * 0.9, 0.055)
      cfg.trackY = lerp(cfg.trackY, gaze.trackY * 0.75, 0.055)
      return
    }
    if (isListener && this.anyPhraseActive()) {
      const towardSpeaker = clamp((this.speakerNx - m.def.placement.nx) * 2.2, -1, 1)
      m.glanceX = lerp(m.glanceX, towardSpeaker, 0.07)
      cfg.trackX = lerp(cfg.trackX, m.glanceX, 0.09)
      cfg.trackY = lerp(cfg.trackY, Math.sin(nowMs / 2400) * 0.1, 0.05)
      return
    }
    if (m.look.activity === 'look') {
      cfg.trackX = lerp(cfg.trackX, gaze.trackX, 0.06)
      cfg.trackY = lerp(cfg.trackY, gaze.trackY, 0.06)
      return
    }
    cfg.trackX = lerp(cfg.trackX, (m.def.eyeTrackX ?? 0) + gaze.trackX * 0.35, 0.04)
    cfg.trackY = lerp(cfg.trackY, (m.def.eyeTrackY ?? 0) + gaze.trackY * 0.3, 0.04)
  }

  private startPhrase(m: MemberRuntime) {
    if (!m.phrase || m.phraseUsed) return
    const def = m.def
    const salt = def.phraseSalt ?? 77
    m.phrase.start(
      pickPhraseFromBank(def.phraseBank ?? 'venue', this.seed, salt),
      def.phraseFormat ?? pickFormat(this.seed + salt),
      this.seed + salt,
    )
    m.phraseUsed = true
  }

  private anyPhraseActive(): boolean {
    return this.members.some((m) => m.phrase && !m.phrase.isDone)
  }
}

function shouldDrawFace(def: CastMemberDef): boolean {
  if (def.showFace === true) return true
  if (def.showFace === false) return false
  return !!def.speaks
}

function bodyLookFromDef(def: CastMemberDef, seed: number, index: number): BodyLook {
  return {
    gender: def.gender ?? resolveGender(seed, index + 5),
    style: def.style ?? resolveBodyStyle(seed, index + 7),
    activity: def.activity ?? 'hangOut',
    seed: seed + index * 19,
  }
}

function activityEnergy(act: CastActivity, audio: AudioReact, timeMs: number, seed: number): number {
  switch (act) {
    case 'dance': return clamp(audio.beat * 0.9 + audio.bass * 0.5, 0.2, 1)
    case 'playDrums': return clamp(audio.beat, 0.15, 1)
    case 'playGuitar':
    case 'playBass': return clamp(audio.mids * 0.85 + audio.beat * 0.4, 0.15, 1)
    case 'drink': return 0.25 + Math.sin(timeMs / 1200 + seed) * 0.1
    case 'smoke': return 0.3 + audio.highs * 0.2
    case 'wander': return 0.35 + Math.sin(timeMs / 3000 + seed) * 0.15
    default: return clamp(audio.bass * 0.4 + audio.mids * 0.2, 0.1, 0.7)
  }
}

function resolveFaceState(
  def: CastMemberDef, dissolving: boolean, isSpeaker: boolean, allowSpeech: boolean,
): FaceState {
  if (dissolving || def.faceMode === 'dissolving') return 'dissolving'
  if (isSpeaker && allowSpeech) return 'talking'
  if (def.faceMode === 'idle') return 'idle'
  return 'watching'
}

function boundsToStage(bounds: BackWallBounds): StageRect {
  return {
    left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
    width: bounds.width, height: bounds.height, centerX: bounds.centerX, centerY: bounds.centerY,
  }
}

function phraseAnchor(stage: StageRect, def: CastMemberDef, faceScale: number) {
  const { x, y } = placementToXY(stage, def.placement)
  const w = stage.width * 0.62
  const leftSide = def.placement.nx < 0.52
  return {
    x: leftSide ? stage.left + stage.width * 0.05 : x - w * 0.35,
    y: Math.min(stage.bottom - 6, y + faceScale * 0.5),
    w,
  }
}

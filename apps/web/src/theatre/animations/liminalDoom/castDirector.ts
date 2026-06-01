import type { CastMemberDef, StageRect } from '../../sceneKit'
import { placementToXY } from '../../sceneKit'
import type { AudioReact, BackWallBounds, RoomPhase } from './types'
import { clamp, hash01, lerp } from './types'
import {
  drawFace, FaceCacheEntry, idleBreath, watchingGaze, tickDissolve,
} from './faces'
import type { FaceConfig, FaceState } from './faces'
import {
  PhraseTicker, drawPhraseState, pickFormat, pickPhraseFromBank,
} from './phrases'
import type { PhraseFormat, PhraseTickState } from './phrases'

type MemberRuntime = {
  def: CastMemberDef
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
        next.push(existing)
      } else {
        next.push(this.spawnMember(def, i))
      }
    }
    this.members = next
    const speaker = members.find((m) => m.role === 'speaker' || (m.speaks && m.role !== 'listener'))
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
    const showFaces = !reducedMotion && (phase === 'watch' || phase === 'threshold' || phase === 'inhabited')
    const allowSpeech = phase === 'watch' || phase === 'threshold'

    for (const m of this.members) {
      this.tickMember(m, dtMs, nowMs, audio, phase, showFaces, allowSpeech)
      if (m.phrase && !m.phrase.isDone) {
        m.phraseState = m.phrase.tick(dtMs, audio.mids, audio.highs)
      } else {
        m.phraseState = null
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, nowMs: number, bounds: BackWallBounds) {
    const stage = boundsToStage(bounds)
    for (const m of this.members) {
      if (m.config.dissolveAlpha <= 0.01 && !m.dissolving) continue
      const { x, y, scale } = placementToXY(stage, m.def.placement)
      const breathe = m.config.state !== 'dissolving' ? idleBreath(nowMs, m.config.seed) : 1
      drawFace(ctx, x, y, scale * breathe, m.config, m.cache)

      if (m.phraseState && m.phraseState.alpha > 0.01) {
        const pos = phraseAnchor(stage, m.def, scale)
        const tailX = m.def.phraseFormat === 'bubble' ? x : undefined
        drawPhraseState(ctx, m.phraseState, pos.x, pos.y, pos.w, m.config.seed, tailX)
      }
    }
  }

  private spawnMember(def: CastMemberDef, index: number): MemberRuntime {
    const role = def.role ?? (def.speaks ? 'speaker' : 'listener')
    return {
      def: { ...def, role, faceLayer: 'studio' },
      config: {
        state: 'idle',
        talkLevel: 0,
        trackX: def.eyeTrackX ?? 0,
        trackY: def.eyeTrackY ?? 0,
        distort: 0.25 + hash01(this.seed, index * 9) * 0.45,
        dissolveAlpha: 0,
        fragmentLevel: 0,
        seed: this.seed + index * 31,
      },
      cache: new FaceCacheEntry(128),
      phrase: def.speaks ? new PhraseTicker() : null,
      phraseState: null,
      appeared: false,
      dissolving: false,
      speakArmed: false,
      speakDelayLeft: 0,
      phraseUsed: false,
      glanceX: 0,
      glanceY: 0,
    }
  }

  private tickMember(
    m: MemberRuntime,
    dtMs: number,
    nowMs: number,
    audio: AudioReact,
    phase: RoomPhase,
    showFaces: boolean,
    allowSpeech: boolean,
  ) {
    const cfg = m.config
    const def = m.def
    const role = def.role ?? 'listener'
    const isSpeaker = role === 'speaker'
    const isListener = role === 'listener'

    if (phase === 'passage' || phase === 'voidBloom') {
      if (m.appeared && !m.dissolving) m.dissolving = true
      m.phrase?.dissolveNow()
    }

    const fadeMs = def.faceMode === 'dissolving' ? 500 : 1100
    if (showFaces && !m.appeared) {
      cfg.dissolveAlpha = clamp(cfg.dissolveAlpha + dtMs / fadeMs, 0, 1)
      if (cfg.dissolveAlpha >= 1) m.appeared = true
    }
    if (!showFaces && m.appeared && !m.dissolving) m.dissolving = true

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

    cfg.state = resolveFaceState(def, m.dissolving, isSpeaker, allowSpeech)

    const beatPop = audio.beat > 0.55 ? 0.25 : 0
    if (isSpeaker && allowSpeech) {
      cfg.talkLevel = lerp(cfg.talkLevel, audio.mids * 0.9 + beatPop, 0.15)
    } else if (isListener && this.anyPhraseActive()) {
      cfg.talkLevel = lerp(cfg.talkLevel, audio.mids * 0.18 + beatPop * 0.1, 0.1)
    } else {
      cfg.talkLevel = lerp(cfg.talkLevel, audio.bass * 0.08, 0.08)
    }

    this.tickGaze(m, nowMs, isListener, isSpeaker)
    cfg.distort = lerp(cfg.distort, 0.28 + audio.highs * 0.48 + audio.chaos * 0.22, 0.05)
    if (audio.highs > 0.68) m.cache.markDirty()

    if (m.phrase && !m.phrase.isDone && audio.chaos > 0.72 && audio.highs > 0.55) {
      m.phrase.dissolveNow()
    }

    if (m.phrase && allowSpeech && isSpeaker && !m.phraseUsed && m.appeared) {
      if (!m.speakArmed) {
        m.speakArmed = true
        m.speakDelayLeft = def.speakDelayMs ?? 600
      }
      if (m.speakDelayLeft > 0) {
        m.speakDelayLeft -= dtMs
      } else {
        this.startPhrase(m)
      }
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
      m.glanceY = lerp(m.glanceY, Math.sin(nowMs / 2400) * 0.12, 0.05)
      cfg.trackX = lerp(cfg.trackX, m.glanceX, 0.09)
      cfg.trackY = lerp(cfg.trackY, m.glanceY, 0.09)
      return
    }

    cfg.trackX = lerp(cfg.trackX, (m.def.eyeTrackX ?? 0) + gaze.trackX * 0.4, 0.045)
    cfg.trackY = lerp(cfg.trackY, (m.def.eyeTrackY ?? 0) + gaze.trackY * 0.35, 0.045)
  }

  private startPhrase(m: MemberRuntime) {
    if (!m.phrase || m.phraseUsed) return
    const def = m.def
    const salt = def.phraseSalt ?? 77
    const bank = def.phraseBank ?? 'venue'
    const text = pickPhraseFromBank(bank, this.seed, salt)
    const format: PhraseFormat = def.phraseFormat ?? pickFormat(this.seed + salt)
    m.phrase.start(text, format, this.seed + salt)
    m.phraseUsed = true
  }

  private anyPhraseActive(): boolean {
    return this.members.some((m) => m.phrase && !m.phrase.isDone)
  }
}

function resolveFaceState(
  def: CastMemberDef,
  dissolving: boolean,
  isSpeaker: boolean,
  allowSpeech: boolean,
): FaceState {
  if (dissolving || def.faceMode === 'dissolving') return 'dissolving'
  if (isSpeaker && allowSpeech) return 'talking'
  if (def.faceMode === 'idle') return 'idle'
  return 'watching'
}

function boundsToStage(bounds: BackWallBounds): StageRect {
  return {
    left: bounds.left,
    right: bounds.right,
    top: bounds.top,
    bottom: bounds.bottom,
    width: bounds.width,
    height: bounds.height,
    centerX: bounds.centerX,
    centerY: bounds.centerY,
  }
}

function phraseAnchor(stage: StageRect, def: CastMemberDef, faceScale: number) {
  const { x, y } = placementToXY(stage, def.placement)
  const w = stage.width * 0.62
  const leftSide = def.placement.nx < 0.52
  return {
    x: leftSide ? stage.left + stage.width * 0.05 : x - w * 0.35,
    y: Math.min(stage.bottom - 6, y + faceScale * (leftSide ? 0.95 : 0.75)),
    w,
  }
}

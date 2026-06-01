import type { CastMemberDef, StageRect } from '../../sceneKit'
import { placementToXY } from '../../sceneKit'
import type { AudioReact, BackWallBounds, RoomPhase } from './types'
import { clamp, hash01, lerp } from './types'
import type { CastActivity } from './bodies'
import {
  characterHeadAnchor,
  drawCharacterBody,
  drawCharacterFace,
  recipeDistortBase,
  resolveCharacterFromDef,
} from './character'
import type { ResolvedCharacter } from './character'
import {
  FaceCacheEntry, idleBreath, watchingGaze, tickDissolve,
} from './faces'
import type { FaceConfig, FaceState } from './faces'
import {
  PhraseTicker, drawPhraseState, pickFormat, pickPhraseFromBank,
} from './phrases'
import type { PhraseTickState } from './phrases'

type MemberRuntime = {
  def: CastMemberDef
  character: ResolvedCharacter
  config: FaceConfig
  cache: FaceCacheEntry
  phrase: PhraseTicker | null
  phraseState: PhraseTickState | null
  appeared: boolean
  dissolving: boolean
  speakArmed: boolean
  speakDelayLeft: number
  phraseUsed: boolean
  /** Counts down to 0, then re-arms the speaker. -1 = not counting yet. */
  phraseRepeatCooldown: number
  /** How many times this member has spoken — used to vary phrase salt. */
  phraseCount: number
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
      // Reuse a member only if it's still visible (appeared or dissolving).
      // Fully-dissolved members get a fresh spawn so position jitter and
      // appearance vary on each room visit.
      const reuse = existing && (existing.appeared || existing.dissolving)
      if (reuse && existing) {
        existing.def = { ...def, role: def.role ?? existing.def.role, faceLayer: 'studio' }
        existing.character = resolveCharacterFromDef(existing.def, this.seed, i)
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
      const energy = activityEnergy(m.character.activity, audio, nowMs, m.character.seed)
      const alpha = (m.def.alpha ?? 1) * m.config.dissolveAlpha

      const showFace = shouldDrawFace(m.def)
      drawCharacterBody(ctx, x, y, bodyScale, m.character, energy, nowMs, m.wanderAmp, alpha, !showFace)

      if (showFace) {
        const head = characterHeadAnchor(x, y, bodyScale, m.character)
        // faceScale is expressed as a fraction of back-wall width (e.g. 0.03 = 3%).
        // Default 0.03 gives crowd faces ~27px wide on a 432px stage.
        // Named characters set their own value in CastMemberDef.faceScale.
        const faceR = stage.width * (m.def.faceScale ?? 0.03)
        const breathe = m.config.state !== 'dissolving' ? idleBreath(nowMs, m.config.seed) : 1
        m.config.gender = m.character.gender
        drawCharacterFace(ctx, head.x, head.y, faceR * breathe, m.config, m.character, nowMs, m.cache)
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
    // Jitter crowd/ambient positions per room seed so the same preset
    // looks different each scene cycle. Named/speaker roles are not jittered.
    const isAmbient = role === 'ambient' || (!def.speaks && role !== 'speaker' && role !== 'listener')
    const jx = isAmbient ? (hash01(this.seed, index * 13)     - 0.5) * 0.07 : 0
    const jy = isAmbient ? (hash01(this.seed, index * 13 + 1) - 0.5) * 0.035 : 0
    const jDef: CastMemberDef = isAmbient ? {
      ...def,
      placement: {
        ...def.placement,
        nx: clamp(def.placement.nx + jx, 0.04, 0.96),
        ny: clamp(def.placement.ny + jy, 0.28, 0.97),
      },
    } : def

    const character = resolveCharacterFromDef(
      { ...jDef, role, faceLayer: 'studio', activity: jDef.activity ?? 'hangOut' },
      this.seed,
      index,
    )

    return {
      def: { ...jDef, role, faceLayer: 'studio', activity: jDef.activity ?? 'hangOut' },
      character,
      config: {
        state: 'idle',
        talkLevel: 0,
        trackX: jDef.eyeTrackX ?? 0,
        trackY: jDef.eyeTrackY ?? 0,
        distort: recipeDistortBase(character),
        dissolveAlpha: 0,
        fragmentLevel: 0,
        seed: character.seed,
        gender: character.gender,
      },
      cache: new FaceCacheEntry(96),
      phrase: jDef.speaks ? new PhraseTicker() : null,
      phraseState: null,
      appeared: false,
      dissolving: false,
      speakArmed: false,
      speakDelayLeft: 0,
      phraseUsed: false,
      phraseRepeatCooldown: -1,
      phraseCount: 0,
      glanceX: 0,
      glanceY: 0,
      wanderAmp: jDef.wanderRadius ?? (jDef.activity === 'wander' ? 0.04 : 0),
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
        m.phraseRepeatCooldown = -1
        m.phraseCount = 0
      }
    }

    if (shouldDrawFace(def)) {
      cfg.state = resolveFaceState(def, m.dissolving, isSpeaker, allowSpeech)
      const beatPop = audio.beat > 0.55 ? 0.25 : 0
      if (isSpeaker && allowSpeech) {
        cfg.talkLevel = lerp(cfg.talkLevel, audio.mids * 0.9 + beatPop, 0.15)
      } else if (isListener && this.anyPhraseActive()) {
        cfg.talkLevel = lerp(cfg.talkLevel, audio.mids * 0.15, 0.1)
      } else if (m.character.activity === 'look' || m.character.activity === 'hangOut') {
        cfg.talkLevel = lerp(cfg.talkLevel, audio.bass * 0.12, 0.08)
      } else {
        cfg.talkLevel = lerp(cfg.talkLevel, activityEnergy(m.character.activity, audio, nowMs, m.character.seed) * 0.2, 0.1)
      }
      this.tickGaze(m, nowMs, isListener, isSpeaker)
      cfg.distort = lerp(cfg.distort, recipeDistortBase(m.character) + audio.highs * 0.35, 0.05)
      if (audio.highs > 0.68) m.cache.markDirty()
    }

    if (m.phrase && !m.phrase.isDone && audio.chaos > 0.72 && audio.highs > 0.55) {
      m.phrase.dissolveNow()
    }

    // Re-arm speakers after their phrase dissolves so they can speak again.
    // Each repeat uses an incremented salt so the phrase text and format vary.
    if (m.phrase && m.phraseUsed && m.appeared) {
      if (m.phrase.isDone) {
        if (m.phraseRepeatCooldown < 0) {
          // Phrase just finished — start cooldown (2–4.5s, seeded per member)
          m.phraseRepeatCooldown = 2000 + hash01(this.seed + m.config.seed, 88 + m.phraseCount) * 2500
        }
        m.phraseRepeatCooldown -= dtMs
        if (m.phraseRepeatCooldown <= 0) {
          m.phraseUsed = false
          m.speakArmed = false
          m.phraseRepeatCooldown = -1
        }
      }
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
    if (m.character.activity === 'look') {
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
    // Vary salt per repetition so each phrase and format is different
    const baseSalt = def.phraseSalt ?? 77
    const salt = baseSalt + m.phraseCount * 31
    m.phrase.start(
      pickPhraseFromBank(def.phraseBank ?? 'venue', this.seed, salt),
      def.phraseFormat ?? pickFormat(this.seed + salt),
      this.seed + salt,
    )
    m.phraseUsed = true
    m.phraseCount++
  }

  private anyPhraseActive(): boolean {
    return this.members.some((m) => m.phrase && !m.phrase.isDone)
  }
}

function shouldDrawFace(def: CastMemberDef): boolean {
  // Explicit overrides always win
  if (def.showFace === false) return false
  if (def.showFace === true) return true
  // Speakers always get faces
  if (def.speaks) return true
  // Characters who are explicitly watching or dissolving show faces
  if (def.faceMode === 'watching' || def.faceMode === 'dissolving') return true
  // Characters whose job is to look show faces
  if (def.activity === 'look') return true
  return false
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

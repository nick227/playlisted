import { pickPhrase, phraseReveal } from './phrases'
import type { CastMemberDef, SceneDrawSink, SceneFrame, StageRect } from './types'

export function placementToXY(stage: StageRect, p: CastMemberDef['placement']) {
  return {
    x: stage.left + stage.width * p.nx,
    y: stage.top + stage.height * p.ny,
    z: p.z ?? 0.5,
    scale: p.scale * (stage.width / 400),
  }
}

export function composeCast(
  sink: SceneDrawSink,
  stage: StageRect,
  frame: SceneFrame,
  members: readonly CastMemberDef[],
) {
  for (let i = 0; i < members.length; i++) {
    queueCastMember(sink, stage, frame, members[i], i)
  }
}

function queueCastMember(
  sink: SceneDrawSink,
  stage: StageRect,
  frame: SceneFrame,
  member: CastMemberDef,
  index: number,
) {
  if (member.faceLayer === 'studio') return

  const { x, y, z, scale } = placementToXY(stage, member.placement)
  const talk = faceTalkLevel(member, frame)
  const trackX = member.eyeTrackX ?? 0.12
  const trackY = member.eyeTrackY ?? -0.05
  const alpha = dissolveAlpha(member, frame) ?? member.alpha

  sink.pushFaceMask(z, x, y, scale * 1.35, talk, trackX, trackY, { alpha })

  if (!member.speaks) return

  const bank = member.phraseBank ?? 'venue'
  const salt = member.phraseSalt ?? index * 31 + 77
  const phrase = pickPhrase(bank, frame.seed, salt)
  const reveal = phraseReveal(frame.time, frame.mids, index * 400)
  const bubbleW = stage.width * (member.placement.nx < 0.5 ? 0.55 : 0.5)
  const bubbleX = member.placement.nx < 0.5 ? x - 10 : x - bubbleW * 0.5
  const bubbleY = Math.min(stage.bottom - 12, y + scale * 0.9)
  sink.pushPhraseShard(z + 0.08, phrase, bubbleX, bubbleY, bubbleW, reveal, { alpha })
}

function faceTalkLevel(member: CastMemberDef, frame: SceneFrame): number {
  if (member.faceMode === 'idle') return frame.bass * 0.15
  if (member.faceMode === 'dissolving') return frame.highs * 0.4
  if (member.speaks || member.faceMode === 'talking') return frame.mids
  return frame.mids * 0.5
}

function dissolveAlpha(member: CastMemberDef, frame: SceneFrame): number | undefined {
  if (member.faceMode !== 'dissolving') return undefined
  return Math.max(0.12, 1 - frame.highs * 0.85)
}

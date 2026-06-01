import type { SceneFrame, StageRect } from '../../sceneKit'
import { registerVenue } from '../../sceneKit'
import type { LiminalRenderer } from './renderer'
import { hash01 } from './types'

type VenueFn = (r: LiminalRenderer, stage: StageRect, frame: SceneFrame) => void

function composeBand(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const { bass: a, highs, beat, time } = frame
  const floorY = stage.bottom
  const scale = stage.width / 520
  const beatKick = beat > 0.5 ? 1 : 0

  r.pushStageLight(0.1, stage.centerX, stage.top + stage.height * 0.08, stage.width * 0.45, a + highs * 0.5)
  r.pushSpeaker(0.2, stage.left + 12 * scale, floorY - 120 * scale, 56 * scale, 100 * scale, a, { faceOnCone: highs > 0.55 })
  r.pushSpeaker(0.2, stage.left + stage.width - 68 * scale, floorY - 120 * scale, 56 * scale, 100 * scale, a, { mirror: true, faceOnCone: highs > 0.6 })
  r.pushDrumKit(0.35, stage.centerX, floorY - 24 * scale, scale * 1.1, beatKick + beat * 0.5)
  r.pushStageLight(0.5, stage.centerX, stage.top + stage.height * 0.15, stage.width * 0.35, 0.35 + Math.sin(time / 280) * 0.2 + a * 0.4)
}

function composeBar(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const scale = stage.width / 480
  const counterY = stage.top + stage.height * 0.42
  const counterH = 28 * scale
  const counterW = stage.width * 0.88
  const counterX = stage.left + stage.width * 0.06

  r.pushBarCounter(0.2, counterX, counterY, counterW, counterH)
  const bottleCount = frame.lowPower ? 6 : 10
  for (let i = 0; i < bottleCount; i++) {
    const t = (i + 0.5) / bottleCount
    r.pushBottle(0.25 + t * 0.01, counterX + counterW * t, counterY - 4, scale * (0.85 + hash01(frame.seed, i) * 0.3), frame.highs, {})
  }
  const stoolCount = frame.lowPower ? 3 : 5
  for (let i = 0; i < stoolCount; i++) {
    r.pushStool(0.35, counterX + counterW * (0.15 + (i / stoolCount) * 0.7), stage.bottom - 8, scale, frame.beat > 0.55 && i === 2 ? 1 : 0)
  }
}

function composeDanceVenue(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  if (!frame.reducedMotion) {
    r.pushStageLight(0.05, stage.centerX, stage.top, stage.width * 0.6, frame.beat * 0.9 + frame.highs * 0.5)
    r.pushStageLight(0.05, stage.left + stage.width * 0.15, stage.top + stage.height * 0.2, stage.width * 0.3, frame.highs * 0.6)
    r.pushStageLight(0.05, stage.left + stage.width * 0.85, stage.top + stage.height * 0.2, stage.width * 0.3, frame.highs * 0.5)
  }
}

function composeConversationVenue(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  r.pushStageLight(0.04, stage.centerX, stage.top + stage.height * 0.3, stage.width * 0.55, 0.35 + frame.mids * 0.3)
  r.pushStageLight(0.04, stage.centerX - stage.width * 0.22, stage.centerY, stage.width * 0.3, 0.2 + frame.bass * 0.2)
  r.pushPosterShard(0.06, stage.left + stage.width * 0.08, stage.top + stage.height * 0.15,
    stage.width * 0.12, stage.height * 0.25, 0.05, { alpha: 0.55 })
  r.pushPosterShard(0.06, stage.left + stage.width * 0.72, stage.top + stage.height * 0.1,
    stage.width * 0.14, stage.height * 0.3, 0.08, { alpha: 0.45 })
}

function wrap(fn: VenueFn) {
  return (sink: import('../../sceneKit').SceneDrawSink, stage: StageRect, frame: SceneFrame) => {
    fn(sink as LiminalRenderer, stage, frame)
  }
}

export function registerLiminalVenues() {
  registerVenue({
    id: 'bandStage',
    compose: wrap(composeBand),
    castPresetIds: ['liminal.band'],
  })
  registerVenue({
    id: 'bar',
    compose: wrap(composeBar),
    castPresetIds: ['liminal.bartender', 'liminal.bar'],
  })
  registerVenue({
    id: 'danceFloor',
    compose: wrap(composeDanceVenue),
    castPresetIds: ['liminal.danceFloor'],
  })
  registerVenue({
    id: 'conversation',
    compose: wrap(composeConversationVenue),
    castPresetIds: ['liminal.conversation'],
  })
  registerVenue({
    id: 'hallwayCrowd',
    compose: wrap(() => {}),
    castPresetIds: ['liminal.hallway'],
  })
}

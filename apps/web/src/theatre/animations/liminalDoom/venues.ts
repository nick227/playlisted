import type { SceneFrame, StageRect } from '../../sceneKit'
import { registerVenue } from '../../sceneKit'
import type { LiminalRenderer } from './renderer'
import { hash01 } from './types'

type VenueFn = (r: LiminalRenderer, stage: StageRect, frame: SceneFrame) => void

function composeBand(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const { bass: a, mids, highs, beat, time } = frame
  const floorY = stage.bottom
  const scale = stage.width / 520
  const beatKick = beat > 0.5 ? 1 : 0

  r.pushStageLight(0.1, stage.centerX, stage.top + stage.height * 0.08, stage.width * 0.45, a + highs * 0.5)
  r.pushSpeaker(0.2, stage.left + 12 * scale, floorY - 120 * scale, 56 * scale, 100 * scale, a, { faceOnCone: highs > 0.55 })
  r.pushSpeaker(0.2, stage.left + stage.width - 68 * scale, floorY - 120 * scale, 56 * scale, 100 * scale, a, { mirror: true, faceOnCone: highs > 0.6 })
  r.pushDrumKit(0.35, stage.centerX, floorY - 24 * scale, scale * 1.1, beatKick + beat * 0.5)
  r.pushFigure(0.4, stage.centerX - 70 * scale, floorY, scale, 'drum', beat, {})
  r.pushFigure(0.42, stage.centerX - 20 * scale, floorY, scale * 0.95, 'guitar', mids, {})
  r.pushFigure(0.42, stage.centerX + 36 * scale, floorY, scale * 0.92, 'guitar', mids * 0.9, { mirror: true })
  r.pushFigure(0.44, stage.centerX + 90 * scale, floorY, scale * 0.88, 'stand', a * 0.5, {})
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

function composeDance(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const scale = stage.width / 500
  const floorY = stage.bottom - 6
  const strobe = frame.reducedMotion ? 0 : frame.highs
  let count = frame.lowPower ? 8 : 14

  for (let i = 0; i < count; i++) {
    const hx = hash01(frame.seed, i * 3)
    const hy = hash01(frame.seed, i * 3 + 1)
    const x = stage.left + stage.width * (0.12 + hx * 0.76)
    const y = floorY - (20 + hy * 50) * scale
    const scatter = frame.chaos > 0.6 ? (hash01(frame.seed, i + 99) - 0.5) * 40 * scale : 0
    r.pushDanceBody(0.2 + hy * 0.3, x + scatter, y, scale * (0.7 + hx * 0.35), i, strobe)
  }
  if (!frame.reducedMotion) {
    r.pushStageLight(0.05, stage.centerX, stage.top, stage.width * 0.5, frame.beat * 0.8 + frame.highs * 0.4)
  }
}

function composeConversationVenue(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  r.pushStageLight(0.04, stage.centerX, stage.centerY, stage.width * 0.35, 0.2 + frame.mids * 0.25)
}

function composeHallway(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const scale = stage.width / 460
  const rows = frame.lowPower ? 4 : 6
  const perSide = frame.lowPower ? 3 : 5

  for (let row = 0; row < rows; row++) {
    const depth = row / rows
    const z = 0.15 + depth * 0.4
    const y = stage.top + stage.height * (0.25 + depth * 0.55)
    const figScale = scale * (0.55 + depth * 0.35)
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < perSide; i++) {
        const idx = row * 10 + side * 5 + i
        const inset = hash01(frame.seed, idx)
        const x = side === 0
          ? stage.left + 20 + inset * stage.width * 0.18
          : stage.left + stage.width - 20 - inset * stage.width * 0.18
        r.pushFigure(z, x, y + figScale * 20, figScale, 'watch', frame.bass * 0.2, {
          eyeTrackX: 0.2, alpha: 0.75 + depth * 0.2,
        })
      }
    }
  }
}

function wrap(fn: VenueFn) {
  return (sink: import('../../sceneKit').SceneDrawSink, stage: StageRect, frame: SceneFrame) => {
    fn(sink as LiminalRenderer, stage, frame)
  }
}

export function registerLiminalVenues() {
  registerVenue({ id: 'bandStage', compose: wrap(composeBand) })
  registerVenue({ id: 'bar', compose: wrap(composeBar), castPresetIds: ['liminal.bartender'] })
  registerVenue({ id: 'danceFloor', compose: wrap(composeDance) })
  registerVenue({ id: 'conversation', compose: wrap(composeConversationVenue), castPresetIds: ['liminal.conversation'] })
  registerVenue({ id: 'hallwayCrowd', compose: wrap(composeHallway) })
}

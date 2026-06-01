import type { SceneFrame, StageRect } from '../../../sceneKit'
import { registerVenue } from '../../../sceneKit'
import type { PrimitiveOptions } from '../render/primitives'
import type { LiminalRenderer } from '../render/renderer'
import { speakerLevel, speakerOpts } from '../render/speakerReact'
import { hash01 } from '../core/math'

type VenueFn = (r: LiminalRenderer, stage: StageRect, frame: SceneFrame) => void

// ── Seed-stable light color palettes ─────────────────────────────────────────
// Each array is [r,g,b] for pushStageLight's lightTint option.

type RGB = [number, number, number]

const BAND_KEY_LIGHTS: RGB[] = [
  [255, 160,  80],  // warm amber
  [255, 120,  40],  // deep amber
  [160, 200, 255],  // concert blue
  [255,  80, 200],  // fuchsia drama
]
const BAND_FILL_LIGHTS: RGB[] = [
  [180,  80, 255],  // purple
  [80,  220, 200],  // teal wash
  [255, 200, 100],  // golden
  [255,  80, 120],  // hot pink
]
const BAR_LIGHTS: RGB[] = [
  [255, 160,  80],  // amber (grimy bar)
  [80,  160, 200],  // cool blue (pretentious bar)
  [200, 120,  60],  // warm tungsten
]
const DANCE_LIGHTS: RGB[] = [
  [255,  80, 160],  // hot pink
  [80,  220, 255],  // cyan strobe
  [180,  80, 255],  // purple
  [255, 220,  60],  // strobe yellow
  [80,  255, 160],  // green strobe
]
const CONVERSATION_LIGHTS: RGB[] = [
  [255, 160,  80],  // warm
  [120, 160, 220],  // cold blue-white
  [200, 100, 180],  // pink
]

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[Math.floor(hash01(seed, salt) * arr.length)]
}

function pushSpeakerUnit(
  r: LiminalRenderer,
  stage: StageRect,
  frame: SceneFrame,
  nx: number,
  baseScale: number,
  sizeMul: number,
  heightMul: number,
  extra: PrimitiveOptions = {},
  z = 0.2,
) {
  const floorY = stage.bottom
  const spk = speakerLevel(frame)
  const s = baseScale * sizeMul
  const w = 56 * s
  const h = 100 * s * heightMul
  const x = stage.left + stage.width * nx - w * 0.5
  const y = floorY - (110 * heightMul + hash01(frame.seed, 21 + nx * 10) * 20) * baseScale
  r.pushSpeaker(z, x, y, w, h, spk, {
    ...speakerOpts(frame),
    faceOnCone: frame.highs > 0.5 && spk > 0.35,
    ...extra,
  })
}

function pushSubSpeaker(
  r: LiminalRenderer,
  stage: StageRect,
  frame: SceneFrame,
  nx: number,
  baseScale: number,
) {
  const spk = speakerLevel(frame)
  const w = 96 * baseScale
  const h = 52 * baseScale
  const x = stage.left + stage.width * nx - w * 0.5
  const y = stage.bottom - h - 8 * baseScale
  r.pushSpeaker(0.18, x, y, w, h, spk, speakerOpts(frame))
}

// ── Band stage ────────────────────────────────────────────────────────────────

function composeBand(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const { bass: a, highs, beat, time, seed } = frame
  const floorY    = stage.bottom
  const scale     = stage.width / 520

  // Seed-stable key + fill light colors — different every room cycle
  const keyTint  = pick(BAND_KEY_LIGHTS, seed, 10)
  const fillTint = pick(BAND_FILL_LIGHTS, seed, 11)

  // Key light — wide overhead wash
  r.pushStageLight(0.1, stage.centerX, stage.top + stage.height * 0.08,
    stage.width * 0.45, a + highs * 0.5, { lightTint: keyTint })

  const speakerJit = (hash01(seed, 20) - 0.5) * 0.08
  pushSpeakerUnit(r, stage, frame, 0.05 + speakerJit, scale, 1.1, 1)
  pushSpeakerUnit(r, stage, frame, 0.95 - speakerJit, scale, 1.1, 1, { mirror: true })
  pushSpeakerUnit(r, stage, frame, 0.18, scale, 0.78, 0.9)
  pushSpeakerUnit(r, stage, frame, 0.82, scale, 0.78, 0.9, { mirror: true })
  pushSpeakerUnit(r, stage, frame, 0.30, scale, 0.58, 0.62)
  pushSpeakerUnit(r, stage, frame, 0.70, scale, 0.58, 0.62, { mirror: true })
  pushSubSpeaker(r, stage, frame, 0.5, scale)

  // Drum kit — center, slight depth variation
  r.pushDrumKit(0.35,
    stage.centerX + (hash01(seed, 23) - 0.5) * stage.width * 0.06,
    floorY - 24 * scale,
    scale * 1.1, beat > 0.5 ? 1 : 0 + beat * 0.5)

  // Moving fill light — color different from key
  r.pushStageLight(0.5, stage.centerX, stage.top + stage.height * 0.15,
    stage.width * 0.35, 0.35 + Math.sin(time / 280) * 0.2 + a * 0.4,
    { lightTint: fillTint })

  // A third accent light from the side — varies position by seed
  const sideX = stage.left + stage.width * (0.1 + hash01(seed, 24) * 0.15)
  r.pushStageLight(0.12, sideX, stage.top + stage.height * 0.25,
    stage.width * 0.22, highs * 0.55 + a * 0.3, { lightTint: fillTint })
}

// ── Bar ───────────────────────────────────────────────────────────────────────

function composeBar(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const { seed } = frame
  const scale     = stage.width / 480
  const counterY  = stage.top + stage.height * 0.42
  const counterH  = 28 * scale
  const counterW  = stage.width * 0.88
  const counterX  = stage.left + stage.width * 0.06
  const barTint   = pick(BAR_LIGHTS, seed, 30)

  // Underbar light — color varies per room
  r.pushStageLight(0.18, counterX + counterW * 0.5, counterY + counterH,
    counterW * 0.65, 0.3 + frame.mids * 0.2, { lightTint: barTint })

  const spk = speakerLevel(frame)
  const monW = 22 * scale
  const monH = 38 * scale
  r.pushSpeaker(0.22, counterX + 8, counterY - monH + 4, monW, monH, spk, speakerOpts(frame))
  r.pushSpeaker(0.22, counterX + counterW - monW - 8, counterY - monH + 4, monW, monH, spk, speakerOpts(frame))
  r.pushSpeaker(0.22, counterX + counterW * 0.5 - monW * 0.5, counterY - monH + 4, monW * 1.1, monH, spk, speakerOpts(frame))
  pushSpeakerUnit(r, stage, frame, 0.12, scale, 0.85, 0.95, {}, 0.19)
  pushSpeakerUnit(r, stage, frame, 0.88, scale, 0.85, 0.95, { mirror: true }, 0.19)
  pushSubSpeaker(r, stage, frame, 0.5, scale * 0.9)

  r.pushBarCounter(0.2, counterX, counterY, counterW, counterH)

  // Bottle count varies 7-11 per room (not just by power mode)
  const bottleCount = frame.lowPower ? 6 : 7 + Math.floor(hash01(seed, 31) * 5)
  for (let i = 0; i < bottleCount; i++) {
    const t   = (i + 0.5) / bottleCount
    // Bottles cluster slightly — not perfectly uniform
    const clust = t + (hash01(seed, 40 + i) - 0.5) * 0.04
    const bx  = counterX + counterW * clamp01(clust)
    r.pushBottle(0.25 + t * 0.01, bx, counterY - 4,
      scale * (0.85 + hash01(seed, i) * 0.3), frame.highs, {})
  }

  // Stool count varies 4-6 per room
  const stoolCount = frame.lowPower ? 3 : 4 + Math.floor(hash01(seed, 32) * 3)
  for (let i = 0; i < stoolCount; i++) {
    const sx = counterX + counterW * (0.12 + (i / stoolCount) * 0.76)
    r.pushStool(0.35, sx, stage.bottom - 8, scale, frame.beat > 0.55 && i === 1 ? 1 : 0)
  }
}

// ── Dance floor ───────────────────────────────────────────────────────────────

function composeDanceVenue(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  if (frame.reducedMotion) return
  const { seed } = frame

  // Each light gets its own seed-stable color — gives the impression of
  // separate par cans or moving heads
  const overhead = pick(DANCE_LIGHTS, seed, 50)
  const leftWash = pick(DANCE_LIGHTS, seed, 51)
  const rightWash = pick(DANCE_LIGHTS, seed, 52)

  r.pushStageLight(0.05, stage.centerX, stage.top,
    stage.width * 0.6, frame.beat * 0.9 + frame.highs * 0.5, { lightTint: overhead })

  // Side wash x-position varies per room
  const sideInset = 0.1 + hash01(seed, 53) * 0.1
  r.pushStageLight(0.05,
    stage.left + stage.width * sideInset,
    stage.top + stage.height * (0.15 + hash01(seed, 54) * 0.15),
    stage.width * (0.25 + hash01(seed, 55) * 0.1),
    frame.highs * 0.6, { lightTint: leftWash })
  r.pushStageLight(0.05,
    stage.left + stage.width * (1 - sideInset),
    stage.top + stage.height * (0.15 + hash01(seed, 56) * 0.15),
    stage.width * (0.25 + hash01(seed, 57) * 0.1),
    frame.highs * 0.5, { lightTint: rightWash })

  const scale = stage.width / 500
  pushSpeakerUnit(r, stage, frame, 0.04, scale, 1.05, 1)
  pushSpeakerUnit(r, stage, frame, 0.96, scale, 1.05, 1, { mirror: true })
  pushSpeakerUnit(r, stage, frame, 0.14, scale, 0.82, 0.92)
  pushSpeakerUnit(r, stage, frame, 0.86, scale, 0.82, 0.92, { mirror: true })
  pushSpeakerUnit(r, stage, frame, 0.26, scale, 0.62, 0.7)
  pushSpeakerUnit(r, stage, frame, 0.74, scale, 0.62, 0.7, { mirror: true })
  pushSpeakerUnit(r, stage, frame, 0.38, scale, 0.5, 0.55)
  pushSpeakerUnit(r, stage, frame, 0.62, scale, 0.5, 0.55, { mirror: true })
  pushSubSpeaker(r, stage, frame, 0.5, scale * 0.85)
}

// ── Hallway ───────────────────────────────────────────────────────────────────

function composeHallway(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  if (frame.reducedMotion) return
  const scale = stage.width / 520
  pushSpeakerUnit(r, stage, frame, 0.08, scale, 0.75, 0.88)
  pushSpeakerUnit(r, stage, frame, 0.92, scale, 0.75, 0.88, { mirror: true })
  pushSpeakerUnit(r, stage, frame, 0.35, scale, 0.5, 0.55)
  pushSpeakerUnit(r, stage, frame, 0.65, scale, 0.5, 0.55, { mirror: true })
}

// ── Conversation ──────────────────────────────────────────────────────────────

function composeConversationVenue(r: LiminalRenderer, stage: StageRect, frame: SceneFrame) {
  const { seed } = frame
  const keyTint = pick(CONVERSATION_LIGHTS, seed, 60)
  const rimTint = pick(CONVERSATION_LIGHTS, seed, 61)

  // Key — width varies (intimate tight spot vs wide wash)
  const keyW = stage.width * (0.4 + hash01(seed, 62) * 0.25)
  r.pushStageLight(0.04, stage.centerX, stage.top + stage.height * 0.3,
    keyW, 0.35 + frame.mids * 0.3, { lightTint: keyTint })

  // Rim / fill from the side — position varies
  const rimX = stage.centerX + (hash01(seed, 63) - 0.5) * stage.width * 0.45
  r.pushStageLight(0.04, rimX, stage.centerY,
    stage.width * 0.3, 0.2 + frame.bass * 0.2, { lightTint: rimTint })

  // Poster shards — position varies per room
  r.pushPosterShard(0.06,
    stage.left + stage.width * (0.06 + hash01(seed, 64) * 0.08),
    stage.top + stage.height * (0.1 + hash01(seed, 65) * 0.15),
    stage.width * (0.1 + hash01(seed, 66) * 0.06),
    stage.height * 0.28, 0.05, { alpha: 0.45 + hash01(seed, 67) * 0.2 })
  r.pushPosterShard(0.06,
    stage.left + stage.width * (0.7 + hash01(seed, 68) * 0.06),
    stage.top + stage.height * (0.08 + hash01(seed, 69) * 0.12),
    stage.width * (0.12 + hash01(seed, 70) * 0.05),
    stage.height * 0.32, 0.08, { alpha: 0.35 + hash01(seed, 71) * 0.2 })

  const scale = stage.width / 520
  pushSpeakerUnit(r, stage, frame, 0.1, scale, 0.7, 0.75, {}, 0.08)
  pushSpeakerUnit(r, stage, frame, 0.9, scale, 0.7, 0.75, { mirror: true }, 0.08)
  pushSpeakerUnit(r, stage, frame, 0.22, scale, 0.55, 0.6)
  pushSpeakerUnit(r, stage, frame, 0.78, scale, 0.55, 0.6, { mirror: true })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v }

function wrap(fn: VenueFn) {
  return (sink: import('../../../sceneKit').SceneDrawSink, stage: StageRect, frame: SceneFrame) => {
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
    compose: wrap(composeHallway),
    castPresetIds: ['liminal.hallway'],
  })
}

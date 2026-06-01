import type { LiminalRenderer } from './renderer'
import type { SceneComposeParams, SceneType } from './types'
import { hash01 } from './types'

const PHRASE_BANK = [
  'you came through the wrong door',
  'the sound guy left already',
  "don't look at the lights",
  'we played here before the ceiling fell',
  'your friend was just here',
  'cash only after midnight',
  'the green room is not green',
  'everyone hears it different',
  'keep your wristband visible',
  'that speaker has a face',
  'you missed the first set',
  'nobody goes backstage twice',
  'she said the hallway moved',
  'the drums are under the floor',
  'drink tickets are a kind of prayer',
  "you can stand there but don't stay",
  'the bartender knows your name wrong',
  'follow the cable',
  'this room used to be louder',
  'they are waiting between songs',
  'the exit sign is lying',
  'beautiful crowd tonight',
  "don't tell them you saw me",
  'one more door and then it starts',
] as const

function phraseForSeed(seed: number): string {
  const i = Math.floor(hash01(seed, 77) * PHRASE_BANK.length)
  return PHRASE_BANK[i]
}

/** Queue back-wall composition primitives — no direct ctx drawing. */
export function composeScene(renderer: LiminalRenderer, type: SceneType, p: SceneComposeParams) {
  switch (type) {
    case 'bandStage': composeBand(renderer, p); break
    case 'bar': composeBar(renderer, p); break
    case 'danceFloor': composeDance(renderer, p); break
    case 'conversation': composeConversation(renderer, p); break
    case 'hallwayCrowd': composeHallwayCrowd(renderer, p); break
  }
}

function composeBand(r: LiminalRenderer, p: SceneComposeParams) {
  const { bounds: b, audio: a, time } = p
  const floorY = b.bottom
  const scale = b.width / 520
  const beatKick = p.audio.beat > 0.5 ? 1 : 0

  r.pushStageLight(0.1, b.centerX, b.top + b.height * 0.08, b.width * 0.45, a.bass + a.highs * 0.5)
  r.pushSpeaker(0.2, b.left + 12 * scale, floorY - 120 * scale, 56 * scale, 100 * scale, a.bass, { faceOnCone: a.highs > 0.55 })
  r.pushSpeaker(0.2, b.left + b.width - 68 * scale, floorY - 120 * scale, 56 * scale, 100 * scale, a.bass, { mirror: true, faceOnCone: a.highs > 0.6 })
  r.pushDrumKit(0.35, b.centerX, floorY - 24 * scale, scale * 1.1, beatKick + a.beat * 0.5)
  r.pushFigure(0.4, b.centerX - 70 * scale, floorY, scale, 'drum', a.beat, {})
  r.pushFigure(0.42, b.centerX - 20 * scale, floorY, scale * 0.95, 'guitar', a.mids, {})
  r.pushFigure(0.42, b.centerX + 36 * scale, floorY, scale * 0.92, 'guitar', a.mids * 0.9, { mirror: true })
  r.pushFigure(0.44, b.centerX + 90 * scale, floorY, scale * 0.88, 'stand', a.bass * 0.5, {})
  const lightPulse = 0.35 + Math.sin(time / 280) * 0.2 + a.bass * 0.4
  r.pushStageLight(0.5, b.centerX, b.top + b.height * 0.15, b.width * 0.35, lightPulse)
}

function composeBar(r: LiminalRenderer, p: SceneComposeParams) {
  const { bounds: b, audio: a, seed } = p
  const scale = b.width / 480
  const counterY = b.top + b.height * 0.42
  const counterH = 28 * scale
  const counterW = b.width * 0.88
  const counterX = b.left + b.width * 0.06

  r.pushBarCounter(0.2, counterX, counterY, counterW, counterH)
  const bottleCount = p.lowPower ? 6 : 10
  for (let i = 0; i < bottleCount; i++) {
    const t = (i + 0.5) / bottleCount
    const bx = counterX + counterW * t
    r.pushBottle(0.25 + t * 0.01, bx, counterY - 4, scale * (0.85 + hash01(seed, i) * 0.3), a.highs, {})
  }
  r.pushFigure(0.4, b.centerX + 20 * scale, counterY + counterH, scale * 1.05, 'bartender', a.mids, {
    eyeTrackX: 0.15,
    eyeTrackY: -0.1,
  })
  const stoolCount = p.lowPower ? 3 : 5
  for (let i = 0; i < stoolCount; i++) {
    const sx = counterX + counterW * (0.15 + (i / stoolCount) * 0.7)
    r.pushStool(0.35, sx, b.bottom - 8, scale, a.beat > 0.55 && i === 2 ? 1 : 0)
  }
}

function composeDance(r: LiminalRenderer, p: SceneComposeParams) {
  const { bounds: b, audio: a, seed, phase } = p
  const scale = b.width / 500
  const floorY = b.bottom - 6
  const strobe = p.reducedMotion ? 0 : a.highs
  let count = p.lowPower ? 8 : 14
  if (phase === 'inhabited') count += 3

  for (let i = 0; i < count; i++) {
    const hx = hash01(seed, i * 3)
    const hy = hash01(seed, i * 3 + 1)
    const x = b.left + b.width * (0.12 + hx * 0.76)
    const y = floorY - (20 + hy * 50) * scale
    const scatter = a.chaos > 0.6 ? (hash01(seed, i + 99) - 0.5) * 40 * scale : 0
    r.pushDanceBody(0.2 + hy * 0.3, x + scatter, y, scale * (0.7 + hx * 0.35), i, strobe)
  }
  if (!p.reducedMotion) {
    r.pushStageLight(0.05, b.centerX, b.top, b.width * 0.5, a.beat * 0.8 + a.highs * 0.4)
  }
}

function composeConversation(r: LiminalRenderer, p: SceneComposeParams) {
  const { bounds: b, audio: a, seed, time } = p
  const scale = b.width / 400
  const phrase = phraseForSeed(seed)
  const reveal = 0.55 + Math.sin(time / 900) * 0.25 + a.mids * 0.2

  r.pushFaceMask(0.5, b.centerX - b.width * 0.22, b.centerY, scale * 2.4, a.mids, 0.12, -0.05)
  if (hash01(seed, 2) > 0.4) {
    r.pushFaceMask(0.48, b.centerX + b.width * 0.18, b.centerY + b.height * 0.08, scale * 1.7, a.mids * 0.8, -0.1, 0.08, { alpha: 0.85 })
  }
  r.pushPhraseShard(0.6, phrase, b.left + b.width * 0.08, b.bottom - 20, b.width * 0.84, reveal)
}

function composeHallwayCrowd(r: LiminalRenderer, p: SceneComposeParams) {
  const { bounds: b, audio: a, seed, phase } = p
  const scale = b.width / 460
  const rows = p.lowPower ? 4 : 6
  const perSide = p.lowPower ? 3 : 5

  for (let row = 0; row < rows; row++) {
    const depth = row / rows
    const z = 0.15 + depth * 0.4
    const y = b.top + b.height * (0.25 + depth * 0.55)
    const figScale = scale * (0.55 + depth * 0.35)
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < perSide; i++) {
        const idx = row * 10 + side * 5 + i
        const inset = hash01(seed, idx)
        const x = side === 0
          ? b.left + 20 + inset * b.width * 0.18
          : b.left + b.width - 20 - inset * b.width * 0.18
        r.pushFigure(z, x, y + figScale * 20, figScale, 'watch', a.bass * 0.2, {
          eyeTrackX: 0.2,
          eyeTrackY: 0,
          alpha: 0.75 + depth * 0.2,
        })
      }
    }
  }
  if (phase === 'inhabited' && !p.lowPower) {
    r.pushFigure(0.55, b.centerX, b.centerY + b.height * 0.2, scale * 0.9, 'watch', a.chaos, { alpha: 0.5 })
  }
}

export { PHRASE_BANK, phraseForSeed }

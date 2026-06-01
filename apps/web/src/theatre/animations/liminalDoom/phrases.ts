import { palette } from './palette'
import { clamp, hash01 } from './types'

export const PHRASE_BANK = [
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

const BAR_PHRASE_BANK = [
  'cash only after midnight',
  'the bartender knows your name wrong',
  'drink tickets are a kind of prayer',
  "you can stand there but don't stay",
  'keep your wristband visible',
] as const

const THRESHOLD_PHRASE_BANK = [
  'one more door and then it starts',
  'the exit sign is lying',
  'follow the cable',
  'you came through the wrong door',
  "don't tell them you saw me",
] as const

const PHRASE_BANKS: Record<string, readonly string[]> = {
  venue: PHRASE_BANK,
  bar: BAR_PHRASE_BANK,
  threshold: THRESHOLD_PHRASE_BANK,
}

export type PhraseText = typeof PHRASE_BANK[number] | string

export type PhraseFormat = 'subtitleShard' | 'wallText' | 'tornCaption' | 'bubble'

export type PhrasePhase = 'revealing' | 'holding' | 'dissolving' | 'done'

export type PhraseTickState = {
  text: string
  format: PhraseFormat
  revealT: number   // 0–1 character reveal progress
  alpha: number     // 0–1 overall visibility
  phase: PhrasePhase
}

// ── Phrase selection ──────────────────────────────────────────────────────────

export function pickPhrase(seed: number): PhraseText {
  return pickPhraseFromBank('venue', seed, 77)
}

export function pickPhraseFromBank(bankId: string, seed: number, salt = 0): PhraseText {
  const bank = PHRASE_BANKS[bankId] ?? PHRASE_BANK
  const i = Math.floor(hash01(seed, salt) * bank.length)
  return bank[i]
}

export function pickFormat(seed: number): PhraseFormat {
  const v = hash01(seed, 44)
  if (v < 0.38) return 'subtitleShard'
  if (v < 0.62) return 'tornCaption'
  if (v < 0.82) return 'wallText'
  return 'bubble'
}

// ── Phrase timing controller ──────────────────────────────────────────────────

const REVEAL_RATE_MS  = 42   // ms per character
const HOLD_MS_BASE    = 2800
const DISSOLVE_MS     = 1100

export class PhraseTicker {
  private text = ''
  private format: PhraseFormat = 'subtitleShard'
  private revealT = 0
  private alpha = 0
  private phase: PhrasePhase = 'done'
  private holdElapsed = 0
  private holdDuration = HOLD_MS_BASE
  private cutAt = -1   // character index where phrase was cut off mid-thought

  get isDone(): boolean { return this.phase === 'done' }

  start(text: PhraseText, format: PhraseFormat, seed = 0) {
    this.text = text as string
    this.format = format
    this.revealT = 0
    this.alpha = 0
    this.phase = 'revealing'
    this.holdElapsed = 0
    this.holdDuration = HOLD_MS_BASE + hash01(seed, 88) * 1400
    // Sometimes cut off 20–60% through — feels overheard
    this.cutAt = hash01(seed, 91) < 0.35
      ? Math.floor(this.text.length * (0.2 + hash01(seed, 92) * 0.4))
      : this.text.length
  }

  tick(dtMs: number, mids: number, highs: number): PhraseTickState {
    const maxChars = this.cutAt > 0 ? this.cutAt : this.text.length

    if (this.phase === 'revealing') {
      const rate = REVEAL_RATE_MS * (1 - mids * 0.25)
      this.revealT = clamp(this.revealT + dtMs / (maxChars * rate), 0, 1)
      this.alpha = clamp(this.alpha + dtMs / 220, 0, 1)
      if (this.revealT >= 1) this.phase = 'holding'
    } else if (this.phase === 'holding') {
      this.holdElapsed += dtMs
      // Highs cause early dissolve
      const earlyExit = highs > 0.65 && this.holdElapsed > this.holdDuration * 0.5
      if (this.holdElapsed >= this.holdDuration || earlyExit) this.phase = 'dissolving'
    } else if (this.phase === 'dissolving') {
      this.alpha = clamp(this.alpha - dtMs / DISSOLVE_MS, 0, 1)
      // Smear reveal backwards under highs
      if (highs > 0.5) this.revealT = clamp(this.revealT - dtMs / 800, 0, 1)
      if (this.alpha <= 0) this.phase = 'done'
    }

    return {
      text: this.text,
      format: this.format,
      revealT: this.revealT,
      alpha: this.alpha,
      phase: this.phase,
    }
  }

  /** Force immediate dissolve (e.g. chaos hit or voidBloom). */
  dissolveNow() {
    if (this.phase !== 'done') this.phase = 'dissolving'
  }
}

// ── Render functions ──────────────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D

function visibleText(text: string, revealT: number): string {
  return text.slice(0, Math.floor(text.length * revealT))
}

export function drawSubtitleShard(
  ctx: Ctx, state: PhraseTickState,
  x: number, y: number, maxW: number,
) {
  if (state.alpha <= 0.01) return
  const visible = visibleText(state.text, state.revealT)
  if (!visible) return

  const fontSize = clamp(maxW * 0.042, 11, 18)
  ctx.save()
  ctx.globalAlpha = state.alpha * 0.95
  // Subtitle box
  ctx.fillStyle = 'rgba(10,8,14,0.82)'
  const boxH = fontSize * 1.7
  ctx.beginPath()
  ctx.roundRect(x, y - boxH, maxW, boxH, 3)
  ctx.fill()
  // Text
  ctx.fillStyle = palette.phrase
  ctx.font = `${fontSize}px "Courier New", monospace`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(visible, x + 8, y - boxH * 0.5, maxW - 14)
  ctx.restore()
}

export function drawTornCaption(
  ctx: Ctx, state: PhraseTickState,
  x: number, y: number, maxW: number,
  seed = 0,
) {
  if (state.alpha <= 0.01) return
  const visible = visibleText(state.text, state.revealT)
  if (!visible) return

  const fontSize = clamp(maxW * 0.038, 10, 16)
  ctx.save()
  ctx.globalAlpha = state.alpha * 0.9
  // Torn paper background — slightly rotated
  const skew = (hash01(seed, 20) - 0.5) * 0.04
  ctx.translate(x + maxW * 0.5, y)
  ctx.rotate(skew)
  const boxW = maxW * 0.9
  const boxH = fontSize * 1.9
  ctx.fillStyle = 'rgba(30,22,18,0.88)'
  ctx.fillRect(-boxW * 0.5, -boxH, boxW, boxH)
  // Torn top edge — jagged
  ctx.fillStyle = 'rgba(20,14,10,0.6)'
  for (let i = 0; i < 8; i++) {
    const tx = -boxW * 0.5 + (i / 7) * boxW
    const th = (hash01(seed, 30 + i) - 0.5) * 4
    ctx.fillRect(tx, -boxH + th, boxW / 8 + 1, 3)
  }
  ctx.fillStyle = palette.phrase
  ctx.font = `italic ${fontSize}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(visible, 0, -boxH * 0.5, boxW - 10)
  ctx.restore()
}

export function drawWallText(
  ctx: Ctx, state: PhraseTickState,
  x: number, y: number, maxW: number,
  seed = 0,
) {
  if (state.alpha <= 0.01) return
  const visible = visibleText(state.text, state.revealT)
  if (!visible) return

  const fontSize = clamp(maxW * 0.035, 9, 15)
  ctx.save()
  ctx.globalAlpha = state.alpha * 0.7
  // Printed/stencilled look — no box, just text bleeding into wall
  const skew = (hash01(seed, 22) - 0.5) * 0.06
  ctx.translate(x, y)
  ctx.rotate(skew)
  ctx.fillStyle = palette.amberDim
  ctx.font = `bold ${fontSize}px "Arial Narrow", "Arial", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  // Slightly doubled for xerox blur
  ctx.fillText(visible, 1.5, 1.5, maxW)
  ctx.fillStyle = palette.phrase
  ctx.fillText(visible, 0, 0, maxW)
  ctx.restore()
}

export function drawBubble(
  ctx: Ctx, state: PhraseTickState,
  x: number, y: number, maxW: number,
  tailX?: number,
) {
  if (state.alpha <= 0.01) return
  const visible = visibleText(state.text, state.revealT)
  if (!visible) return

  const fontSize = clamp(maxW * 0.04, 10, 17)
  const boxH = fontSize * 2.0
  const boxW = Math.min(maxW, ctx.measureText(visible).width + 24)
  const boxY = y - boxH - 12
  ctx.save()
  ctx.globalAlpha = state.alpha * 0.92
  ctx.fillStyle = 'rgba(240,230,255,0.12)'
  ctx.strokeStyle = 'rgba(180,160,200,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, boxY, boxW, boxH, 6)
  ctx.fill()
  ctx.stroke()
  const tx = clamp(tailX ?? x + 18, x + 8, x + boxW - 8)
  ctx.beginPath()
  ctx.moveTo(tx - 6, boxY + boxH)
  ctx.lineTo(tx, y)
  ctx.lineTo(tx + 6, boxY + boxH)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = palette.strobe
  ctx.font = `${fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(visible, x + 10, y - boxH * 0.5 - 12, boxW - 20)
  ctx.restore()
}

/** Dispatch to the correct renderer based on format. */
export function drawPhraseState(
  ctx: Ctx,
  state: PhraseTickState,
  x: number, y: number, maxW: number,
  seed = 0,
  tailX?: number,
) {
  switch (state.format) {
    case 'subtitleShard': drawSubtitleShard(ctx, state, x, y, maxW); break
    case 'tornCaption':   drawTornCaption(ctx, state, x, y, maxW, seed); break
    case 'wallText':      drawWallText(ctx, state, x, y, maxW, seed); break
    case 'bubble':        drawBubble(ctx, state, x, y, maxW, tailX); break
  }
}

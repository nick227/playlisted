import { frameHold, stepped } from '../../stopMotion'
import { clamp } from './types'

const RING_COUNT = 6

export function drawRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  minSide: number,
  bass: number,
  mids: number,
  highs: number,
  time: number,
  phaseMix: number,
  shatterUntil: number,
  now: number,
  beat: boolean,
) {
  const ringBase = bass * 240 + mids * 120
  const alpha = clamp(0.12 + (mids * 0.85 + highs * 0.65) * phaseMix, 0.08, 0.92)
  const lineW = 2 + bass * 10
  const rotateBase = time * 0.18
  const pi2 = Math.PI * 2
  const shatter = now < shatterUntil
  const stepOsc = stepped(Math.sin(frameHold(now, 90) / 600), 5)

  for (let i = 0; i < RING_COUNT; i++) {
    const rot = (rotateBase + time * i * 0.12 + (beat && i === 2 ? stepOsc * 0.4 : 0)) % pi2
    const radius = minSide * (0.07 + i * 0.07) + ringBase * phaseMix
    const jitter = highs * (i > 3 ? 6 : 2)
    const r = 80 + i * 24
    const g = 130 + i * 12
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.strokeStyle = `rgba(${r},${g},255,${alpha})`
    ctx.lineWidth = lineW + i * (1.2 + highs * 4)
    ctx.beginPath()
    if (shatter) {
      const segments = 10
      for (let s = 0; s < segments; s++) {
        const a0 = (s / segments) * pi2
        const a1 = a0 + pi2 / segments - 0.15
        ctx.arc(0, 0, radius + jitter, a0, a1)
      }
    } else {
      ctx.arc(0, 0, radius + jitter, 0, pi2)
    }
    ctx.stroke()
    ctx.restore()
  }
}

export function pushEchoRing(
  echoes: { t: number; life: number; strength: number }[],
  strength: number,
) {
  echoes.push({ t: 0, life: 520, strength })
  if (echoes.length > 4) echoes.shift()
}

export function drawEchoRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  minSide: number,
  echoes: { t: number; life: number; strength: number }[],
  dt: number,
) {
  let w = 0
  for (let i = 0; i < echoes.length; i++) {
    const e = echoes[i]
    e.t += dt
    if (e.t < e.life) {
      if (w !== i) echoes[w] = e
      w++
      const prog = e.t / e.life
      const r = minSide * (0.12 + prog * 0.35) * (0.6 + e.strength)
      ctx.strokeStyle = `rgba(200,240,255,${(1 - prog) * 0.45 * e.strength})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  echoes.length = w
}

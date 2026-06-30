import type { EngineFrame, TheatreObject } from './types'

/** Soft formation pull + micro-shift so objects weave into rings, waves, and spirals. */
export function applyPatternDrift(
  obj: TheatreObject,
  index: number,
  total: number,
  frame: EngineFrame,
) {
  const { cx, cy, w, h, time, delta, reducedMotion } = frame
  const dt = delta / 1000
  const speedMul = reducedMotion ? 0.55 : 1
  const t = time * 0.001 * speedMul
  const span = Math.min(w, h)
  const slot = (index / Math.max(1, total)) * Math.PI * 2

  const ringR = span * (0.14 + obj.patternRadius * 0.28)
  const px = cx
    + Math.cos(slot + t * obj.patternSpeed) * ringR
    + Math.sin(t * obj.lissajousA + obj.wavePhase) * ringR * 0.42
  const py = cy
    + Math.sin(slot + t * obj.patternSpeed * 0.9) * ringR * 0.82
    + Math.cos(t * obj.lissajousB + obj.wavePhase) * ringR * 0.32

  const pull = 0.022 * speedMul
  obj.vx += (px - obj.x) * pull
  obj.vy += (py - obj.y) * pull

  obj.x += Math.sin(t * 3.1 + obj.wavePhase) * 2.2 * speedMul
  obj.y += Math.cos(t * 2.4 + obj.wavePhase) * 2.2 * speedMul
  obj.rot += obj.rotSpeed * dt * speedMul
}

import type { LiminalRenderer } from '../render/renderer'
import { palette } from '../core/palette'
import type { AudioReact, BackWallBounds, RoomPhase } from '../core/types'
import { clamp, lerp } from '../core/math'

export type DoorThresholdState = {
  open: number
  breathe: number
  bleed: number
  frameBend: number
}

export function doorThresholdState(
  phase: RoomPhase,
  audio: AudioReact,
  time: number,
): DoorThresholdState {
  const breathe = Math.sin(time / 520) * 0.5 + 0.5
  let open = 0
  let bleed = 0
  let frameBend = audio.mids * 0.35

  if (phase === 'threshold') {
    open = lerp(0, 0.35, breathe)
    bleed = 0.25 + audio.highs * 0.4
    frameBend = 0.2 + audio.mids * 0.55
  } else if (phase === 'passage') {
    open = 0.65 + audio.beat * 0.25
    bleed = 0.6 + audio.highs * 0.3
    frameBend = 0.35 + audio.chaos * 0.2
  } else if (phase === 'approach') {
    open = audio.beat * 0.05
    bleed = 0.08
    frameBend = audio.mids * 0.15
  } else if (phase === 'inhabited') {
    open = 0.12 + breathe * 0.1
    bleed = 0.35 + audio.highs * 0.25
  }

  return {
    open: clamp(open, 0, 1),
    breathe,
    bleed: clamp(bleed, 0, 1),
    frameBend: clamp(frameBend, 0, 1),
  }
}

/** Door on back wall or corridor end — uses renderer only. */
export function queueDoor(
  renderer: LiminalRenderer,
  wall: BackWallBounds,
  state: DoorThresholdState,
  z = 0.55,
) {
  const dw = wall.width * 0.22
  const dh = wall.height * 0.55
  const dx = wall.centerX - dw * 0.5
  const dy = wall.bottom - dh - wall.height * 0.05
  const gap = state.open * dw * 0.42

  renderer.pushDoorFrame(z, dx - 8, dy - 10, dw + 16, dh + 18, state.frameBend)
  renderer.pushDoorFrame(z + 0.02, dx + gap * 0.5, dy, dw * 0.5 - gap * 0.25, dh, state.frameBend * 0.5, { tint: palette.door })
  renderer.pushDoorFrame(z + 0.02, dx + dw * 0.5 + gap * 0.25, dy, dw * 0.5 - gap * 0.25, dh, state.frameBend * 0.5, { tint: palette.door })

  if (state.bleed > 0.05) {
    renderer.pushStageLight(z - 0.05, wall.centerX, dy + dh * 0.5, dw * (0.6 + state.bleed), state.bleed)
  }
}

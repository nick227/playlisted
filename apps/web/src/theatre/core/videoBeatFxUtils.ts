import type { VisualMediaBeatFx } from '../media/types'

export type VideoBeatFxEffect = 'scale' | 'brightness' | 'dropPunch'

export type VideoBeatFxConfig = {
  enabled: true
  intensity: 'subtle' | 'normal' | 'strong'
  effects: Set<VideoBeatFxEffect>
}

export type VideoBeatFxFrame = {
  scale: number
  brightness: number
  contrast: number
}

export type VideoBeatFxPulseState = {
  beatPulse: number
  dropPulse: number
}

const VALID_EFFECTS = new Set<VideoBeatFxEffect>(['scale', 'brightness', 'dropPunch'])

const INTENSITY_GAIN = {
  subtle: 0.55,
  normal: 1,
  strong: 1.45,
} as const

const BEAT_DECAY_MS = 220
const DROP_DECAY_MS = 180

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function parseVideoBeatFx(beatFx: VisualMediaBeatFx | undefined): VideoBeatFxConfig | null {
  if (!beatFx?.enabled) return null

  const intensity = beatFx.intensity ?? 'subtle'
  const effects = new Set<VideoBeatFxEffect>()
  for (const effect of beatFx.effects ?? ['scale', 'brightness']) {
    if (VALID_EFFECTS.has(effect as VideoBeatFxEffect)) {
      effects.add(effect as VideoBeatFxEffect)
    }
  }

  if (effects.size === 0) {
    effects.add('scale')
    effects.add('brightness')
  }

  return { enabled: true, intensity, effects }
}

export function intensityGain(intensity: VideoBeatFxConfig['intensity']): number {
  return INTENSITY_GAIN[intensity]
}

export function tickVideoBeatFxPulse(
  state: VideoBeatFxPulseState,
  input: { beatEdge: boolean; dropEdge: boolean; deltaMs: number },
): VideoBeatFxPulseState {
  let beatPulse = Math.max(0, state.beatPulse - input.deltaMs / BEAT_DECAY_MS)
  let dropPulse = Math.max(0, state.dropPulse - input.deltaMs / DROP_DECAY_MS)

  if (input.beatEdge) beatPulse = 1
  if (input.dropEdge) dropPulse = 1

  return { beatPulse, dropPulse }
}

export function computeVideoBeatFxFrame(input: {
  beatFx: VideoBeatFxConfig
  reducedMotion: boolean
  lowPower: boolean
  energy: number
  beatPulse: number
  dropPulse: number
}): VideoBeatFxFrame {
  if (input.reducedMotion || input.lowPower) {
    return { scale: 1, brightness: 1, contrast: 1 }
  }

  const gain = intensityGain(input.beatFx.intensity)
  const energy = clamp(input.energy, 0, 1)
  const beatPulse = clamp(input.beatPulse, 0, 1)
  const dropPulse = clamp(input.dropPulse, 0, 1)

  let scale = 1
  if (input.beatFx.effects.has('scale')) {
    scale += beatPulse * 0.018 * gain
    scale += energy * 0.004 * gain
  }

  if (input.beatFx.effects.has('dropPunch')) {
    scale += dropPulse * 0.028 * gain
  }

  scale = clamp(scale, 1, 1.08)

  let brightness = 1
  let contrast = 1
  if (input.beatFx.effects.has('brightness')) {
    brightness = 1 + Math.min(0.1, energy * 0.08 * gain) + beatPulse * 0.035 * gain
    contrast = 1 + Math.min(0.06, energy * 0.04 * gain)
    brightness = clamp(brightness, 1, 1.14)
    contrast = clamp(contrast, 1, 1.08)
  }

  return { scale, brightness, contrast }
}

export function formatVideoBeatFxTransform(scale: number): string {
  return `scale(${scale.toFixed(4)})`
}

export function formatVideoBeatFxFilter(frame: VideoBeatFxFrame): string {
  if (frame.brightness === 1 && frame.contrast === 1) return ''
  return `brightness(${frame.brightness.toFixed(3)}) contrast(${frame.contrast.toFixed(3)})`
}

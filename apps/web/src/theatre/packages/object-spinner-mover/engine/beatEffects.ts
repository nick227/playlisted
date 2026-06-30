import type EffectsManager from '../../../runtime/MicroEffects'
import type { BeatBehavior, EngineFrame, TheatreObject } from './types'
import type { BeatState } from './beat'
import type { MacroEffectState } from './macroEffects'
import { bumpMacroState } from './macroEffects'
import type { PaletteColors } from './palettes'
import { hexToRgb } from './paletteRgb'

type EffectCtx = {
  effects: EffectsManager | null
  macro: MacroEffectState
  frame: EngineFrame
  behavior: BeatBehavior
  beatState: BeatState
  palette: PaletteColors
  objects: TheatreObject[]
  intensity: number
  prevDropBurst: number
  useMacroFx: boolean
}

function burstRgb(palette: PaletteColors, index = 0): string {
  return hexToRgb(palette.fill[index % palette.fill.length] ?? palette.accent)
}

function heroPoint(objects: TheatreObject[], cx: number, cy: number) {
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i]!
    if (o.isHero && o.alive) return { x: o.x, y: o.y }
  }
  return { x: cx, y: cy }
}

function bumpMacroForBeat(
  macro: MacroEffectState,
  behavior: BeatBehavior,
  frame: EngineFrame,
  intensity: number,
): MacroEffectState {
  const { energy } = frame
  const scale = intensity
  const loud = behavior === 'burstSpawn' || behavior === 'spawnMore' || behavior === 'dropExplosion'

  if (frame.chaosHit && energy > 0.5) {
    return bumpMacroState(macro, 0.55, 0.35, 0.07 * scale)
  }
  if (frame.beat) {
    if (loud) return bumpMacroState(macro, 0.45 + energy * 0.3, 0.25 + energy * 0.15, 0.05 * scale)
    if (behavior === 'spinKick' || behavior === 'scaleOnBeat') {
      return bumpMacroState(macro, 0.35 + energy * 0.25, 0.14 + energy * 0.1, 0.03 * scale)
    }
    return bumpMacroState(macro, 0.22 + energy * 0.2, 0.1 + energy * 0.08, 0.02 * scale)
  }
  if (frame.bassHit && (behavior === 'bassGravity' || behavior === 'dropExplosion')) {
    return bumpMacroState(macro, frame.bass * 0.45, frame.bass * 0.3, 0.025 * scale)
  }
  return macro
}

export function triggerBeatEffects(ctx: EffectCtx): MacroEffectState {
  const { effects, frame, behavior, beatState, palette, objects, intensity, prevDropBurst, useMacroFx } = ctx
  let macro = ctx.macro
  if (frame.reducedMotion || !useMacroFx) return macro

  macro = bumpMacroForBeat(macro, behavior, frame, intensity)

  const dropJustHit = beatState.dropBurst > 0.75 && prevDropBurst < 0.4
  if (dropJustHit) {
    macro = bumpMacroState(macro, 0.85, 0.55, 0.1 * intensity)
  }

  if (!effects) return macro

  const { cx, cy, h, energy } = frame
  const scale = intensity
  const { x: hx, y: hy } = heroPoint(objects, cx, cy)
  const accentRgb = hexToRgb(palette.accent)

  if (dropJustHit) {
    effects.triggerShockwave(cx, cy, 0.8 * energy * scale)
    effects.triggerParticleBurst(cx, cy, Math.floor(12 + energy * 18 * scale), 0.7 * scale, accentRgb)
    effects.triggerScreenPunch(0.6 * energy * scale)
  }

  if (frame.chaosHit && energy > 0.5) {
    effects.triggerShockwave(cx, cy, energy * 0.6 * scale)
    effects.triggerParticleBurst(cx, cy, Math.floor(8 + energy * 12 * scale), energy * 0.6 * scale, accentRgb)
  }

  if (frame.beat) {
    const loud = behavior === 'burstSpawn' || behavior === 'spawnMore' || behavior === 'dropExplosion'
    const burstCount = Math.floor((loud ? 6 : 4) + energy * (loud ? 10 : 6) * scale)
    effects.triggerParticleBurst(hx, hy, burstCount, energy * 0.55 * scale, accentRgb)
    if (loud) effects.triggerScreenPunch(0.25 + energy * 0.25 * scale)
  }

  if (frame.bassHit) {
    effects.triggerParticleBurst(cx, h * 0.88, Math.floor(4 + frame.bass * 8 * scale), frame.bass * 0.45 * scale, burstRgb(palette, 3))
  }

  return macro
}

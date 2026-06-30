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
}

function burstRgb(palette: PaletteColors, index = 0): string {
  return hexToRgb(palette.fill[index % palette.fill.length] ?? palette.accent)
}

function heroPoint(objects: TheatreObject[], cx: number, cy: number) {
  const hero = objects.find(o => o.isHero && o.alive)
  return { x: hero?.x ?? cx, y: hero?.y ?? cy }
}

export function triggerBeatEffects(ctx: EffectCtx): MacroEffectState {
  const { effects, frame, behavior, beatState, palette, objects, intensity, prevDropBurst } = ctx
  let macro = ctx.macro
  if (!effects || frame.reducedMotion) return macro

  const { cx, cy, h, energy } = frame
  const scale = intensity
  const { x: hx, y: hy } = heroPoint(objects, cx, cy)
  const accentRgb = hexToRgb(palette.accent)

  const dropJustHit = beatState.dropBurst > 0.75 && prevDropBurst < 0.4
  if (dropJustHit) {
    effects.triggerShockwave(cx, cy, 1.5 * energy * scale)
    effects.triggerShockwave(hx, hy, 1.2 * energy * scale)
    effects.triggerParticleBurst(cx, cy, Math.floor(45 + energy * 70 * scale), 1.3 * scale, accentRgb)
    effects.triggerParticleBurst(hx, hy, Math.floor(35 + energy * 45 * scale), 1.1 * scale, burstRgb(palette, 1))
    effects.triggerScreenPunch(1.3 * energy * scale)
    macro = bumpMacroState(macro, 1, 0.75, 0.14 * scale)
  }

  if (frame.chaosHit && energy > 0.5) {
    effects.triggerShockwave(cx, cy, energy * 1.15 * scale)
    effects.triggerParticleBurst(cx, cy, Math.floor(22 + energy * 38 * scale), energy * scale, accentRgb)
    effects.triggerScreenPunch(energy * 0.85 * scale)
    macro = bumpMacroState(macro, 0.75, 0.45, 0.09 * scale)
  }

  if (frame.beat) {
    const loud = behavior === 'burstSpawn' || behavior === 'spawnMore' || behavior === 'dropExplosion'
    const burstCount = Math.floor((loud ? 14 : 8) + energy * (loud ? 32 : 18) * scale)
    effects.triggerParticleBurst(hx, hy, burstCount, energy * 0.9 * scale, accentRgb)
    effects.triggerShockwave(hx, hy, (0.3 + energy * 0.55) * scale)

    if (loud) {
      effects.triggerShockwave(cx, cy, (0.55 + energy * 0.65) * scale)
      effects.triggerParticleBurst(cx, cy, Math.floor(16 + energy * 30 * scale), energy * 0.8 * scale, burstRgb(palette, 2))
      effects.triggerScreenPunch(0.4 + energy * 0.45 * scale)
      macro = bumpMacroState(macro, 0.55 + energy * 0.35, 0.3 + energy * 0.2, 0.06 * scale)
    } else if (behavior === 'spinKick' || behavior === 'scaleOnBeat') {
      effects.triggerScreenPunch((0.28 + energy * 0.4) * scale)
      macro = bumpMacroState(macro, 0.4 + energy * 0.3, 0.18 + energy * 0.15, 0.04 * scale)
    } else {
      macro = bumpMacroState(macro, 0.28 + energy * 0.25, 0.12 + energy * 0.1, 0.025 * scale)
    }
  }

  if (frame.bassHit) {
    effects.triggerParticleBurst(cx, h * 0.88, Math.floor(8 + frame.bass * 22 * scale), frame.bass * 0.75 * scale, burstRgb(palette, 3))
    effects.triggerShockwave(cx, h * 0.78, (0.28 + frame.bass * 0.5) * scale)
    if (behavior === 'bassGravity' || behavior === 'dropExplosion') {
      effects.triggerScreenPunch(frame.bass * 0.55 * scale)
      macro = bumpMacroState(macro, frame.bass * 0.55, frame.bass * 0.4, 0.035 * scale)
    }
  }

  if (frame.midsHit) {
    const live = objects.filter(o => o.alive && !o.isHero)
    const target = live[Math.floor(Math.random() * Math.max(1, live.length))]
    if (target) {
      effects.triggerParticleBurst(target.x, target.y, Math.floor(8 + energy * 16 * scale), energy * 0.7 * scale, burstRgb(palette, 1))
      if (behavior === 'snareShuffle') {
        effects.triggerShockwave(target.x, target.y, 0.35 + energy * 0.4)
      }
    }
  }

  return macro
}

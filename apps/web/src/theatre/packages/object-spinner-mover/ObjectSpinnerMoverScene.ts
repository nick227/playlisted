import { AnimationContext, IAnimation } from '../../core/IAnimation'
import CanvasAnimation from '../../core/CanvasAnimation'
import type { ObjectTheatrePreset } from './engine/types'
import { getPalette, pickObjectColor } from './engine/palettes'
import { drawBackground } from './engine/backgrounds'
import { drawShape } from './engine/shapes'
import { applyMotion } from './engine/motion'
import { applyPersonality } from './engine/personality'
import { applyBeatToObject, beatSpawnCount, createBeatState, updateBeatState } from './engine/beat'
import { triggerBeatEffects } from './engine/beatEffects'
import { objectRenderAlpha, objectRenderBlur, objectRenderScale } from './engine/depth'
import {
  createMacroEffectState,
  decayMacroState,
  drawMacroFlash,
  drawMacroPulseRing,
  drawMacroVignette,
} from './engine/macroEffects'
import { createObjectPool, respawnObject, updateHero } from './engine/state'

const DEFAULT_PRESET: ObjectTheatrePreset = {
  backgroundPreset: 'radialGradient',
  shapePack: 'party',
  motionPreset: 'float',
  beatBehavior: 'scaleOnBeat',
  spawnStyle: 'randomPop',
  palette: 'candy',
  depthBands: 3,
}

function readPreset(context: AnimationContext): ObjectTheatrePreset {
  const raw = context.options?.objectTheatre
  if (raw && typeof raw === 'object') return { ...DEFAULT_PRESET, ...(raw as ObjectTheatrePreset) }
  return DEFAULT_PRESET
}

export function objectSpinnerMoverFactory(): IAnimation {
  class ObjectSpinnerMoverScene extends CanvasAnimation {
    private preset: ObjectTheatrePreset = DEFAULT_PRESET
    private objects = createObjectPool(DEFAULT_PRESET, 800, 600)
    private beatState = createBeatState()
    private macroState = createMacroEffectState()
    private prevDropBurst = 0
    private lastTime = 0
    private initialized = false

    constructor() {
      super({ useEffects: true, defaultBlendMode: 'normal', defaultZIndex: 101 })
    }

    override async init(container: HTMLElement, context: AnimationContext) {
      await super.init(container, context)
      this.preset = readPreset(context)
      this.beatState = createBeatState()
      this.macroState = createMacroEffectState()
      this.prevDropBurst = 0
      this.initialized = false
    }

    private ensurePool() {
      const w = this.cssWidth; const h = this.cssHeight
      if (w === 0 || h === 0) return
      if (this.initialized) return
      this.objects = createObjectPool(this.preset, w, h)
      this.initialized = true
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth; const h = this.cssHeight
      if (w === 0 || h === 0) return
      this.ensurePool()

      const now = context.shared?.time?.elapsed ?? performance.now()
      const delta = this.lastTime === 0 ? 16 : Math.min(now - this.lastTime, 50)
      this.lastTime = now

      const bands = this.readBands(context)
      const intensity = context.options?.intensity ?? 1
      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) ?? {
        bassHit: false, midsHit: false, beat: false, chaosHit: false, energy: 0,
      }

      const frame = {
        w, h, cx: w / 2, cy: h / 2, time: now, delta,
        energy: triggers.energy ?? bands.bass,
        bass: bands.bass, mids: bands.mids,
        beat: triggers.beat, bassHit: triggers.bassHit, midsHit: triggers.midsHit,
        chaosHit: triggers.chaosHit,
        bgFlash: this.beatState.bgFlash,
        dropBurst: this.beatState.dropBurst,
        particleScale: context.shared?.particleScale ?? 1,
        reducedMotion: Boolean(context.shared?.reducedMotion),
      }

      this.beatState = updateBeatState(this.beatState, frame, this.preset.beatBehavior)
      frame.bgFlash = this.beatState.bgFlash
      frame.dropBurst = this.beatState.dropBurst

      this.macroState = decayMacroState(this.macroState, delta)
      this.macroState = triggerBeatEffects({
        effects: this.effects,
        macro: this.macroState,
        frame,
        behavior: this.preset.beatBehavior,
        beatState: this.beatState,
        palette: getPalette(this.preset.palette),
        objects: this.objects,
        intensity,
        prevDropBurst: this.prevDropBurst,
      })
      this.prevDropBurst = this.beatState.dropBurst

      const palette = getPalette(this.preset.palette)
      drawBackground(this.preset.backgroundPreset, {
        ctx: this.ctx, w, h, cx: frame.cx, cy: frame.cy, time: now,
        flash: this.beatState.bgFlash + this.beatState.dropBurst * 0.5 + this.macroState.pulse * 0.35,
        palette,
      })

      drawMacroPulseRing(this.ctx, frame.cx, frame.cy, w, h, this.macroState, palette, now)

      const shakeAllowed = this.allowsShake(context)
      const shake = shakeAllowed && this.effects ? this.effects.getShake() : 0
      const zoom = this.macroState.zoom

      this.ctx.save()
      if (zoom > 0.01) {
        const s = 1 + zoom * 0.08 * intensity
        this.ctx.translate(frame.cx, frame.cy)
        this.ctx.scale(s, s)
        this.ctx.translate(-frame.cx, -frame.cy)
      }
      if (shake > 0) {
        this.ctx.translate(
          (Math.random() - 0.5) * 14 * shake,
          (Math.random() - 0.5) * 11 * shake,
        )
      }

      const bandCount = this.preset.depthBands ?? 3
      const sorted = [...this.objects].sort((a, b) => a.zBand - b.zBand)

      for (let i = 0; i < sorted.length; i++) {
        const obj = sorted[i]!
        if (!obj.alive) continue

        if (obj.isHero && this.preset.heroObject) {
          updateHero(obj, this.preset.heroObject, { w, h, cx: frame.cx, cy: frame.cy, time: now })
        } else {
          applyMotion(obj, this.preset.motionPreset, frame)
          applyPersonality(obj, frame)
          applyBeatToObject(obj, this.preset.beatBehavior, frame, this.beatState)
        }

        const size = 18 * objectRenderScale(obj, bandCount) * frame.particleScale
        const alpha = objectRenderAlpha(obj, bandCount)
        const blur = objectRenderBlur(obj, bandCount)

        this.ctx.save()
        this.ctx.translate(obj.x, obj.y)
        this.ctx.rotate(obj.rot)
        this.ctx.globalAlpha = alpha
        if (blur > 0) this.ctx.filter = `blur(${blur}px)`
        drawShape(obj.shape, {
          ctx: this.ctx, size,
          fill: pickObjectColor(palette, obj.colorIndex),
          stroke: palette.stroke,
          time: now,
        })
        this.ctx.restore()
        this.ctx.filter = 'none'
        this.ctx.globalAlpha = 1
      }

      this.ctx.restore()

      const spawnN = beatSpawnCount(this.preset.beatBehavior, frame, this.beatState)
      if (spawnN > 0) {
        let spawned = 0
        for (let i = 0; i < this.objects.length && spawned < spawnN; i++) {
          const obj = this.objects[i]!
          if (!obj.isHero && !obj.alive) {
            respawnObject(obj, i, this.preset, w, h, frame.beat)
            spawned++
          }
        }
      }

      drawMacroFlash(this.ctx, w, h, this.macroState, palette)
      drawMacroVignette(this.ctx, w, h, this.macroState, palette)
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }

  return new ObjectSpinnerMoverScene()
}

export default objectSpinnerMoverFactory

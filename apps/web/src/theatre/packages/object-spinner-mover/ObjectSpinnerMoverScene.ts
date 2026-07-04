import { AnimationContext, IAnimation } from '../../core/IAnimation'
import type { PublicAnimationContext } from '../../author/types'
import CanvasAnimation from '../../core/CanvasAnimation'
import type { ObjectTheatrePreset, EngineFrame } from './engine/types'
import { getPalette, pickObjectColor } from './engine/palettes'
import { drawBackground } from './engine/backgrounds'
import { drawShape } from './engine/shapes'
import { applyMotion, usesDirectPositionMotion } from './engine/motion'
import { applyPersonality } from './engine/personality'
import { applyFormationPattern, applySyncedSpin } from './engine/patterns'
import { applyBeatToObject, beatSpawnCount, createBeatState, updateBeatState } from './engine/beat'
import { triggerBeatEffects } from './engine/beatEffects'
import { objectRenderAlpha, objectRenderScale } from './engine/depth'
import {
  createMacroEffectState,
  decayMacroState,
  drawMacroFlash,
  drawMacroPulseRing,
  drawMacroVignette,
} from './engine/macroEffects'
import { resolveObjectTheatrePerf, type ObjectTheatrePerf } from './engine/performance'
import {
  collectiveEqPulse,
  createEqWaveState,
  drawEqWave,
  updateEqWave,
  type EqWaveState,
} from './engine/eqWave'
import { createObjectPool, respawnObject, updateHero } from './engine/state'
import { getObjectTheatreSeedConfig } from './seeds'

const DEFAULT_PRESET: ObjectTheatrePreset = {
  backgroundPreset: 'radialGradient',
  shapePack: 'party',
  motionPreset: 'float',
  beatBehavior: 'scaleOnBeat',
  spawnStyle: 'randomPop',
  palette: 'candy',
  depthBands: 2,
}

function readPreset(context: AnimationContext, fallback?: ObjectTheatrePreset): ObjectTheatrePreset {
  const raw = context.options?.objectTheatre
  if (raw && typeof raw === 'object') {
    return { ...DEFAULT_PRESET, ...(raw as ObjectTheatrePreset) }
  }
  const presetId = context.options?.objectTheatrePresetId
  if (typeof presetId === 'string') {
    const fromSeed = getObjectTheatreSeedConfig(presetId)
    if (fromSeed) return { ...DEFAULT_PRESET, ...fromSeed }
  }
  return fallback ?? DEFAULT_PRESET
}

export function objectSpinnerMoverFactory(ctx?: AnimationContext): IAnimation {
  const boundPreset = readPreset(ctx ?? { options: {} })

  class ObjectSpinnerMoverScene extends CanvasAnimation {
    private preset: ObjectTheatrePreset = boundPreset
    private objects: ReturnType<typeof createObjectPool> = []
    private beatState = createBeatState()
    private macroState = createMacroEffectState()
    private prevDropBurst = 0
    private lastTime = 0
    private poolCount = -1
    private perf: ObjectTheatrePerf = resolveObjectTheatrePerf(boundPreset, { options: {} })
    private eqWave: EqWaveState = createEqWaveState()
    private freqBuf: Uint8Array<ArrayBuffer> | null = null

    constructor() {
      super({ useEffects: false, defaultBlendMode: 'normal', defaultZIndex: 101 })
    }

    override async init(container: HTMLElement, context: AnimationContext) {
      await super.init(container, context)
      this.preset = readPreset(context, boundPreset)
      this.beatState = createBeatState()
      this.macroState = createMacroEffectState()
      this.prevDropBurst = 0
      this.poolCount = -1
      this.objects = []
      this.eqWave = createEqWaveState()
      this.freqBuf = null
    }

    private ensureFreqBuf(context: AnimationContext) {
      const analyser = context.analyser
      if (!analyser) return
      if (!this.freqBuf || this.freqBuf.length !== analyser.frequencyBinCount) {
        this.freqBuf = new Uint8Array(analyser.frequencyBinCount)
      }
    }

    private ensurePool(context: AnimationContext) {
      const w = this.cssWidth; const h = this.cssHeight
      if (w === 0 || h === 0) return
      this.perf = resolveObjectTheatrePerf(this.preset, context)
      if (this.poolCount === this.perf.objectCount) return
      this.objects = createObjectPool(this.preset, w, h, this.perf.objectCount)
      this.poolCount = this.perf.objectCount
    }

    getObjectTheatreDebugState() {
      return {
        shapePack: this.preset.shapePack,
        motionPreset: this.preset.motionPreset,
        palette: this.preset.palette,
        backgroundPreset: this.preset.backgroundPreset,
        objectCount: this.objects.length,
        sampleShapes: this.objects.filter(obj => !obj.isHero).slice(0, 8).map(obj => obj.shape),
      }
    }

    private drawObject(
      obj: ReturnType<typeof createObjectPool>[number],
      frame: EngineFrame,
      perf: ObjectTheatrePerf,
      motion: ObjectTheatrePreset['motionPreset'],
      directMotion: boolean,
      liveSlot: number,
      liveCount: number,
      palette: ReturnType<typeof getPalette>,
      delta: number,
      eqPulse: number,
    ) {
      const { w, h } = frame

      if (obj.isHero && this.preset.heroObject) {
        updateHero(obj, this.preset.heroObject, { w, h, cx: frame.cx, cy: frame.cy, time: frame.time })
        obj.rot += obj.rotSpeed * (delta / 1000) * 0.15
      } else {
        applyMotion(obj, motion, frame)
        applyPersonality(obj, frame)
        applyBeatToObject(obj, this.preset.beatBehavior, frame, this.beatState)
        if (!directMotion && perf.usePatternDrift) {
          applyFormationPattern(obj, liveSlot, liveCount, frame, perf.depthBands)
        } else {
          applySyncedSpin(obj, frame, perf.depthBands)
        }
      }

      const size = Math.min(w, h) * perf.sizeMul * eqPulse * objectRenderScale(obj, perf.depthBands) * frame.particleScale
      const alpha = objectRenderAlpha(obj, perf.depthBands)

      this.ctx.save()
      this.ctx.translate(obj.x, obj.y)
      this.ctx.rotate(obj.rot)
      this.ctx.globalAlpha = alpha
      drawShape(obj.shape, {
        ctx: this.ctx, size,
        fill: pickObjectColor(palette, obj.colorIndex),
        stroke: palette.stroke,
        time: frame.time,
      })
      this.ctx.restore()
    }

    private buildFrame(context: PublicAnimationContext, now: number, delta: number) {
      const w = this.cssWidth; const h = this.cssHeight
      const bands = this.readBands(context)
      const triggers = context.shared.getTriggers(context.options.preset ?? 'vivid')

      return {
        w, h, cx: w / 2, cy: h / 2, time: now, delta,
        energy: triggers.energy ?? bands.bass,
        bass: bands.bass, mids: bands.mids,
        beat: triggers.beat, bassHit: triggers.bassHit, midsHit: triggers.midsHit,
        chaosHit: triggers.chaosHit,
        bgFlash: this.beatState.bgFlash,
        dropBurst: this.beatState.dropBurst,
        particleScale: context.shared.particleScale,
        reducedMotion: context.shared.reducedMotion,
      }
    }

    protected draw(context: PublicAnimationContext) {
      const w = this.cssWidth; const h = this.cssHeight
      if (w === 0 || h === 0) return
      this.ensurePool(context)

      const now = context.shared?.time?.elapsed ?? performance.now()
      const delta = this.lastTime === 0 ? 16 : Math.min(now - this.lastTime, 50)
      this.lastTime = now

      const intensity = context.options?.intensity ?? 1
      const perf = this.perf
      const frame = this.buildFrame(context, now, delta)

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
        useMacroFx: perf.useMacroFx,
      })
      this.prevDropBurst = this.beatState.dropBurst

      const palette = getPalette(this.preset.palette)
      this.ctx.clearRect(0, 0, w, h)
      drawBackground(this.preset.backgroundPreset, {
        ctx: this.ctx, w, h, cx: frame.cx, cy: frame.cy, time: now,
        flash: this.beatState.bgFlash + this.beatState.dropBurst * 0.5 + this.macroState.pulse * 0.35,
        palette,
      })

      let eqPulse = 1
      if (perf.useEqWave && this.context) {
        this.ensureFreqBuf(this.context)
        updateEqWave(this.eqWave, this.context.analyser, this.freqBuf, {
          time: now,
          bass: frame.bass,
          mids: frame.mids,
          beat: frame.beat,
          bassHit: frame.bassHit,
        })
        eqPulse = collectiveEqPulse(this.eqWave)
        drawEqWave(this.ctx, w, h, this.eqWave, palette, {
          alpha: frame.reducedMotion ? 0.35 : 0.68,
          reducedMotion: frame.reducedMotion,
        })
      }

      if (perf.useMacroFx) {
        drawMacroPulseRing(this.ctx, frame.cx, frame.cy, w, h, this.macroState, palette, now)
      }

      const motion = this.preset.motionPreset
      const directMotion = usesDirectPositionMotion(motion)
      const bandCount = perf.depthBands

      let liveCount = 0
      for (let i = 0; i < this.objects.length; i++) {
        const obj = this.objects[i]!
        if (obj.alive && !obj.isHero) liveCount++
      }

      let liveSlot = 0
      for (let band = 0; band < bandCount; band++) {
        for (let i = 0; i < this.objects.length; i++) {
          const obj = this.objects[i]!
          if (!obj.alive || obj.isHero || obj.zBand !== band) continue
          this.drawObject(obj, frame, perf, motion, directMotion, liveSlot, liveCount, palette, delta, eqPulse)
          if (!obj.isHero) liveSlot++
        }
      }

      for (let i = 0; i < this.objects.length; i++) {
        const obj = this.objects[i]!
        if (!obj.alive || !obj.isHero) continue
        this.drawObject(obj, frame, perf, motion, directMotion, liveSlot, liveCount, palette, delta, eqPulse)
      }

      if (perf.useMacroFx) {
        drawMacroFlash(this.ctx, w, h, this.macroState, palette)
        drawMacroVignette(this.ctx, w, h, this.macroState, palette)
      }

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
    }
  }

  return new ObjectSpinnerMoverScene()
}

export default objectSpinnerMoverFactory

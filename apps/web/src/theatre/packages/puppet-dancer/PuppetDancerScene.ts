import CanvasAnimation from '../../core/CanvasAnimation'
import type { AnimationContext, IAnimation } from '../../core/IAnimation'
import { getVisualTriggers } from '../../audio/VisualTriggers'
import { humanRig } from './rig/humanRig'
import { PuppetRigSolver } from './rig/PuppetRigSolver'
import { defaultHumanSkin } from './skins/defaultHumanSkin'
import { DancePlayer } from './sequences/DancePlayer'
import { dynamicRandomSequenceId, getDanceSequence, isDynamicDance, pickAutoDanceSequenceId } from './sequences'
import { PuppetRenderer } from './render/PuppetRenderer'
import type { Features } from '../../audio/AudioFeatureExtractor'
import type { TriggerFrame } from '../../audio/VisualTriggers'
import type { DynamicDanceAttributes } from './sequences/dynamicRandom.sequence'

export class PuppetDancerScene extends CanvasAnimation {
  private solver = new PuppetRigSolver(humanRig)
  private player = new DancePlayer(getDanceSequence(dynamicRandomSequenceId), humanRig)
  private renderer: PuppetRenderer | null = null
  private lastElapsed = 0
  private selectedDanceId: string | null = null
  private loadedDanceKey: string | null = null
  private loadedReducedMotion = false
  private autoDance = true
  private autoSwitchCooldownMs = 900
  private autoSwitchRestMs = 700

  constructor() {
    super({ defaultOpacity: 1, defaultBlendMode: 'normal', defaultZIndex: 101 })
  }

  async init(container: HTMLElement, context: AnimationContext) {
    await super.init(container, context)
    this.renderer = new PuppetRenderer(this.ctx, defaultHumanSkin)
    this.selectedDanceId = typeof context.options?.sequence === 'string' ? context.options.sequence : dynamicRandomSequenceId
    this.activateDance(this.selectedDanceId, Boolean(context.shared?.reducedMotion || context.options?.reducedMotion), true)
  }

  destroy() {
    super.destroy()
  }

  protected draw(context: AnimationContext): void {
    const w = this.cssWidth
    const h = this.cssHeight
    if (w <= 0 || h <= 0 || !this.renderer) return

    const shared = context.shared
    const reducedMotion = Boolean(shared?.reducedMotion || context.options?.reducedMotion)
    const lowPower = Boolean(shared?.lowPower)
    const elapsed = shared?.time?.elapsed ?? performance.now()
    const delta = Math.min(80, shared?.time?.delta ?? Math.max(16, elapsed - this.lastElapsed))
    this.lastElapsed = elapsed

    const danceId = this.selectedDanceId ?? context.options?.sequence
    this.activateDance(typeof danceId === 'string' ? danceId : dynamicRandomSequenceId, reducedMotion)
    const triggerPreset = String(context.options?.preset ?? (reducedMotion ? 'tame' : 'vivid'))
    const triggers = shared?.getTriggers?.(triggerPreset) ?? getVisualTriggers(shared?.features, triggerPreset)
    this.updateAutoDance(delta, shared?.features, triggers, reducedMotion)
    const pose = this.player.update(delta, triggers, reducedMotion)

    const bands = this.readBands(context)
    const energy = reducedMotion ? 0.08 : Math.min(1, triggers.energy + bands.bass * 0.4)
    const stageY = Math.min(h - 34, h * 0.78 + Math.min(140, h * 0.18))
    const stageScale = Math.min(w, h) / 360 * pose.scale
    const rootX = w * 0.5 + pose.offset.x
    const rootY = stageY - 126 * stageScale + pose.offset.y
    const joints = this.solver.solve(pose, rootX, rootY, stageScale)

    this.ctx.clearRect(0, 0, w, h)
    this.renderer.drawStage(w, h, energy, lowPower, stageY)
    this.renderer.drawPuppet(joints, pose, stageScale)
    if (context.options?.debug || context.options?.theatreDev) {
      this.renderer.drawDebug(joints, this.player.getDebugState(), pose)
    }
  }

  getDebugState() {
    return this.player.getDebugState()
  }

  private updateAutoDance(deltaMs: number, features: Features | undefined, triggers: TriggerFrame, reducedMotion: boolean) {
    if (!this.autoDance || reducedMotion) return
    this.autoSwitchCooldownMs = Math.max(0, this.autoSwitchCooldownMs - deltaMs)
    this.autoSwitchRestMs = Math.max(0, this.autoSwitchRestMs - deltaMs)
    if (this.autoSwitchCooldownMs > 0 || this.autoSwitchRestMs > 0) return

    const energy = features?.env ?? triggers.energy
    const bass = features?.bands.bass ?? 0
    const highs = features?.bands.highs ?? 0
    const centroid = features?.centroid ?? triggers.brightness
    const flux = features?.flux.overall ?? 0
    const bassFlux = features?.flux.bass ?? 0
    const highsFlux = features?.flux.highs ?? 0
    const shouldSwitch =
      triggers.chaosHit ||
      (triggers.beat && (flux > 0.055 || Math.random() < 0.18)) ||
      (triggers.bassHit && bassFlux > 0.045) ||
      (triggers.highsHit && highsFlux > 0.035) ||
      (energy > 0.09 && Math.random() < 0.014)
    if (!shouldSwitch) return

    const attributes = {
      energy,
      bass,
      highs,
      centroid,
      flux,
      bassFlux,
      highsFlux,
    }
    const next = pickAutoDanceSequenceId(attributes, this.selectedDanceId)
    this.activateDance(next, reducedMotion, isDynamicDance(next), attributes)
    this.autoSwitchCooldownMs = 1250 + Math.random() * 2600
    this.autoSwitchRestMs = 180 + Math.random() * 360
  }

  private activateDance(id: string, reducedMotion: boolean, forceNew = false, attributes?: DynamicDanceAttributes) {
    const key = id || dynamicRandomSequenceId
    if (!forceNew && this.loadedDanceKey === key && this.loadedReducedMotion === reducedMotion) return
    this.selectedDanceId = key
    this.player.setSequence(getDanceSequence(key, reducedMotion, attributes))
    this.loadedDanceKey = key
    this.loadedReducedMotion = reducedMotion
  }
}

export function puppetDancerFactory(): IAnimation {
  return new PuppetDancerScene()
}

export default puppetDancerFactory

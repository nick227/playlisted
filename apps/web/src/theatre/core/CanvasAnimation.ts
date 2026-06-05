import { AnimationContext, IAnimation } from './IAnimation'
import EffectsManager from '../runtime/MicroEffects'
import { bandsFromContext, type AudioBands } from '../audio/getAudioBands'
import { resolveDevicePixelRatio } from '../runtime/resolveDpr'

export type CanvasAnimationInitOptions = {
  useEffects?: boolean
  defaultOpacity?: number
  defaultBlendMode?: string
  defaultZIndex?: number
}

export abstract class CanvasAnimation implements IAnimation {
  protected canvas!: HTMLCanvasElement
  protected ctx!: CanvasRenderingContext2D
  protected raf = 0
  protected running = false
  protected containerRef: HTMLElement | null = null
  protected effects: EffectsManager | null = null
  protected context: AnimationContext | null = null
  protected cssWidth = 0
  protected cssHeight = 0
  protected pixelRatio = 1
  protected externallyDriven = false
  private initOptions: CanvasAnimationInitOptions

  constructor(initOptions: CanvasAnimationInitOptions = {}) {
    this.initOptions = initOptions
  }

  async init(container: HTMLElement, context: AnimationContext) {
    this.containerRef = container
    this.context = context
    this.canvas = document.createElement('canvas')
    this.canvas.style.position = 'absolute'
    this.canvas.style.inset = '0'
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    const opacity = context.options?.opacity ?? this.initOptions.defaultOpacity
    if (opacity !== undefined) this.canvas.style.opacity = String(opacity)
    const blendMode = context.options?.blendMode ?? this.initOptions.defaultBlendMode
    if (blendMode) this.canvas.style.mixBlendMode = blendMode
    const zIndex = context.options?.zIndex ?? this.initOptions.defaultZIndex
    if (zIndex !== undefined) this.canvas.style.zIndex = String(zIndex)
    container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    requestAnimationFrame(() => this.resize())
    window.addEventListener('resize', this.resize)

    if (this.initOptions.useEffects === true) {
      this.effects = new EffectsManager()
      this.syncEffectsPolicy(context)
      if (this.containerRef) {
        const rect = this.containerRef.getBoundingClientRect()
        this.effects.setSize(rect.width, rect.height)
      }
    }
  }

  private resize = () => {
    if (!this.canvas || !this.containerRef) return
    const rect = this.containerRef.getBoundingClientRect()
    const cssW = Math.max(0, rect.width)
    const cssH = Math.max(0, rect.height)
    const dpr = resolveDevicePixelRatio(this.context?.shared?.dprClamp ?? 2)
    this.cssWidth = cssW
    this.cssHeight = cssH
    this.pixelRatio = dpr
    this.canvas.style.width = cssW + 'px'
    this.canvas.style.height = cssH + 'px'
    this.canvas.width = Math.floor(cssW * dpr)
    this.canvas.height = Math.floor(cssH * dpr)
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.effects) this.effects.setSize(cssW, cssH)
  }

  enableExternalDriving() {
    this.externallyDriven = true
  }

  renderFrame(ctx: AnimationContext) {
    if (!this.running || !this.context) return
    if (ctx.shared) this.context.shared = ctx.shared
    this.syncEffectsPolicy(this.context)
    this.draw(this.context)
  }

  async start() {
    this.running = true
    if (this.externallyDriven) return
    const loop = () => {
      if (!this.running) return
      if (this.context) this.draw(this.context)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  pause() {
    this.running = false
  }

  resume() {
    if (!this.running) {
      this.running = true
      void this.start()
    }
  }

  async stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    return Promise.resolve()
  }

  destroy() {
    window.removeEventListener('resize', this.resize)
    if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas)
  }

  protected syncEffectsPolicy(context: AnimationContext) {
    if (!this.effects) return
    this.effects.setPolicy(
      context.shared?.particleScale ?? 1,
      context.shared?.lowPower ?? false,
    )
  }

  protected readBands(context: AnimationContext): AudioBands {
    return bandsFromContext(context)
  }

  protected allowsShake(context: AnimationContext): boolean {
    const shared = context.shared
    if (!shared || shared.reducedMotion) return false
    if ((shared.particleScale ?? 1) <= 0) return false
    if (shared.lowPower) return false
    return true
  }

  protected allowsHeavyParticles(context: AnimationContext): boolean {
    return (context.shared?.particleScale ?? 1) > 0
  }

  protected particleScale(context: AnimationContext): number {
    return context.shared?.particleScale ?? 1
  }

  protected abstract draw(context: AnimationContext): void
}

export default CanvasAnimation

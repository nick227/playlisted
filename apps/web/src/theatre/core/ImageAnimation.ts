import { AnimationContext, IAnimation } from './IAnimation'
import {
  IMAGE_FALLBACK_GRADIENT,
  computeImageFrameTransform,
  formatImageTransform,
  resolveImageUrl,
} from './imageAnimationUtils'

export type ImageAnimationInitOptions = {
  defaultOpacity?: number
  defaultBlendMode?: string
  defaultZIndex?: number
}

export class ImageAnimation implements IAnimation {
  private root: HTMLElement | null = null
  private fallbackEl: HTMLElement | null = null
  private img: HTMLImageElement | null = null
  private running = false
  private externallyDriven = false
  private resolvedSrc = ''
  private imageVisible = false
  private containerRef: HTMLElement | null = null
  private context: AnimationContext | null = null
  private initOptions: ImageAnimationInitOptions

  constructor(initOptions: ImageAnimationInitOptions = {}) {
    this.initOptions = initOptions
  }

  enableExternalDriving() {
    this.externallyDriven = true
  }

  async init(container: HTMLElement, context: AnimationContext) {
    this.containerRef = container
    this.context = context

    this.root = document.createElement('div')
    this.root.style.position = 'absolute'
    this.root.style.inset = '0'
    this.root.style.overflow = 'hidden'
    this.root.style.pointerEvents = 'none'

    const opacity = context.options?.opacity ?? this.initOptions.defaultOpacity
    if (opacity !== undefined) this.root.style.opacity = String(opacity)
    const blendMode = context.options?.blendMode ?? this.initOptions.defaultBlendMode
    if (blendMode) this.root.style.mixBlendMode = blendMode
    const zIndex = context.options?.zIndex ?? this.initOptions.defaultZIndex
    if (zIndex !== undefined) this.root.style.zIndex = String(zIndex)

    this.fallbackEl = document.createElement('div')
    this.fallbackEl.style.position = 'absolute'
    this.fallbackEl.style.inset = '0'
    this.fallbackEl.style.backgroundColor = '#0a0a0e'
    this.fallbackEl.style.backgroundImage = IMAGE_FALLBACK_GRADIENT

    this.img = document.createElement('img')
    this.img.style.position = 'absolute'
    this.img.style.inset = '0'
    this.img.style.width = '100%'
    this.img.style.height = '100%'
    this.img.style.objectFit = 'cover'
    this.img.style.transformOrigin = 'center center'
    this.img.style.willChange = 'transform, filter'
    this.img.style.display = 'none'
    this.img.crossOrigin = 'anonymous'
    this.img.decoding = 'async'
    this.img.alt = ''

    this.img.onload = () => {
      this.imageVisible = true
      if (this.img) this.img.style.display = 'block'
    }
    this.img.onerror = () => {
      this.imageVisible = false
      if (this.img) this.img.style.display = 'none'
    }

    this.root.appendChild(this.fallbackEl)
    this.root.appendChild(this.img)
    container.appendChild(this.root)

    this.applyImageSource(context)
  }

  async start() {
    this.running = true
  }

  pause() {
    this.running = false
  }

  resume() {
    this.running = true
  }

  async stop() {
    this.running = false
  }

  destroy() {
    this.running = false
    if (this.img) {
      this.img.onload = null
      this.img.onerror = null
      this.img.src = ''
      this.img.removeAttribute('src')
    }
    if (this.root?.parentElement) {
      this.root.parentElement.removeChild(this.root)
    }
    this.root = null
    this.fallbackEl = null
    this.img = null
    this.containerRef = null
    this.context = null
    this.resolvedSrc = ''
    this.imageVisible = false
  }

  renderFrame(context: AnimationContext) {
    if (!this.running || !this.externallyDriven || !this.img) return

    this.applyImageSource(context)

    const preset = context.options?.preset ?? 'tame'
    const triggers = context.shared?.getTriggers?.(preset)
    const energy = triggers?.energy ?? 0
    const beatEdge = Boolean(context.shared?.audio?.edges?.beat)
    const elapsedMs = context.shared?.time?.elapsed ?? performance.now()
    const reducedMotion = Boolean(context.shared?.reducedMotion)
    const lowPower = Boolean(context.shared?.lowPower)

    const transform = computeImageFrameTransform({
      elapsedMs,
      reducedMotion,
      lowPower,
      energy,
      beatEdge,
    })

    this.img.style.transform = formatImageTransform(transform)
    this.img.style.filter = transform.brightness !== 1 ? `brightness(${transform.brightness})` : ''
  }

  private applyImageSource(context: AnimationContext) {
    if (!this.img) return
    const nextSrc = resolveImageUrl(context)
    if (!nextSrc) {
      this.resolvedSrc = ''
      this.imageVisible = false
      this.img.style.display = 'none'
      this.img.removeAttribute('src')
      return
    }
    if (nextSrc === this.resolvedSrc) return
    this.resolvedSrc = nextSrc
    this.imageVisible = false
    this.img.style.display = 'none'
    this.img.src = nextSrc
  }
}

export default ImageAnimation

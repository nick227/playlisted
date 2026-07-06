import { AnimationContext, IAnimation } from './IAnimation'
import {
  IMAGE_FALLBACK_GRADIENT,
  computeImageFrameTransform,
  formatImageTransform,
  resolveImageUrl,
} from './imageAnimationUtils'
import {
  computeVideoBeatFxFrame,
  formatVideoBeatFxFilter,
  formatVideoBeatFxTransform,
  parseVideoBeatFx,
  tickVideoBeatFxPulse,
  type VideoBeatFxPulseState,
} from './videoBeatFxUtils'

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
  private sourceCandidates: string[] = []
  private sourceCandidateKey = ''
  private sourceCandidateIndex = 0
  private initOptions: ImageAnimationInitOptions
  private pulseState: VideoBeatFxPulseState = { beatPulse: 0, dropPulse: 0 }

  constructor(initOptions: ImageAnimationInitOptions = {}) {
    this.initOptions = initOptions
  }

  enableExternalDriving() {
    this.externallyDriven = true
  }

  private boundImageUrl: string | null = null

  async init(container: HTMLElement, context: AnimationContext) {
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
      if (this.img) this.img.style.display = 'block'
    }
    this.img.onerror = () => {
      this.tryNextImageCandidate()
    }

    this.root.appendChild(this.fallbackEl)
    this.root.appendChild(this.img)
    container.appendChild(this.root)

    const initSrc = resolveImageUrl(context)
    if (context.options?.mediaAttachmentId && initSrc) {
      this.boundImageUrl = initSrc
    }
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
    this.resolvedSrc = ''
    this.sourceCandidates = []
    this.sourceCandidateKey = ''
    this.sourceCandidateIndex = 0
    this.boundImageUrl = null
    this.pulseState = { beatPulse: 0, dropPulse: 0 }
  }

  renderFrame(context: AnimationContext) {
    if (!this.running || !this.externallyDriven || !this.img) return

    this.applyImageSource(context)

    const preset = context.options?.preset ?? 'tame'
    const triggers = context.shared?.getTriggers?.(preset)
    const energy = triggers?.energy ?? 0
    const beatEdge = Boolean(context.shared?.audio?.edges?.beat)
    const dropEdge = Boolean(context.shared?.audio?.edges?.drop)
    const elapsedMs = context.shared?.time?.elapsed ?? performance.now()
    const deltaMs = context.shared?.time?.delta ?? 16
    const reducedMotion = Boolean(context.shared?.reducedMotion)
    const lowPower = Boolean(context.shared?.lowPower)

    const beatFx = parseVideoBeatFx(context.options?.beatFx)
    if (beatFx) {
      this.pulseState = tickVideoBeatFxPulse(this.pulseState, { beatEdge, dropEdge, deltaMs })
      const frame = computeVideoBeatFxFrame({
        beatFx,
        reducedMotion,
        lowPower,
        energy,
        beatPulse: this.pulseState.beatPulse,
        dropPulse: this.pulseState.dropPulse,
      })
      this.img.style.transform = formatVideoBeatFxTransform(frame.scale)
      this.img.style.filter = formatVideoBeatFxFilter(frame)
      return
    }

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
    const candidates = this.resolveImageCandidates(context)
    const candidateKey = candidates.join('\n')
    if (candidateKey !== this.sourceCandidateKey) {
      this.sourceCandidates = candidates
      this.sourceCandidateKey = candidateKey
      this.sourceCandidateIndex = 0
    }
    const nextSrc = this.sourceCandidates[this.sourceCandidateIndex]
    if (!nextSrc) {
      this.resolvedSrc = ''
      this.img.style.display = 'none'
      this.img.removeAttribute('src')
      return
    }
    if (nextSrc === this.resolvedSrc) return
    this.resolvedSrc = nextSrc
    this.img.style.display = 'none'
    this.img.src = nextSrc
  }

  private resolveImageCandidates(context: AnimationContext): string[] {
    const urls: string[] = []
    const optionImageUrl = context.options?.imageUrl
    if (typeof optionImageUrl === 'string' && optionImageUrl.trim().length > 0) {
      urls.push(optionImageUrl.trim())
    }
    const optionCandidates = context.options?.imageUrlCandidates
    if (Array.isArray(optionCandidates)) {
      for (const candidate of optionCandidates) {
        if (typeof candidate !== 'string') continue
        const trimmed = candidate.trim()
        if (trimmed) urls.push(trimmed)
      }
    }
    const fallback = this.boundImageUrl ?? resolveImageUrl(context)
    if (fallback) urls.push(fallback)
    return [...new Set(urls)]
  }

  private tryNextImageCandidate() {
    if (!this.img) return
    const nextIndex = this.sourceCandidateIndex + 1
    if (nextIndex >= this.sourceCandidates.length) {
      this.img.style.display = 'none'
      return
    }
    this.sourceCandidateIndex = nextIndex
    this.resolvedSrc = ''
    this.applyImageSource({ options: { imageUrlCandidates: this.sourceCandidates } })
  }
}

export default ImageAnimation

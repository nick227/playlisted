import { AnimationContext, IAnimation } from './IAnimation'
import {
  computeVideoBeatFxFrame,
  formatVideoBeatFxFilter,
  formatVideoBeatFxTransform,
  parseVideoBeatFx,
  tickVideoBeatFxPulse,
  type VideoBeatFxPulseState,
} from './videoBeatFxUtils'

export type VideoAnimationInitOptions = {
  defaultOpacity?: number
  defaultBlendMode?: string
  defaultZIndex?: number
  defaultVideoUrl?: string
}

export class VideoAnimation implements IAnimation {
  protected video!: HTMLVideoElement
  protected running = false
  protected containerRef: HTMLElement | null = null
  protected context: AnimationContext | null = null
  private initOptions: VideoAnimationInitOptions
  private externallyDriven = false
  private pulseState: VideoBeatFxPulseState = { beatPulse: 0, dropPulse: 0 }

  constructor(initOptions: VideoAnimationInitOptions = {}) {
    this.initOptions = initOptions
  }

  enableExternalDriving() {
    this.externallyDriven = true
  }

  async init(container: HTMLElement, context: AnimationContext) {
    this.containerRef = container
    this.context = context
    this.pulseState = { beatPulse: 0, dropPulse: 0 }

    this.video = document.createElement('video')
    this.video.style.position = 'absolute'
    this.video.style.inset = '0'
    this.video.style.width = '100%'
    this.video.style.height = '100%'
    this.video.style.objectFit = 'cover'
    this.video.style.pointerEvents = 'none'
    this.video.style.transformOrigin = 'center center'

    const opacity = context.options?.opacity ?? this.initOptions.defaultOpacity
    if (opacity !== undefined) this.video.style.opacity = String(opacity)

    const blendMode = context.options?.blendMode ?? this.initOptions.defaultBlendMode
    if (blendMode) this.video.style.mixBlendMode = blendMode

    const zIndex = context.options?.zIndex ?? this.initOptions.defaultZIndex
    if (zIndex !== undefined) this.video.style.zIndex = String(zIndex)

    this.video.muted = context.options?.muted ?? true
    this.video.loop = context.options?.loop ?? true
    this.video.playsInline = true
    this.video.crossOrigin = 'anonymous'
    this.video.preload = 'metadata'

    const objectFit = context.options?.objectFit
    if (objectFit === 'cover' || objectFit === 'contain') {
      this.video.style.objectFit = objectFit
    }

    const videoUrl = context.options?.videoUrl ?? this.initOptions.defaultVideoUrl
    if (videoUrl) {
      this.video.src = videoUrl
    }

    const startOffsetMs = context.options?.startOffsetMs
    if (typeof startOffsetMs === 'number' && startOffsetMs > 0) {
      this.video.addEventListener('loadedmetadata', () => {
        try {
          this.video.currentTime = startOffsetMs / 1000
        } catch {
          /* ignore seek errors */
        }
      }, { once: true })
    }

    container.appendChild(this.video)
  }

  async start() {
    this.running = true
    if (this.video?.src) {
      try {
        await this.video.play()
      } catch (e) {
        console.warn('[VideoAnimation] Autoplay prevented or failed:', e)
      }
    }
  }

  pause() {
    this.running = false
    if (this.video) {
      this.video.pause()
    }
  }

  resume() {
    if (!this.running) {
      this.running = true
      if (this.video && this.video.src) {
        this.video.play().catch(e => console.warn('[VideoAnimation] Resume play failed:', e))
      }
    }
  }

  async stop() {
    this.running = false
    if (this.video) {
      this.video.pause()
      this.video.currentTime = 0
    }
    return Promise.resolve()
  }

  destroy() {
    this.running = false
    if (this.video) {
      console.info('[Theatre] video destroyed', {
        presetId: this.context?.options?.preset ?? 'unknown',
        currentSrc: this.video.currentSrc,
        readyState: this.video.readyState,
      })
      this.video.pause()
      this.video.src = ''
      this.video.removeAttribute('src')
      this.video.load()
      if (this.video.parentElement) {
        this.video.parentElement.removeChild(this.video)
      }
    }
    this.pulseState = { beatPulse: 0, dropPulse: 0 }
  }

  renderFrame(context: AnimationContext) {
    if (!this.running || !this.externallyDriven || !this.video) return

    const beatFx = parseVideoBeatFx(context.options?.beatFx)
    if (!beatFx) return

    const preset = context.options?.preset ?? 'tame'
    const triggers = context.shared?.getTriggers?.(preset)
    const energy = triggers?.energy ?? 0
    const beatEdge = Boolean(context.shared?.audio?.edges?.beat)
    const dropEdge = Boolean(context.shared?.audio?.edges?.drop)
    const deltaMs = context.shared?.time?.delta ?? 16
    const reducedMotion = Boolean(context.shared?.reducedMotion)
    const lowPower = Boolean(context.shared?.lowPower)

    this.pulseState = tickVideoBeatFxPulse(this.pulseState, { beatEdge, dropEdge, deltaMs })

    const frame = computeVideoBeatFxFrame({
      beatFx,
      reducedMotion,
      lowPower,
      energy,
      beatPulse: this.pulseState.beatPulse,
      dropPulse: this.pulseState.dropPulse,
    })

    this.video.style.willChange = 'transform, filter'
    this.video.style.transform = formatVideoBeatFxTransform(frame.scale)
    this.video.style.filter = formatVideoBeatFxFilter(frame)
  }
}

export default VideoAnimation

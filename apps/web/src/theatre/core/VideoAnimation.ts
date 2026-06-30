import { AnimationContext, IAnimation } from './IAnimation'

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

  constructor(initOptions: VideoAnimationInitOptions = {}) {
    this.initOptions = initOptions
  }

  async init(container: HTMLElement, context: AnimationContext) {
    this.containerRef = container
    this.context = context
    
    this.video = document.createElement('video')
    this.video.style.position = 'absolute'
    this.video.style.inset = '0'
    this.video.style.width = '100%'
    this.video.style.height = '100%'
    this.video.style.objectFit = 'cover'
    this.video.style.pointerEvents = 'none'

    const opacity = context.options?.opacity ?? this.initOptions.defaultOpacity
    if (opacity !== undefined) this.video.style.opacity = String(opacity)
    
    const blendMode = context.options?.blendMode ?? this.initOptions.defaultBlendMode
    if (blendMode) this.video.style.mixBlendMode = blendMode
    
    const zIndex = context.options?.zIndex ?? this.initOptions.defaultZIndex
    if (zIndex !== undefined) this.video.style.zIndex = String(zIndex)

    this.video.muted = true
    this.video.loop = true
    this.video.playsInline = true
    this.video.crossOrigin = 'anonymous'
    this.video.preload = 'metadata'

    const videoUrl = context.options?.videoUrl ?? this.initOptions.defaultVideoUrl
    if (videoUrl) {
      this.video.src = videoUrl
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
      this.video.pause()
      this.video.removeAttribute('src')
      this.video.load()
      if (this.video.parentElement) {
        this.video.parentElement.removeChild(this.video)
      }
    }
  }
}

export default VideoAnimation

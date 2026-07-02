import { AnimationContext, IAnimation } from './IAnimation'
import {
  readTimelineSyncOptions,
  resolveMediaPlaybackTime,
  shouldSeekMediaTime,
  shouldThrottleMediaSeek,
  type TimelineSyncOptions,
} from '../media/resolveMediaPlaybackTime'
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
  private pendingMediaTimeSec: number | null = null
  private metadataSyncAttached = false
  private lastSeekAtMs: number | null = null
  private mediaUnavailable = false
  private playPromisePending = false
  private lastPlayFailureAtMs: number | null = null

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
    this.pendingMediaTimeSec = null
    this.metadataSyncAttached = false
    this.lastSeekAtMs = null
    this.mediaUnavailable = false
    this.playPromisePending = false
    this.lastPlayFailureAtMs = null

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
    const timelineSync = readTimelineSyncOptions(context.options)
    this.video.loop = timelineSync ? false : (context.options?.loop ?? true)
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

    this.video.addEventListener?.('loadedmetadata', this.handleVideoMetadataLoaded)
    this.video.addEventListener?.('canplay', this.handleVideoCanPlay)
    this.video.addEventListener?.('playing', this.handleVideoCanPlay)
    this.video.addEventListener?.('waiting', this.handleVideoWaiting)
    this.video.addEventListener?.('stalled', this.handleVideoWaiting)
    this.video.addEventListener?.('error', this.handleVideoError)
    this.metadataSyncAttached = true

    if (!timelineSync) {
      const startOffsetMs = context.options?.startOffsetMs
      if (typeof startOffsetMs === 'number' && startOffsetMs > 0) {
        this.video.addEventListener?.('loadedmetadata', () => {
          try {
            this.video.currentTime = startOffsetMs / 1000
          } catch {
            /* ignore seek errors */
          }
        }, { once: true })
      }
    }

    container.appendChild(this.video)
  }

  async start() {
    this.running = true
    await this.safePlay()
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
        void this.safePlay()
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
      this.video.removeEventListener?.('loadedmetadata', this.handleVideoMetadataLoaded)
      this.video.removeEventListener?.('canplay', this.handleVideoCanPlay)
      this.video.removeEventListener?.('playing', this.handleVideoCanPlay)
      this.video.removeEventListener?.('waiting', this.handleVideoWaiting)
      this.video.removeEventListener?.('stalled', this.handleVideoWaiting)
      this.video.removeEventListener?.('error', this.handleVideoError)
      this.video.pause()
      this.video.src = ''
      this.video.removeAttribute('src')
      this.video.load()
      if (this.video.parentElement) {
        this.video.parentElement.removeChild(this.video)
      }
    }
    this.pulseState = { beatPulse: 0, dropPulse: 0 }
    this.pendingMediaTimeSec = null
    this.metadataSyncAttached = false
    this.lastSeekAtMs = null
    this.mediaUnavailable = false
    this.playPromisePending = false
    this.lastPlayFailureAtMs = null
  }

  renderFrame(context: AnimationContext) {
    if (!this.running || !this.externallyDriven || !this.video) return

    const timelineSync = readTimelineSyncOptions(context.options)
    if (timelineSync) {
      this.syncTimelinePlayback(context, timelineSync)
    }

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

  private syncTimelinePlayback(context: AnimationContext, timelineSync: TimelineSyncOptions) {
    const audio = context.audioElement
    if (!audio || !Number.isFinite(audio.currentTime)) return
    if (this.mediaUnavailable || this.video.error) return

    const resolved = resolveMediaPlaybackTime({
      audioCurrentSec: audio.currentTime,
      timelineStartSec: timelineSync.timelineStartSec,
      startOffsetSec: timelineSync.startOffsetSec,
      loop: timelineSync.loop,
      naturalDurationSec: timelineSync.naturalDurationSec,
      videoDurationSec: Number.isFinite(this.video.duration) ? this.video.duration : null,
    })

    if (!resolved) return

    const audioPaused = audio.paused
    if (audioPaused || !resolved.shouldPlay) {
      this.applyMediaTimeSeek(resolved.mediaTimeSec, { force: !resolved.shouldPlay })
      if (!this.video.paused) this.video.pause()
      return
    }

    this.applyMediaTimeSeek(resolved.mediaTimeSec)

    if (this.video.paused) {
      void this.safePlay()
    }
  }

  private applyMediaTimeSeek(targetSec: number, opts: { force?: boolean } = {}) {
    if (!Number.isFinite(targetSec)) return

    if (this.video.readyState < HTMLMediaElement.HAVE_METADATA) {
      this.pendingMediaTimeSec = targetSec
      if (!this.metadataSyncAttached) {
        this.video.addEventListener?.('loadedmetadata', this.handleVideoMetadataLoaded)
        this.metadataSyncAttached = true
      }
      return
    }

    if (!shouldSeekMediaTime(this.video.currentTime, targetSec)) {
      this.pendingMediaTimeSec = null
      return
    }

    const nowMs = performance.now()
    if (!opts.force && (this.video.seeking || shouldThrottleMediaSeek(nowMs, this.lastSeekAtMs))) {
      this.pendingMediaTimeSec = targetSec
      return
    }

    try {
      this.video.currentTime = targetSec
      this.lastSeekAtMs = nowMs
      this.pendingMediaTimeSec = null
    } catch {
      this.pendingMediaTimeSec = targetSec
    }
  }

  private handleVideoMetadataLoaded = () => {
    this.mediaUnavailable = false
    if (this.pendingMediaTimeSec == null) return
    this.applyMediaTimeSeek(this.pendingMediaTimeSec, { force: true })
  }

  private handleVideoCanPlay = () => {
    this.mediaUnavailable = false
  }

  private handleVideoWaiting = () => {
    // Keep state observable for future policy decisions without changing beat FX.
  }

  private handleVideoError = () => {
    this.mediaUnavailable = true
    this.pendingMediaTimeSec = null
  }

  private async safePlay() {
    if (!this.video?.src || this.mediaUnavailable || this.video.error) return
    if (this.playPromisePending) return

    const nowMs = performance.now()
    if (this.lastPlayFailureAtMs != null && nowMs - this.lastPlayFailureAtMs < 1000) return

    this.playPromisePending = true
    try {
      await this.video.play()
    } catch {
      this.lastPlayFailureAtMs = performance.now()
    } finally {
      this.playPromisePending = false
    }
  }
}

export default VideoAnimation

import AnimationBridge from './AnimationBridge'
import registry from './registry'
import { AnimationContext, AnimationFactory } from './IAnimation'
import AudioFeatureExtractor from './AudioFeatureExtractor'
import { getVisualTriggers } from './VisualTriggers'
import { getOrCreateAudioAnalyserConnection, type AudioAnalyserConnection } from '@/features/playback-indicators/audioAnalyser'
import { getPreset, listPresets, pickPreset, type SceneCategory, type ScenePresetDef } from './scenePresets'
import { detectPolicy } from './PerformancePolicy'

type PlaybackSourceMeta = { artworkUrl?: string | null }

class TheatreController extends EventTarget {
  private bridge = new AnimationBridge()
  private overlay: HTMLElement | null = null
  private overrideEl: HTMLMediaElement | null = null
  private audioEl: HTMLMediaElement | null = null
  private unbindListeners: (() => void) | null = null
  private analyserConnection: AudioAnalyserConnection | null = null
  private extractor: AudioFeatureExtractor | null = null
  private featureLoopId: number | null = null
  private frameContext: AnimationContext | null = null
  public state = {
    active: false,
    canEnter: false,
    presetId: null as string | null,
    mediaSrc: null as string | null,
    artworkUrl: null as string | null,
  }

  constructor() {
    super()
    this.rebindAudio()
    window.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.active) this.bridge.pause()
      else if (!document.hidden && this.state.active) this.bridge.resume()
    })
  }

  /** Radio (or other page-local player) overrides the site player while mounted. */
  public registerPlaybackSource(el: HTMLMediaElement | null, meta?: PlaybackSourceMeta) {
    this.overrideEl = el
    if (meta && 'artworkUrl' in meta) {
      this.state.artworkUrl = meta.artworkUrl ?? null
    }
    this.rebindAudio()
  }

  public setArtwork(artworkUrl: string | null) {
    this.state.artworkUrl = artworkUrl
    this.dispatchEvent(new Event('change'))
  }

  private buildFactoriesForPreset(preset: ScenePresetDef | null, maxLayers = Number.POSITIVE_INFINITY) {
    const factories: AnimationFactory[] = []
    if (!preset) return factories
    const cap = Math.min(maxLayers, preset.layers.length)
    for (let i = 0; i < cap; i++) {
      const layer = preset.layers[i]
      const entry = registry.get(layer.animationId)
      if (!entry) continue
      const layerOptions = layer.options
      factories.push((ctxParam: AnimationContext) => {
        const options = layerOptions
          ? { ...ctxParam.options, ...layerOptions }
          : ctxParam.options
        return entry.factory({ ...ctxParam, options })
      })
    }
    return factories
  }

  private pickPlaybackElement(): HTMLMediaElement | null {
    if (this.overrideEl) return this.overrideEl

    const el = document.querySelector('audio[data-site-player]')
    return el instanceof HTMLMediaElement ? el : null
  }

  private syncPlaybackState(el: HTMLMediaElement) {
    this.state.canEnter = !el.paused
    this.state.mediaSrc = el.currentSrc || null
    this.dispatchEvent(new Event('change'))
  }

  private rebindAudio() {
    const next = this.pickPlaybackElement()
    if (next === this.audioEl) {
      if (next) this.syncPlaybackState(next)
      return
    }

    if (this.state.active) void this.exit()

    this.unbindListeners?.()
    this.unbindListeners = null
    this.analyserConnection = null
    this.audioEl = next

    if (!next) {
      this.state.canEnter = false
      this.state.mediaSrc = null
      this.dispatchEvent(new Event('change'))
      return
    }

    const update = () => this.syncPlaybackState(next)
    next.addEventListener('play', update)
    next.addEventListener('pause', update)
    next.addEventListener('emptied', update)
    next.addEventListener('ended', update)
    this.unbindListeners = () => {
      next.removeEventListener('play', update)
      next.removeEventListener('pause', update)
      next.removeEventListener('emptied', update)
      next.removeEventListener('ended', update)
    }
    update()
  }

  private getOrCreateAnalyser(): AnalyserNode | null {
    if (this.analyserConnection && this.audioEl) {
      return this.analyserConnection.analyser
    }

    if (!this.audioEl) return null

    try {
      const connection = getOrCreateAudioAnalyserConnection(this.audioEl)
      this.analyserConnection = connection
      if (connection.context.state === 'suspended') {
        void connection.context.resume().catch(() => {})
      }
      return connection.analyser
    } catch {
      return null
    }
  }

  public async changePreset(presetId: string) {
    if (!this.overlay || !this.state.active) return

    const selectedPreset = getPreset(presetId)
    if (!selectedPreset) return

    const analyser = this.getOrCreateAnalyser()
    const featuresRef = this.extractor?.getFeatures()
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const policy = detectPolicy(reducedMotion)
    const timeRef = { elapsed: 0, delta: 0, frame: 0 }
    const triggerCache: Record<string, { frame: number; triggers: ReturnType<typeof getVisualTriggers> }> = {}

    const ctx: AnimationContext = {
      audioElement: this.audioEl || undefined,
      analyser: analyser || undefined,
      mediaSrc: this.state.mediaSrc || undefined,
      artworkUrl: this.state.artworkUrl || undefined,
      options: {},
      shared: {
        features: featuresRef,
        reducedMotion,
        lowPower:      policy.lowPower,
        dprClamp:      policy.dprClamp,
        particleScale: policy.particleScale,
        time: timeRef,
        getTriggers: (preset = 'vivid') => {
          const frame = timeRef.frame
          const record = triggerCache[preset]
          if (record?.frame === frame) return record.triggers
          const triggers = getVisualTriggers(featuresRef, preset)
          triggerCache[preset] = { frame, triggers }
          return triggers
        },
      },
    }

    await this.bridge.exit()
    this.state.presetId = selectedPreset.id
    this.frameContext = ctx
    const factories = this.buildFactoriesForPreset(selectedPreset, policy.maxLayers)
    await this.bridge.enter(this.overlay, factories, ctx)
    this.dispatchEvent(new Event('change'))
  }

  public async toggle() {
    if (!this.audioEl) this.rebindAudio()
    if (this.state.active) return this.exit()
    return this.enter()
  }

  public async enter() {
    // Load animation factories on first enter — keeps them out of the initial
    // bundle even if TheatreController itself is somehow imported early.
    await import('./registry/seed')
    if (!this.audioEl) this.rebindAudio()
    this.overlay = document.createElement('div')
    this.overlay.className = 'theatre-overlay fixed inset-x-0 top-0 z-[9998] flex items-center justify-center'
    let playerHeight = 0
    try {
      const playerEl = document.querySelector('.bottom-player__surface') as HTMLElement | null
      if (playerEl) playerHeight = Math.round(playerEl.getBoundingClientRect().height)
    } catch { /* ignore */ }
    if (!playerHeight) {
      const token = getComputedStyle(document.documentElement).getPropertyValue('--spacing-player')
      const parsed = parseFloat(token)
      if (!Number.isNaN(parsed)) playerHeight = Math.round(parsed)
    }
    this.overlay.style.bottom = `${playerHeight}px`
    this.overlay.style.height = `${Math.max(0, window.innerHeight - playerHeight)}px`
    this.overlay.style.pointerEvents = 'auto'
    // Start transparent — animations render one frame before we reveal.
    this.overlay.style.opacity = '0'
    this.overlay.style.transition = 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
    document.body.appendChild(this.overlay)
    document.body.classList.add('theatre-active')

    const analyser = this.getOrCreateAnalyser()

    let featuresRef: ReturnType<AudioFeatureExtractor['getFeatures']> | undefined
    if (analyser) {
      this.extractor = new AudioFeatureExtractor(analyser)
      featuresRef = this.extractor.getFeatures()
    }

    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const policy = detectPolicy(reducedMotion)
    const timeRef = { elapsed: 0, delta: 0, frame: 0 }
    const triggerCache: Record<string, { frame: number; triggers: ReturnType<typeof getVisualTriggers> }> = {}

    const ctx: AnimationContext = {
      audioElement: this.audioEl || undefined,
      analyser: analyser || undefined,
      mediaSrc: this.state.mediaSrc || undefined,
      artworkUrl: this.state.artworkUrl || undefined,
      options: {},
      shared: {
        features: featuresRef,
        reducedMotion,
        lowPower:      policy.lowPower,
        dprClamp:      policy.dprClamp,
        particleScale: policy.particleScale,
        time: timeRef,
        getTriggers: (preset = 'vivid') => {
          const frame = timeRef.frame
          const record = triggerCache[preset]
          if (record?.frame === frame) return record.triggers
          const triggers = getVisualTriggers(featuresRef, preset)
          triggerCache[preset] = { frame, triggers }
          return triggers
        },
      },
    }

    // dev/localhost surfaces lab presets; production stays on curated scenes
    const preferCategory: SceneCategory =
      typeof import.meta !== 'undefined' && 'env' in import.meta && (import.meta as any).env?.DEV
        ? 'lab'
        : 'production'

    const selectedPreset = pickPreset({ preferCategory, reducedMotion })
    this.state.presetId = selectedPreset?.id ?? null

    const controlPanel = document.createElement('div')
    controlPanel.className = 'theatre-control-panel absolute top-4 right-4 flex items-center gap-2 rounded-xl bg-black/75 p-2 shadow-2xl ring-1 ring-white/10'
    controlPanel.style.pointerEvents = 'auto'
    controlPanel.style.zIndex = '9999'

    const presetSelect = document.createElement('select')
    presetSelect.className = 'rounded border border-white/15 bg-black/80 px-2 py-1 text-xs text-white outline-none'
    presetSelect.title = 'Change theatre animation preset'
    listPresets().forEach(preset => {
      const option = document.createElement('option')
      option.value = preset.id
      option.textContent = `${preset.label}${preset.category ? ` (${preset.category})` : ''}`
      if (preset.id === this.state.presetId) option.selected = true
      presetSelect.appendChild(option)
    })
    presetSelect.addEventListener('change', event => {
      const value = (event.target as HTMLSelectElement).value
      void this.changePreset(value)
    })

    const exitLink = document.createElement('a')
    exitLink.href = '#'
    exitLink.textContent = 'Exit'
    exitLink.className = 'rounded border border-white/15 bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20'
    exitLink.addEventListener('click', event => {
      event.preventDefault()
      void this.exit()
    })

    controlPanel.append(presetSelect, exitLink)
    this.overlay.appendChild(controlPanel)

    this.frameContext = ctx
    const factories = this.buildFactoriesForPreset(selectedPreset, policy.maxLayers)
    await this.bridge.enter(this.overlay, factories, ctx)
    this.state.active = true
    this.dispatchEvent(new Event('enter'))
    this.dispatchEvent(new Event('change'))

    // Fade in: double-RAF ensures the browser has committed the opacity:0
    // frame before we transition, so the animation is always visible.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.overlay) this.overlay.style.opacity = '1'
      })
    })

    // Single RAF loop owns all frame work:
    // 1. advance shared time  2. update audio features  3. drive all externally-driven animations
    // Runs unconditionally — animations get consistent timing even without an audio analyser.
    const startTime = performance.now()
    let lastTime = startTime
    const loop = () => {
      if (!this.state.active) return
      const frameCtx = this.frameContext || ctx
      const now = performance.now()
      const delta = now - lastTime
      lastTime = now
      if (frameCtx.shared?.time) {
        frameCtx.shared.time.delta = delta
        frameCtx.shared.time.elapsed = now - startTime
        frameCtx.shared.time.frame += 1
      }
      try { this.extractor?.update() } catch { /* ignore */ }
      this.bridge.renderFrame(frameCtx)
      this.featureLoopId = requestAnimationFrame(loop)
    }
    this.featureLoopId = requestAnimationFrame(loop)
  }

  public async exit() {
    await this.bridge.exit()
    if (this.overlay?.parentElement) this.overlay.parentElement.removeChild(this.overlay)
    this.overlay = null
    document.body.classList.remove('theatre-active')
    this.state.active = false
    if (this.featureLoopId) {
      cancelAnimationFrame(this.featureLoopId)
      this.featureLoopId = null
    }
    this.extractor = null
    this.frameContext = null
    this.dispatchEvent(new Event('exit'))
    this.dispatchEvent(new Event('change'))
  }
}

const controller = new TheatreController()
export default controller

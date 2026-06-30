import registry from '../registry'
import { AnimationContext, AnimationFactory } from '../core/IAnimation'
import AudioFeatureExtractor from '../audio/AudioFeatureExtractor'
import { getOrCreateAudioAnalyserConnection, type AudioAnalyserConnection } from '@/features/playback-indicators/audioAnalyser'
import { getPreset, listPresets, pickPreset, type SceneCategory, type ScenePresetDef, type TheatreTransitionKind } from '../registry/scenePresets'
import { buildAnimationFrameContext } from './theatreFrameContext'
import { detectPolicy } from '../runtime/PerformancePolicy'
import { playbackFocusTiming } from '@/lib/playbackFocusTiming'
import { createTheatreDevPanel, destroyTheatreDevPanel } from '../dev/TheatreDevPanel'
import { TheatreSceneDeck } from './TheatreSceneDeck'

export type TheatreRotationPolicy = {
  minSceneMs: number
  maxSceneMs: number
  clipLengthBias: 'minimum' | 'preferred' | 'ignore'
  varianceMs: number
  requireAudioPop: boolean
}

export const DEFAULT_ROTATION_POLICY: TheatreRotationPolicy = {
  minSceneMs: 12000,
  maxSceneMs: 60000,
  clipLengthBias: 'minimum',
  varianceMs: 8000,
  requireAudioPop: true,
}

const AUTO_ROTATE_POP_THRESHOLD = 0.02

type PlaybackSourceMeta = { artworkUrl?: string | null }
type TheatreMode = 'background' | 'immersive'

class TheatreController extends EventTarget {
  private deck: TheatreSceneDeck | null = null
  private overlay: HTMLElement | null = null
  private overrideEl: HTMLMediaElement | null = null
  private audioEl: HTMLMediaElement | null = null
  private analyserConnection: AudioAnalyserConnection | null = null
  private extractor: AudioFeatureExtractor | null = null
  private featureLoopId: number | null = null
  private backgroundEnterTimerId: number | null = null
  private frameContext: AnimationContext | null = null
  private overlayBoundsCleanup: (() => void) | null = null
  private transitioning = false
  private transitionToken = 0
  private autoRotateEnabled = false
  private nextAutoRotateTime = 0
  private autoRotateArmed = false

  private readonly onVisibilityChange = () => {
    if (document.hidden && this.state.active) this.deck?.pause()
    else if (!document.hidden && this.state.active) this.deck?.resume()
  }

  public state = {
    active: false,
    canEnter: false,
    mode: null as TheatreMode | null,
    presetId: null as string | null,
    mediaSrc: null as string | null,
    artworkUrl: null as string | null,
  }

  private _clipDurationMs: number | null = null

  constructor() {
    super()
    this.rebindAudio()
    window.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  /** Full teardown for HMR / module unload — does not await bridge.exit(). */
  dispose() {
    this.bumpTransitionToken()
    this.transitioning = false
    this.state.active = false
    this.state.mode = null
    this.state.presetId = null

    window.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.analyserConnection = null
    this.clearBackgroundEnterTimer()
    this.stopFeatureLoop()
    this.extractor = null
    this.frameContext = null
    this.clearOverlayBoundsTracking()
    this.overlay?.remove()
    this.overlay = null
    document.body.classList.remove('theatre-active')
    void this.deck?.exit()
    this.deck = null
  }

  /** Radio (or other page-local player) overrides the site player while mounted. */
  public registerPlaybackSource(el: HTMLMediaElement | null, meta?: PlaybackSourceMeta) {
    this.overrideEl = el
    if (el === null) {
      this.state.artworkUrl = null
    } else if (meta && 'artworkUrl' in meta) {
      this.state.artworkUrl = meta.artworkUrl ?? null
    }
    this.rebindAudio()
  }

  public setArtwork(artworkUrl: string | null) {
    this.state.artworkUrl = artworkUrl
    this.dispatchEvent(new Event('change'))
  }

  /** Called by React whenever playback readiness changes. Single source of truth for canEnter. */
  public setCanEnter(canEnter: boolean) {
    const changed = this.state.canEnter !== canEnter
    if (changed) this.state.canEnter = canEnter

    if (canEnter) {
      this.ensureBackgroundIfNeeded()
    } else if (this.state.active && this.state.mode === 'background') {
      this.clearBackgroundEnterTimer()
      void this.exit()
    } else {
      this.clearBackgroundEnterTimer()
    }

    if (changed) this.dispatchEvent(new Event('change'))
  }

  public setAutoRotation(enabled: boolean) {
    this.autoRotateEnabled = enabled
    if (enabled) {
      this.resetAutoRotateTimer()
    }
  }

  public setClipDuration(durationMs: number | null) {
    this._clipDurationMs = durationMs
  }

  private resetAutoRotateTimer() {
    const policy = DEFAULT_ROTATION_POLICY
    let baseMin = policy.minSceneMs

    // Determine the most accurate duration for the next rotation
    let durationMs: number | null = null
    
    // 1. Explicit clip duration passed via React (e.g. from segment or track metadata)
    if (this._clipDurationMs !== null && this._clipDurationMs > 0 && Number.isFinite(this._clipDurationMs)) {
      durationMs = this._clipDurationMs
    } 
    // 2. Fallback to audioEl.duration if reasonable
    else if (this.audioEl?.duration && Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0) {
      // Treat duration as stream (like icecast) if it's unreasonably large (e.g., > 1 hour)
      const sec = this.audioEl.duration
      if (sec < 3600) durationMs = sec * 1000
    }

    if (durationMs === null) {
      durationMs = policy.maxSceneMs // Default fallback
    }

    // Formula: nextSwitchAt = now + max(clipDurationMs, minSceneMs) + randomVariance
    const nextWaitMs = Math.max(durationMs, baseMin) + (Math.random() * policy.varianceMs)
    
    this.nextAutoRotateTime = performance.now() + nextWaitMs
    this.autoRotateArmed = false
  }

  private ensureBackgroundIfNeeded() {
    if (!this.state.canEnter || this.state.active || this.transitioning || this.backgroundEnterTimerId !== null) return

    if (playbackFocusTiming.theatre.delayMs <= 0) {
      void this.enterBackground()
      return
    }

    this.backgroundEnterTimerId = window.setTimeout(() => {
      this.backgroundEnterTimerId = null
      if (this.state.canEnter && !this.state.active && !this.transitioning) void this.enterBackground()
    }, playbackFocusTiming.theatre.delayMs)
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  private revealOverlay(overlay: HTMLElement, token: number) {
    const show = () => {
      if (this.stillCurrent(token) && this.overlay === overlay) {
        overlay.classList.add('is-visible')
      }
    }
    if (this.prefersReducedMotion()) {
      show()
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(show)
    })
  }

  private waitForOverlayHidden(overlay: HTMLElement): Promise<void> {
    if (this.prefersReducedMotion()) return Promise.resolve()
    return new Promise(resolve => {
      const timeout = window.setTimeout(
        resolve,
        playbackFocusTiming.theatre.fadeOutMs + playbackFocusTiming.theatre.exitBufferMs,
      )
      const onEnd = (event: TransitionEvent) => {
        if (event.target !== overlay || event.propertyName !== 'opacity') return
        overlay.removeEventListener('transitionend', onEnd)
        window.clearTimeout(timeout)
        resolve()
      }
      overlay.addEventListener('transitionend', onEnd)
      overlay.classList.remove('is-visible')
    })
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

  private hasPlayableAudio(): boolean {
    return this.state.canEnter
  }

  private stopFeatureLoop() {
    if (this.featureLoopId !== null) {
      cancelAnimationFrame(this.featureLoopId)
      this.featureLoopId = null
    }
  }

  private clearBackgroundEnterTimer() {
    if (this.backgroundEnterTimerId === null) return
    window.clearTimeout(this.backgroundEnterTimerId)
    this.backgroundEnterTimerId = null
  }

  /** Only enter/exit/changePreset/dispose may bump — each must own `transitioning` except dispose. */
  private bumpTransitionToken(): number {
    return ++this.transitionToken
  }

  private stillCurrent(token: number): boolean {
    return token === this.transitionToken
  }

  private discardOverlay(el: HTMLElement) {
    this.clearOverlayBoundsTracking()
    if (el.parentElement) el.parentElement.removeChild(el)
    if (this.overlay === el) this.overlay = null
    document.body.classList.remove('theatre-active')
  }

  private clearOverlayBoundsTracking() {
    this.overlayBoundsCleanup?.()
    this.overlayBoundsCleanup = null
  }

  private measurePlayerInset() {
    const playerEl = document.querySelector('[data-bottom-player]') as HTMLElement | null
    if (playerEl) return Math.max(0, Math.ceil(playerEl.getBoundingClientRect().height))

    const playerSurface = document.querySelector('.bottom-player__surface') as HTMLElement | null
    if (playerSurface) return Math.max(0, Math.ceil(playerSurface.getBoundingClientRect().height))

    return 0
  }

  private updateOverlayBounds = () => {
    if (!this.overlay) return

    const playerInset = this.measurePlayerInset()
    this.overlay.style.bottom = `${playerInset}px`
    this.overlay.style.height = 'auto'
    this.overlay.style.maxHeight = `calc(100dvh - ${playerInset}px)`
  }

  private trackOverlayBounds() {
    this.clearOverlayBoundsTracking()

    const playerEl = document.querySelector('[data-bottom-player]') as HTMLElement | null
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => this.updateOverlayBounds())

    if (playerEl) resizeObserver?.observe(playerEl)
    window.addEventListener('resize', this.updateOverlayBounds)
    window.visualViewport?.addEventListener('resize', this.updateOverlayBounds)
    window.visualViewport?.addEventListener('scroll', this.updateOverlayBounds)

    this.overlayBoundsCleanup = () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', this.updateOverlayBounds)
      window.visualViewport?.removeEventListener('resize', this.updateOverlayBounds)
      window.visualViewport?.removeEventListener('scroll', this.updateOverlayBounds)
    }

    this.updateOverlayBounds()
  }

  private async abortStaleTransition(token: number, overlay: HTMLElement | null) {
    if (this.stillCurrent(token)) return
    this.stopFeatureLoop()
    this.extractor = null
    this.frameContext = null
    if (this.deck && this.deck.getInstances().length > 0) await this.deck.exit()
    if (overlay) this.discardOverlay(overlay)
    if (!this.state.active) {
      this.state.presetId = null
      this.state.mode = null
      this.dispatchEvent(new Event('change'))
    }
  }

  private rebindAudio() {
    const next = this.pickPlaybackElement()
    if (next === this.audioEl) return
    if (this.state.active) void this.exit()
    this.analyserConnection = null
    this.audioEl = next
    this.state.mediaSrc = next?.currentSrc || null
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

  private async togglePlayback() {
    if (!this.audioEl) this.rebindAudio()
    const audio = this.audioEl
    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
        this.deck?.resume()
      } catch {
        this.deck?.pause()
      }
      return
    }

    audio.pause()
    this.deck?.pause()
  }

  private pickRandomPreset(excludeCurrent = true): ScenePresetDef | null {
    const reducedMotion = this.prefersReducedMotion()
    const preferCategory: SceneCategory = import.meta.env.DEV ? 'lab' : 'production'
    return pickPreset({
      preferCategory,
      reducedMotion,
      excludeIds: excludeCurrent && this.state.presetId ? [this.state.presetId] : [],
    })
  }

  public async rotateRandomPreset() {
    if (!this.state.active || this.transitioning) return
    
    if (this.deck?.getNextPresetId()) {
      const token = this.bumpTransitionToken()
      this.transitioning = true
      try {
        await this.changeToPreloadedInner(token)
      } finally {
        if (this.stillCurrent(token)) this.transitioning = false
      }
    } else {
      const selectedPreset = this.pickRandomPreset()
      if (!selectedPreset || selectedPreset.id === this.state.presetId) return
      await this.changePreset(selectedPreset.id)
    }
  }

  public async changePreset(presetId: string) {
    if (this.transitioning || !this.overlay || !this.state.active) return

    const token = this.bumpTransitionToken()
    this.transitioning = true
    try {
      await this.changePresetInner(presetId, token)
    } finally {
      if (this.stillCurrent(token)) this.transitioning = false
    }
  }

  private async changePresetInner(presetId: string, token: number) {
    const selectedPreset = getPreset(presetId)
    if (!selectedPreset || !this.stillCurrent(token)) return

    const analyser = this.getOrCreateAnalyser()
    const { ctx, policy } = buildAnimationFrameContext({
      audioEl: this.audioEl,
      analyser,
      mediaSrc: this.audioEl?.currentSrc || null,
      artworkUrl: this.state.artworkUrl,
      featuresRef: this.extractor?.getFeatures(),
    })

    if (!this.deck) return

    this.state.presetId = selectedPreset.id
    this.frameContext = ctx
    const factories = this.buildFactoriesForPreset(selectedPreset, policy.maxLayers)

    const features = this.extractor?.getFeatures()
    let kind: TheatreTransitionKind = selectedPreset.timing?.transitionPreference ?? 'crossfade'
    
    if (features) {
      if (features.flux.overall > AUTO_ROTATE_POP_THRESHOLD * 1.5) kind = 'cut'
      else if (features.flux.overall > AUTO_ROTATE_POP_THRESHOLD * 0.8) kind = 'fastFade'
      else if (features.flux.overall < 0.005) kind = 'slowFade'
    }

    await this.deck.transitionTo(selectedPreset.id, factories, ctx, kind)

    if (!this.stillCurrent(token) || !this.overlay || !this.state.active) return

    this.resetAutoRotateTimer()
    this.dispatchEvent(new Event('change'))
    
    this.schedulePreloadNext()
  }

  private async changeToPreloadedInner(token: number) {
    const presetId = this.deck?.getNextPresetId()
    const selectedPreset = presetId ? getPreset(presetId) : null
    
    if (!selectedPreset || !this.stillCurrent(token) || !this.deck) return

    this.state.presetId = selectedPreset.id
    
    const features = this.extractor?.getFeatures()
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const policy = detectPolicy(reducedMotion)

    let kind: TheatreTransitionKind = selectedPreset.timing?.transitionPreference ?? 'crossfade'
    
    // Disable crossfade on reduced-motion or low-tier devices
    if (kind === 'crossfade' && (policy.lowPower || reducedMotion || policy.dprClamp <= 1)) {
      kind = 'fastFade'
    }
    
    if (features) {
      if (features.flux.overall > AUTO_ROTATE_POP_THRESHOLD * 1.5) kind = 'cut'
      else if (features.flux.overall > AUTO_ROTATE_POP_THRESHOLD * 0.8) kind = 'fastFade'
      else if (features.flux.overall < 0.005 && kind !== 'crossfade') kind = 'slowFade'
    }

    await this.deck.transitionToPreloaded(kind)

    if (!this.stillCurrent(token) || !this.overlay || !this.state.active) return

    this.resetAutoRotateTimer()
    this.dispatchEvent(new Event('change'))

    this.schedulePreloadNext()
  }

  private schedulePreloadNext() {
    if (!this.state.active || !this.deck) return

    const scheduleIdle = window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 1000))
    scheduleIdle(async () => {
      if (!this.state.active || !this.deck || this.deck.getNextPresetId() || this.transitioning) return
      
      const nextPreset = this.pickRandomPreset()
      if (!nextPreset) return

      const analyser = this.getOrCreateAnalyser()
      const { ctx, policy } = buildAnimationFrameContext({
        audioEl: this.audioEl,
        analyser,
        mediaSrc: this.audioEl?.currentSrc || null,
        artworkUrl: this.state.artworkUrl,
        featuresRef: this.extractor?.getFeatures(),
        existingTimeRef: this.frameContext?.shared?.time,
      })

      const factories = this.buildFactoriesForPreset(nextPreset, policy.maxLayers)
      await this.deck.preload(nextPreset.id, factories, ctx)
    })
  }

  public async toggle() {
    if (!this.audioEl) this.rebindAudio()
    if (this.state.active || this.transitioning) return this.exit()
    return this.enter()
  }

  public async enterBackground() {
    if (this.state.active || this.transitioning) return

    const token = this.bumpTransitionToken()
    this.transitioning = true
    try {
      await this.enterInner(token, 'background')
    } finally {
      if (this.stillCurrent(token)) this.transitioning = false
    }
  }

  public async enter() {
    if (this.state.active || this.transitioning) return

    const token = this.bumpTransitionToken()
    this.transitioning = true
    try {
      await this.enterInner(token, 'immersive')
    } finally {
      if (this.stillCurrent(token)) this.transitioning = false
    }
  }

  private getBackgroundMount(): HTMLElement {
    const mount = document.querySelector('[data-theatre-mount]')
    if (mount instanceof HTMLElement) return mount

    const layer = document.querySelector('[data-background-layer]')
    return layer instanceof HTMLElement ? layer : document.body
  }

  private ensureBackgroundOverlayConnected() {
    if (!this.overlay || this.state.mode !== 'background') return
    if (this.overlay.isConnected) return
    this.getBackgroundMount().appendChild(this.overlay)
  }

  private mountImmersiveControls(overlay: HTMLElement, initialPresetId: string | null) {
    const controls = document.createElement('div')
    controls.className = 'theatre-controls absolute top-4 right-4 flex items-center gap-2'
    controls.style.pointerEvents = 'auto'
    controls.style.zIndex = '9999'

    const menuWrap = document.createElement('div')
    menuWrap.className = 'theatre-visualization-menu-wrap relative'

    const menuButton = document.createElement('button')
    menuButton.type = 'button'
    menuButton.className = 'theatre-round-button'
    menuButton.title = 'Change theatre visualization'
    menuButton.setAttribute('aria-label', 'Change theatre visualization')
    menuButton.setAttribute('aria-haspopup', 'menu')
    menuButton.setAttribute('aria-expanded', 'false')
    menuButton.innerHTML = '<span class="theatre-menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>'

    const presetMenu = document.createElement('div')
    presetMenu.className = 'theatre-visualization-menu hidden'
    presetMenu.setAttribute('role', 'menu')
    presetMenu.setAttribute('aria-label', 'Theatre visualizations')

    const setMenuOpen = (open: boolean) => {
      presetMenu.classList.toggle('hidden', !open)
      menuButton.setAttribute('aria-expanded', String(open))
    }

    listPresets().forEach(preset => {
      const option = document.createElement('button')
      option.type = 'button'
      option.className = 'theatre-visualization-option'
      option.value = preset.id
      option.textContent = `${preset.label}${preset.category ? ` (${preset.category})` : ''}`
      option.setAttribute('role', 'menuitemradio')
      option.setAttribute('aria-checked', String(preset.id === initialPresetId))
      option.addEventListener('click', event => {
        event.stopPropagation()
        presetMenu.querySelectorAll<HTMLButtonElement>('.theatre-visualization-option').forEach(item => {
          item.setAttribute('aria-checked', String(item.value === preset.id))
        })
        setMenuOpen(false)
        void this.changePreset(preset.id)
      })
      presetMenu.appendChild(option)
    })

    menuButton.addEventListener('click', event => {
      event.stopPropagation()
      setMenuOpen(presetMenu.classList.contains('hidden'))
    })

    const exitButton = document.createElement('button')
    exitButton.type = 'button'
    exitButton.className = 'theatre-round-button theatre-exit'
    exitButton.title = 'Exit theatre'
    exitButton.setAttribute('aria-label', 'Exit theatre')
    exitButton.innerHTML = '<span class="theatre-x-icon" aria-hidden="true"></span>'
    exitButton.addEventListener('click', event => {
      event.stopPropagation()
      void this.exit()
    })

    menuWrap.append(menuButton, presetMenu)
    controls.append(menuWrap, exitButton)
    overlay.appendChild(controls)

    overlay.addEventListener('click', event => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.theatre-controls, .theatre-dev-panel, button, a, select, input, textarea')) return
      setMenuOpen(false)
      void this.togglePlayback()
    })
  }

  private async enterInner(token: number, mode: TheatreMode) {
    // Load animation factories on first enter — keeps them out of the initial
    // bundle even if TheatreController itself is somehow imported early.
    await import('../registry/seed')
    if (!this.stillCurrent(token)) return
    if (!this.audioEl) this.rebindAudio()
    if (!this.hasPlayableAudio()) return
    if (!this.stillCurrent(token)) return

    const isBackground = mode === 'background'
    const overlay = document.createElement('div')
    this.overlay = overlay
    overlay.className = isBackground
      ? 'theatre-overlay theatre-overlay--background fixed inset-0 flex items-center justify-center'
      : 'theatre-overlay theatre-overlay--immersive fixed inset-x-0 top-0 flex items-center justify-center'
    overlay.style.pointerEvents = isBackground ? 'none' : 'auto'

    if (isBackground) {
      this.getBackgroundMount().appendChild(overlay)
    } else {
      document.body.appendChild(overlay)
      this.trackOverlayBounds()
      document.body.classList.add('theatre-active')
    }

    const analyser = this.getOrCreateAnalyser()

    let featuresRef: ReturnType<AudioFeatureExtractor['getFeatures']> | undefined
    if (analyser) {
      this.extractor = new AudioFeatureExtractor(analyser)
      featuresRef = this.extractor.getFeatures()
    }

    const { ctx, policy } = buildAnimationFrameContext({
      audioEl: this.audioEl,
      analyser,
      mediaSrc: this.audioEl?.currentSrc || null,
      artworkUrl: this.state.artworkUrl,
      featuresRef,
    })

    const selectedPreset = this.pickRandomPreset(false)
    const initialPresetId = selectedPreset?.id ?? null

    this.deck = new TheatreSceneDeck(overlay)

    if (!isBackground) {
      this.mountImmersiveControls(overlay, initialPresetId)
      createTheatreDevPanel(overlay, this.deck)
    }

    if (!this.stillCurrent(token)) {
      await this.abortStaleTransition(token, overlay)
      return
    }

    this.frameContext = ctx
    const factories = this.buildFactoriesForPreset(selectedPreset, policy.maxLayers)
    if (initialPresetId) {
      await this.deck.enterInitial(initialPresetId, factories, ctx)
    }
    
    if (!this.stillCurrent(token)) {
      await this.abortStaleTransition(token, overlay)
      return
    }

    this.state.presetId = initialPresetId
    this.state.mode = mode
    this.state.active = true
    this.dispatchEvent(new Event('enter'))
    this.dispatchEvent(new Event('change'))
    
    this.schedulePreloadNext()

    this.revealOverlay(overlay, token)

    // Single RAF loop owns all frame work:
    // 1. advance shared time  2. update audio features  3. drive all externally-driven animations
    // Runs unconditionally — animations get consistent timing even without an audio analyser.
    const startTime = performance.now()
    let lastTime = startTime
    const loop = () => {
      if (!this.state.active) return
      this.ensureBackgroundOverlayConnected()
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
      
      if (this.autoRotateEnabled && this.state.active && !this.transitioning) {
        if (!this.autoRotateArmed && now >= this.nextAutoRotateTime) {
          this.autoRotateArmed = true
        }
        if (this.autoRotateArmed && this.extractor) {
          const features = this.extractor.getFeatures()
          if (features.flux.overall > AUTO_ROTATE_POP_THRESHOLD) {
            this.resetAutoRotateTimer()
            void this.rotateRandomPreset()
          }
        }
      }

      this.deck?.renderFrame(frameCtx)
      this.featureLoopId = requestAnimationFrame(loop)
    }
    this.featureLoopId = requestAnimationFrame(loop)
  }

  public async exit() {
    if (!this.state.active && !this.overlay && !this.transitioning) return

    const token = this.bumpTransitionToken()
    this.transitioning = true
    const overlay = this.overlay
    try {
      this.stopFeatureLoop()

      if (overlay?.classList.contains('is-visible')) {
        await this.waitForOverlayHidden(overlay)
        if (!this.stillCurrent(token)) return
      }

      this.state.active = false
      this.state.mode = null
      this.extractor = null
      this.frameContext = null
      
      destroyTheatreDevPanel()

      if (this.deck) await this.deck.exit()
      if (!this.stillCurrent(token)) return

      this.clearOverlayBoundsTracking()
      if (overlay?.parentElement) overlay.parentElement.removeChild(overlay)
      if (this.overlay === overlay) this.overlay = null
      document.body.classList.remove('theatre-active')
      this.state.presetId = null

      this.dispatchEvent(new Event('exit'))
      this.dispatchEvent(new Event('change'))
    } finally {
      if (this.stillCurrent(token)) {
        this.transitioning = false
        this.ensureBackgroundIfNeeded()
      }
    }
  }
}

const controller = new TheatreController()
export default controller

if (import.meta.hot) {
  import.meta.hot.dispose(() => controller.dispose())
}

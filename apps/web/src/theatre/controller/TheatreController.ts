import registry from '../registry'
import { AnimationContext, AnimationFactory } from '../core/IAnimation'
import AudioFeatureExtractor from '../audio/AudioFeatureExtractor'
import { TheatreAudioBus } from '../audio/TheatreAudioBus'
import {
  createRotationPolicyState,
  DEFAULT_FLUX_GATE_THRESHOLD,
  LEGACY_EXTERNAL_ROTATE_MIN_MS,
  LEGACY_ROTATION_COMPAT,
  RotationPolicy,
} from '../rotation/RotationPolicy'
import { resolveRotationPolicy } from '../rotation/rotationOverrides'
import type { ResolvedRotationPolicy, RotationPolicyState, TheatreTrackContext } from '../rotation/types'
import { FxSelector } from '../selection/FxSelector'
import type { PickContext } from '../selection/types'
import { getOrCreateAudioAnalyserConnection, type AudioAnalyserConnection } from '@/features/playback-indicators/audioAnalyser'
import { listPresets, type ScenePresetDef, type TheatreTransitionKind } from '../registry/scenePresets'
import { buildSongVisualPickExtras } from '../media/buildSongVisualPool'
import { clearDynamicPresets } from '../media/dynamicPresetStore'
import { isUserMediaPresetId, resolvePreset } from '../media/resolvePreset'
import { resolveTimelinePlaybackDecision } from '../media/TimelinePlaybackDirector'
import { hydrateTrackVisualMedia } from '../media/hydrateTrackVisualMedia'
import { getPackageIdForPreset } from '../registry/packageRotation'
import { buildAnimationFrameContext, withTheatreInitContext } from './theatreFrameContext'
import { detectPolicy } from '../runtime/PerformancePolicy'
import { playbackFocusTiming } from '@/lib/playbackFocusTiming'
import { createTheatreDevPanel, destroyTheatreDevPanel } from '../dev/TheatreDevPanel'
import { TheatreSceneDeck } from './TheatreSceneDeck'
import { theatreBreadcrumb } from './theatreBreadcrumbs'
import { isPresetQuarantined, quarantinePreset } from './presetQuarantine'
import { isObjectTheatrePreset } from '../packages/object-spinner-mover'
import { USER_VIDEO_MEDIA_ID } from '../media/userMediaEngine'

export type TheatreRotationPolicy = {
  minSceneMs: number
  maxSceneMs: number
  clipLengthBias: 'minimum' | 'preferred' | 'ignore'
  varianceMs: number
  requireAudioPop: boolean
}

/** @deprecated Prefer DEFAULT_ROTATION_POLICY_CONFIG from rotation/RotationPolicy */
export const DEFAULT_ROTATION_POLICY: TheatreRotationPolicy = LEGACY_ROTATION_COMPAT
const MANUAL_PRESET_THROTTLE_MS = 100
const MANUAL_PRESET_COOLDOWN_MS = 3000
const PRESET_CHANGE_TIMEOUT_MS = 6_000
const VIDEO_PACKAGE_ID = 'videos'

type PresetChangeSource = 'manual' | 'auto'

type PlaybackSourceMeta = { artworkUrl?: string | null }
type TheatreMode = 'background' | 'immersive'

function isVideoPresetId(presetId: string | null | undefined): boolean {
  if (!presetId) return false
  if (getPackageIdForPreset(presetId) === VIDEO_PACKAGE_ID) return true
  const preset = resolvePreset(presetId)
  return Boolean(preset?.layers.some(layer => layer.animationId === USER_VIDEO_MEDIA_ID))
}

class TheatreController extends EventTarget {
  private deck: TheatreSceneDeck | null = null
  private overlay: HTMLElement | null = null
  private overrideEl: HTMLMediaElement | null = null
  private audioEl: HTMLMediaElement | null = null
  private analyserConnection: AudioAnalyserConnection | null = null
  private extractor: AudioFeatureExtractor | null = null
  private audioBus = new TheatreAudioBus()
  private featureLoopId: number | null = null
  private backgroundEnterTimerId: number | null = null
  private frameContext: AnimationContext | null = null
  private overlayBoundsCleanup: (() => void) | null = null
  private transitioning = false
  private transitionToken = 0
  private autoRotateEnabled = false
  private rotationPolicy = new RotationPolicy()
  private rotationState: RotationPolicyState = createRotationPolicyState()
  private rotationPreloadTriggered = false
  private trackContext: TheatreTrackContext | null = null
  private lastTimelineClipPresetId: string | null = null
  private fxSelector = new FxSelector()
  private manualPresetLatest: string | null = null
  private manualPresetTimerId: number | null = null
  private lastManualPresetStart = 0
  private manualChangeActiveUntil = 0
  private preloadTimerId: number | null = null

  private readonly onVisibilityChange = () => {
    if (document.hidden && this.state.active) this.deck?.pause()
    else if (!document.hidden && this.state.active) this.deck?.resume()
  }

  public state = {
    active: false,
    canEnter: false,
    /** User preference: top-bar toggle. When false, no theatre FX run. */
    fxEnabled: true,
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
    this.clearManualPresetTimer()
    this.clearPreloadTimer()
    this.manualPresetLatest = null
    this.state.active = false
    this.state.mode = null
    this.state.presetId = null

    window.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.analyserConnection = null
    this.clearBackgroundEnterTimer()
    this.stopFeatureLoop()
    this.extractor = null
    this.audioBus.reset()
    this.fxSelector.clearCandidate()
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

    if (canEnter && this.state.fxEnabled) {
      this.ensureBackgroundIfNeeded()
    } else if (this.state.active && this.state.mode === 'background') {
      this.clearBackgroundEnterTimer()
      void this.exit()
    } else {
      this.clearBackgroundEnterTimer()
    }

    if (changed) this.dispatchEvent(new Event('change'))
  }

  /** Top-bar theatre toggle: enable/disable visual FX without exit→re-enter fighting. */
  public setFxEnabled(enabled: boolean) {
    if (this.state.fxEnabled === enabled) return

    this.state.fxEnabled = enabled
    theatreBreadcrumb('fx-enabled:change', { detail: String(enabled) })

    if (!enabled) {
      this.clearBackgroundEnterTimer()
      if (this.state.active) {
        void this.exit({ rearmBackground: false })
      }
    } else if (this.state.canEnter) {
      this.ensureBackgroundIfNeeded()
    }

    this.dispatchEvent(new Event('change'))
  }

  public setAutoRotation(enabled: boolean) {
    if (import.meta.env.DEV) console.log('[TheatreController] setAutoRotation:', enabled)
    this.autoRotateEnabled = enabled
  }

  public setClipDuration(durationMs: number | null) {
    this._clipDurationMs = durationMs
  }

  public setTrackContext(track: TheatreTrackContext | null) {
    this.trackContext = track
    this.lastTimelineClipPresetId = null
    clearDynamicPresets()
    this.fxSelector.clearCandidate()
    void hydrateTrackVisualMedia(track).then(() => {
      this.fxSelector.clearCandidate()
      if (this.state.active && this.state.presetId && isUserMediaPresetId(this.state.presetId) && !resolvePreset(this.state.presetId)) {
        void this.changeToTimelineFallbackPreset()
      }
    })
  }

  private resolveActiveRotationPolicy(): ResolvedRotationPolicy {
    return resolveRotationPolicy({
      activePresetId: this.state.presetId,
      activePreset: this.state.presetId ? resolvePreset(this.state.presetId) : null,
      track: this.trackContext,
    })
  }

  private clearPreloadTimer() {
    if (this.preloadTimerId !== null) {
      window.clearTimeout(this.preloadTimerId)
      this.preloadTimerId = null
    }
  }

  private resetRotationHold(nowMs = performance.now()) {
    this.rotationState.presetStartedAtMs = nowMs
    this.rotationPreloadTriggered = false
  }

  private canRotateNow(nowMs = performance.now(), minHoldMs = this.rotationPolicy.config.minHoldMs): boolean {
    return nowMs - this.rotationState.presetStartedAtMs >= minHoldMs
  }

  private handleRotationPolicyDecision(
    decision: ReturnType<RotationPolicy['evaluate']>,
    nowMs: number,
    resolved: ResolvedRotationPolicy,
  ) {
    if (decision.action === 'preload') {
      if (
        !this.rotationPreloadTriggered &&
        !this.deck?.getNextPresetId() &&
        !this.isManualChangeCooldownActive() &&
        !this.manualPresetLatest
      ) {
        this.rotationPreloadTriggered = true
        void this.runPreloadNext()
      }
      return
    }

    if (decision.action !== 'rotate' || !this.canRotateNow(nowMs, resolved.minHoldMs)) return

    if (import.meta.env.DEV) {
      const elapsed = nowMs - this.rotationState.presetStartedAtMs
      console.log(
        `[TheatreController] autoRotate triggered: reason=${decision.reason}, elapsedMs=${elapsed.toFixed(0)}`,
      )
    }

    void this.rotateRandomPreset()
  }

  private ensureBackgroundIfNeeded() {
    if (!this.state.canEnter || !this.state.fxEnabled || this.state.active || this.transitioning || this.backgroundEnterTimerId !== null) return

    if (playbackFocusTiming.theatre.delayMs <= 0) {
      void this.enterBackground()
      return
    }

    this.backgroundEnterTimerId = window.setTimeout(() => {
      this.backgroundEnterTimerId = null
      if (this.state.canEnter && this.state.fxEnabled && !this.state.active && !this.transitioning) {
        void this.enterBackground()
      }
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
        const initContext: AnimationContext = {
          ...ctxParam,
          options: layerOptions
            ? {
              ...ctxParam.options,
              ...layerOptions,
              objectTheatrePresetId: preset.id,
            }
            : { ...ctxParam.options, objectTheatrePresetId: preset.id },
        }
        return withTheatreInitContext(entry.factory(initContext), initContext)
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

  private clearManualPresetTimer() {
    if (this.manualPresetTimerId === null) return
    window.clearTimeout(this.manualPresetTimerId)
    this.manualPresetTimerId = null
  }

  private isManualChangeCooldownActive(): boolean {
    return performance.now() < this.manualChangeActiveUntil
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

  private getSongPlayheadSec(): number | undefined {
    const audio = this.audioEl ?? this.pickPlaybackElement()
    if (!audio || !Number.isFinite(audio.currentTime)) return undefined
    return Math.max(0, audio.currentTime)
  }

  private buildFxPickContext(allowUrlPreset = false): PickContext {
    const songDurationSec = this._clipDurationMs && this._clipDurationMs > 0
      ? this._clipDurationMs / 1000
      : undefined
    return {
      reducedMotion: this.prefersReducedMotion(),
      activePresetId: this.state.presetId,
      allowUrlPreset,
      ...buildSongVisualPickExtras(this.trackContext, {
        songDurationSec,
        songPlayheadSec: this.getSongPlayheadSec(),
      }),
    }
  }

  private syncTimelineClipPlayback(nowMs: number): boolean {
    const playheadSec = this.getSongPlayheadSec()
    if (playheadSec == null) return false

    const pickCtx = this.buildFxPickContext()
    const decision = resolveTimelinePlaybackDecision({
      timelineClips: pickCtx.timelineClips,
      songPlayheadSec: playheadSec,
      resolvePreset,
    })

    if (decision.kind === 'activeClip' && decision.presetId) {
      if (decision.presetId !== this.state.presetId && !this.transitioning) {
        this.lastTimelineClipPresetId = decision.presetId
        void this.changePresetAuto(decision.presetId)
      } else {
        this.lastTimelineClipPresetId = decision.presetId
      }
      return decision.suppressTimedRotation
    }

    const activeUserPresetMissing = Boolean(this.state.presetId && !resolvePreset(this.state.presetId))
    const shouldLeaveUserMedia =
      this.state.presetId &&
      isUserMediaPresetId(this.state.presetId) &&
      (activeUserPresetMissing || this.lastTimelineClipPresetId)

    if ((decision.kind === 'gapFallback' || activeUserPresetMissing) && shouldLeaveUserMedia && !this.transitioning) {
      this.lastTimelineClipPresetId = null
      this.fxSelector.clearCandidate()
      this.resetRotationHold(nowMs)
      void this.changeToTimelineFallbackPreset()
    }

    return decision.suppressTimedRotation
  }

  private async changeToTimelineFallbackPreset() {
    if (!this.state.active || this.transitioning) return
    const selectedPreset = this.fxSelector.consumeNext(this.buildFxPickContext())
    if (!selectedPreset || selectedPreset.id === this.state.presetId) return
    await this.changePresetAuto(selectedPreset.id)
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

  public async rotateRandomPreset() {
    if (!this.state.active) return
    if (this.transitioning) return
    if (!this.canRotateNow(performance.now(), LEGACY_EXTERNAL_ROTATE_MIN_MS)) return

    const pickCtx = this.buildFxPickContext()

    if (this.deck?.getNextPresetId()) {
      this.fxSelector.consumeNext(pickCtx)
      const token = this.bumpTransitionToken()
      this.transitioning = true
      try {
        await this.withPresetChangeTimeout('auto:preloaded', this.deck.getNextPresetId() ?? 'unknown', () =>
          this.changeToPreloadedInner(token),
        )
      } finally {
        if (this.stillCurrent(token)) this.transitioning = false
      }
    } else {
      const selectedPreset = this.fxSelector.consumeNext(pickCtx)
      if (!selectedPreset || selectedPreset.id === this.state.presetId) return
      await this.changePresetAuto(selectedPreset.id)
    }
  }

  /** Manual FX menu: throttled, latest-request-wins, no preload/crossfade. */
  public changePreset(presetId: string) {
    this.requestManualPresetChange(presetId)
  }

  private requestManualPresetChange(presetId: string) {
    if (!this.state.active || !this.overlay) return
    if (isPresetQuarantined(presetId)) {
      theatreBreadcrumb('manual:quarantined-skip', { presetId })
      return
    }

    theatreBreadcrumb('manual:requested', { presetId })
    this.manualPresetLatest = presetId

    const run = () => {
      const id = this.manualPresetLatest
      this.manualPresetLatest = null
      if (!id || !this.state.active || !this.overlay) return
      void this.applyManualPresetChange(id)
    }

    const elapsed = performance.now() - this.lastManualPresetStart
    if (elapsed >= MANUAL_PRESET_THROTTLE_MS && this.manualPresetTimerId === null) {
      run()
      return
    }

    if (this.manualPresetTimerId !== null) return

    const delay = Math.max(0, MANUAL_PRESET_THROTTLE_MS - elapsed)
    this.manualPresetTimerId = window.setTimeout(() => {
      this.manualPresetTimerId = null
      run()
    }, delay)
  }

  private async applyManualPresetChange(presetId: string) {
    if (!this.overlay || !this.state.active) return
    if (presetId === this.state.presetId && !this.deck?.isTransitioning()) return

    this.lastManualPresetStart = performance.now()
    this.manualChangeActiveUntil = performance.now() + MANUAL_PRESET_COOLDOWN_MS
    this.fxSelector.clearCandidate()
    this.clearPreloadTimer()
    await this.deck?.cancelInFlight()

    const token = this.bumpTransitionToken()
    this.transitioning = true

    try {
      await this.withPresetChangeTimeout('manual:change', presetId, () =>
        this.changePresetInner(presetId, token, 'manual'),
      )
      this.deck?.assertInvariants('manual:change:post')
    } finally {
      if (this.stillCurrent(token)) this.transitioning = false
    }
  }

  private async changePresetAuto(presetId: string) {
    if (!this.overlay || !this.state.active) return
    if (this.transitioning) return

    const token = this.bumpTransitionToken()
    this.transitioning = true
    try {
      await this.withPresetChangeTimeout('auto:change', presetId, () =>
        this.changePresetInner(presetId, token, 'auto'),
      )
      this.deck?.assertInvariants('auto:change:post')
    } finally {
      if (this.stillCurrent(token)) this.transitioning = false
    }
  }

  private async withPresetChangeTimeout(
    label: string,
    presetId: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    // Sync breadcrumb before any await — if the main thread locks, timeout may never fire.
    theatreBreadcrumb(`${label}:start`, { presetId })

    let timeoutId = 0
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error('preset-change-timeout')),
        PRESET_CHANGE_TIMEOUT_MS,
      )
    })

    try {
      await Promise.race([fn(), timeoutPromise])
      theatreBreadcrumb(`${label}:complete`, { presetId })
    } catch (error) {
      if (error instanceof Error && error.message === 'preset-change-timeout') {
        theatreBreadcrumb(`${label}:timeout`, { presetId })
        quarantinePreset(presetId)
        await this.emergencyExitTheatre(`${label}:timeout:${presetId}`)
        return
      }
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  private async emergencyExitTheatre(reason: string) {
    theatreBreadcrumb('emergency-exit:start', { detail: reason })
    this.clearManualPresetTimer()
    this.clearPreloadTimer()
    this.manualPresetLatest = null

    this.bumpTransitionToken()
    this.transitioning = true
    const overlay = this.overlay

    this.stopFeatureLoop()
    this.state.active = false
    this.state.mode = null
    this.state.presetId = null
    this.extractor = null
    this.frameContext = null
    this.fxSelector.clearCandidate()

    destroyTheatreDevPanel()
    await this.deck?.cancelInFlight()
    if (this.deck) await this.deck.exit()

    this.clearOverlayBoundsTracking()
    if (overlay?.parentElement) overlay.parentElement.removeChild(overlay)
    if (this.overlay === overlay) this.overlay = null
    document.body.classList.remove('theatre-active')

    this.transitioning = false
    theatreBreadcrumb('emergency-exit:complete', { detail: reason })
    this.dispatchEvent(new Event('exit'))
    this.dispatchEvent(new Event('change'))
    this.ensureBackgroundIfNeeded()
  }

  private buildFrameContextWithAudio(
    deltaMs = 0,
    existingTimeRef?: { elapsed: number; delta: number; frame: number },
  ) {
    const featuresRef = this.extractor?.getFeatures()
    const audioSnapshot = this.audioBus.tick(featuresRef, deltaMs)
    return buildAnimationFrameContext({
      audioEl: this.audioEl,
      analyser: this.getOrCreateAnalyser(),
      mediaSrc: this.audioEl?.currentSrc || null,
      artworkUrl: this.state.artworkUrl,
      featuresRef,
      audioSnapshot,
      existingTimeRef,
    })
  }

  private async changePresetInner(presetId: string, token: number, source: PresetChangeSource) {
    const selectedPreset = resolvePreset(presetId)
    if (!selectedPreset || !this.stillCurrent(token)) return

    theatreBreadcrumb(`${source}:preset-inner:start`, { presetId })

    const { ctx, policy } = this.buildFrameContextWithAudio(0)

    if (!this.deck) return

    this.state.presetId = selectedPreset.id
    this.frameContext = ctx
    const factories = this.buildFactoriesForPreset(selectedPreset, policy.maxLayers)

    if (source === 'manual') {
      theatreBreadcrumb(`${source}:before-transitionToDirect`, { presetId })
      await this.deck.transitionToDirect(selectedPreset.id, factories, ctx)
    } else {
      const features = this.extractor?.getFeatures()
      let kind: TheatreTransitionKind = selectedPreset.timing?.transitionPreference ?? 'crossfade'

      if (isVideoPresetId(selectedPreset.id) || isVideoPresetId(this.deck.getActivePresetId())) {
        kind = 'cut'
      } else if (features) {
        if (features.flux.overall > DEFAULT_FLUX_GATE_THRESHOLD * 1.5) kind = 'cut'
        else if (features.flux.overall > DEFAULT_FLUX_GATE_THRESHOLD * 0.8) kind = 'fastFade'
        else if (features.flux.overall < 0.005) kind = 'slowFade'
      }

      await this.deck.transitionTo(selectedPreset.id, factories, ctx, kind)
    }

    if (!this.stillCurrent(token) || !this.overlay || !this.state.active) return

    this.resetRotationHold()
    this.dispatchEvent(new Event('change'))
    theatreBreadcrumb(`${source}:preset-inner:complete`, { presetId })

    if (source === 'auto' && !this.isManualChangeCooldownActive()) {
      this.rotationPreloadTriggered = Boolean(this.deck?.getNextPresetId())
    }
  }

  private async changeToPreloadedInner(token: number) {
    const presetId = this.deck?.getNextPresetId()
    const selectedPreset = presetId ? resolvePreset(presetId) : null
    
    if (!selectedPreset || !this.stillCurrent(token) || !this.deck) return

    theatreBreadcrumb('auto:preloaded:start', { presetId: selectedPreset.id })
    this.state.presetId = selectedPreset.id
    
    const features = this.extractor?.getFeatures()
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const policy = detectPolicy(reducedMotion)

    let kind: TheatreTransitionKind = selectedPreset.timing?.transitionPreference ?? 'crossfade'
    
    // Video-backed presets are expensive to overlap; cut to avoid stacked decoders.
    if (isVideoPresetId(selectedPreset.id) || isVideoPresetId(this.deck.getActivePresetId())) {
      kind = 'cut'
    } else if (kind === 'crossfade' && (policy.lowPower || reducedMotion || policy.dprClamp <= 1)) {
      kind = 'fastFade'
    }
    
    if (!isVideoPresetId(selectedPreset.id) && !isVideoPresetId(this.deck.getActivePresetId()) && features) {
      if (features.flux.overall > DEFAULT_FLUX_GATE_THRESHOLD * 1.5) kind = 'cut'
      else if (features.flux.overall > DEFAULT_FLUX_GATE_THRESHOLD * 0.8) kind = 'fastFade'
      else if (features.flux.overall < 0.005 && kind !== 'crossfade') kind = 'slowFade'
    }

    await this.deck.transitionToPreloaded(kind)

    if (!this.stillCurrent(token) || !this.overlay || !this.state.active) return

    this.resetRotationHold()
    this.dispatchEvent(new Event('change'))
    theatreBreadcrumb('auto:preloaded:complete', { presetId: selectedPreset.id })
    this.deck.assertInvariants('auto:preloaded:complete')

    if (!this.isManualChangeCooldownActive()) {
      this.rotationPreloadTriggered = true
    }
  }

  private async runPreloadNext() {
    if (!this.state.active || !this.deck || this.deck.getNextPresetId() || this.transitioning) return
    if (this.isManualChangeCooldownActive() || this.manualPresetLatest) return

    const nextPreset = this.fxSelector.peekNext(this.buildFxPickContext())
    if (!nextPreset) return

    const { ctx, policy } = this.buildFrameContextWithAudio(0, this.frameContext?.shared?.time)

    const factories = this.buildFactoriesForPreset(nextPreset, policy.maxLayers)
    await this.deck.preload(nextPreset.id, factories, ctx)
  }

  public async toggle() {
    if (!this.audioEl) this.rebindAudio()
    if (this.transitioning) return
    if (this.state.active) return this.exit()
    return this.enter()
  }

  public async enterBackground() {
    if (!this.state.fxEnabled || this.state.active || this.transitioning) return

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

    const appendPresetOption = (preset: ScenePresetDef) => {
      const option = document.createElement('button')
      option.type = 'button'
      option.className = 'theatre-visualization-option'
      option.value = preset.id
      option.textContent = preset.label
      option.setAttribute('role', 'menuitemradio')
      option.setAttribute('aria-checked', String(preset.id === initialPresetId))
      option.addEventListener('click', event => {
        event.stopPropagation()
        presetMenu.querySelectorAll<HTMLButtonElement>('.theatre-visualization-option').forEach(item => {
          item.setAttribute('aria-checked', String(item.value === preset.id))
        })
        setMenuOpen(false)
        this.changePreset(preset.id)
      })
      presetMenu.appendChild(option)
    }

    const appendSection = (title: string, presets: ScenePresetDef[]) => {
      if (presets.length === 0) return
      const heading = document.createElement('div')
      heading.className = 'theatre-visualization-menu-heading'
      heading.textContent = title
      presetMenu.appendChild(heading)
      presets
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label))
        .forEach(appendPresetOption)
    }

    const available = listPresets().filter(preset => !isPresetQuarantined(preset.id))
    appendSection('Sticker FX', available.filter(isObjectTheatrePreset))
    appendSection('Other visualizations', available.filter(preset => !isObjectTheatrePreset(preset)))

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
    theatreBreadcrumb('enter:start', { detail: mode })
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

    if (analyser) {
      this.extractor = new AudioFeatureExtractor(analyser)
    }
    this.audioBus.reset()
    this.fxSelector.clearCandidate()

    const { ctx, policy } = this.buildFrameContextWithAudio(0)

    const selectedPreset = this.fxSelector.consumeNext(this.buildFxPickContext(true))
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
    theatreBreadcrumb('enter:complete', { presetId: initialPresetId ?? undefined, detail: mode })
    this.deck?.assertInvariants('enter:complete')
    
    this.resetRotationHold(performance.now())
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

      const featuresRef = this.extractor?.getFeatures()
      const audioSnapshot = this.audioBus.tick(featuresRef, delta)
      if (frameCtx.shared) {
        frameCtx.shared.features = featuresRef
        frameCtx.shared.audio = audioSnapshot
      }
      
      if (this.autoRotateEnabled && this.state.active && !this.transitioning) {
        const suppressTimelineRotation = this.syncTimelineClipPlayback(now)
        if (!suppressTimelineRotation) {
          const resolved = this.resolveActiveRotationPolicy()
          const decision = this.rotationPolicy.evaluate({
            nowMs: now,
            presetStartedAtMs: this.rotationState.presetStartedAtMs,
            activePresetId: this.state.presetId,
            audio: audioSnapshot,
            features: featuresRef,
          }, resolved)
          this.handleRotationPolicyDecision(decision, now, resolved)
        }
      }

      this.deck?.renderFrame(frameCtx)
      this.featureLoopId = requestAnimationFrame(loop)
    }
    this.featureLoopId = requestAnimationFrame(loop)
  }

  public async exit(opts?: { rearmBackground?: boolean }) {
    if (!this.state.active && !this.overlay && !this.transitioning) return

    theatreBreadcrumb('exit:start', { presetId: this.state.presetId ?? undefined })
    this.clearManualPresetTimer()
    this.clearPreloadTimer()
    this.manualPresetLatest = null

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
      this.audioBus.reset()
      this.fxSelector.clearCandidate()
      this.frameContext = null
      
      destroyTheatreDevPanel()

      if (this.deck) await this.deck.exit()
      if (!this.stillCurrent(token)) return

      this.clearOverlayBoundsTracking()
      if (overlay?.parentElement) overlay.parentElement.removeChild(overlay)
      if (this.overlay === overlay) this.overlay = null
      document.body.classList.remove('theatre-active')
      this.state.presetId = null

      theatreBreadcrumb('exit:complete')
      this.deck?.assertInvariants('exit:complete')
      this.dispatchEvent(new Event('exit'))
      this.dispatchEvent(new Event('change'))
    } finally {
      if (this.stillCurrent(token)) {
        this.transitioning = false
        const shouldRearm =
          opts?.rearmBackground !== false &&
          this.state.fxEnabled &&
          this.state.canEnter
        if (shouldRearm) {
          this.ensureBackgroundIfNeeded()
        }
      }
    }
  }
}

const controller = new TheatreController()
export default controller

if (import.meta.hot) {
  import.meta.hot.dispose(() => controller.dispose())
}

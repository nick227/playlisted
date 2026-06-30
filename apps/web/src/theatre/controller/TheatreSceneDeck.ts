import AnimationBridge from './AnimationBridge'
import { AnimationContext, AnimationFactory } from '../core/IAnimation'
import { TheatreTransitionKind } from '../registry/scenePresets'
import { assertTheatreDeckInvariants } from './theatreDeckInvariants'
import { theatreBreadcrumb } from './theatreBreadcrumbs'

export const THEATRE_TRANSITIONS: Record<TheatreTransitionKind, { outMs: number, inMs: number, overlapMs: number }> = {
  cut:        { outMs: 0,    inMs: 0,    overlapMs: 0 },
  fastFade:   { outMs: 180,  inMs: 220,  overlapMs: 80 },
  slowFade:   { outMs: 700,  inMs: 900,  overlapMs: 300 },
  crossfade:  { outMs: 500,  inMs: 500,  overlapMs: 500 },
  dipToBlack: { outMs: 350,  inMs: 450,  overlapMs: 0 },
}

export class TheatreSceneDeck {
  private activeBridge: AnimationBridge | null = null
  private nextBridge: AnimationBridge | null = null

  private activeLayer: HTMLElement | null = null
  private nextLayer: HTMLElement | null = null

  private activePresetId: string | null = null
  private nextPresetId: string | null = null
  private transitioning = false
  private pendingTimeouts: number[] = []
  private transitionResolve: (() => void) | null = null

  constructor(private container: HTMLElement) {
  }

  private trackTimeout(id: number): number {
    this.pendingTimeouts.push(id)
    return id
  }

  private clearPendingTimeouts() {
    for (const id of this.pendingTimeouts) window.clearTimeout(id)
    this.pendingTimeouts = []
    const res = this.transitionResolve
    this.transitionResolve = null
    res?.()
  }

  public getInstances() {
    return [
      ...(this.activeBridge ? this.activeBridge.getInstances() : []),
      ...(this.nextBridge ? this.nextBridge.getInstances() : []),
    ]
  }

  public getActivePresetId() {
    return this.activePresetId
  }

  public getNextPresetId() {
    return this.nextPresetId
  }

  public isTransitioning() {
    return this.transitioning
  }

  public assertInvariants(label: string) {
    assertTheatreDeckInvariants(
      label,
      this.container,
      this.activeBridge,
      this.nextBridge,
      this.activePresetId,
      this.nextPresetId,
      this.transitioning,
    )
  }

  /** Abort preload and in-flight transition timers without tearing down the active scene. */
  public async cancelInFlight() {
    this.clearPendingTimeouts()
    if (this.nextBridge) {
      await this.destroyLayer(this.nextLayer, this.nextBridge, this.nextPresetId)
      this.nextLayer = null
      this.nextBridge = null
      this.nextPresetId = null
    }
    this.transitioning = false
    this.assertInvariants('cancelInFlight')
  }

  public renderFrame(ctx: AnimationContext) {
    this.activeBridge?.renderFrame(ctx)
    // Preloaded scenes stay paused until transition — avoid double draw/decode load.
    if (this.transitioning) {
      this.nextBridge?.renderFrame(ctx)
    }
  }

  public pause() {
    this.activeBridge?.pause()
    this.nextBridge?.pause()
  }

  public resume() {
    this.activeBridge?.resume()
    if (this.transitioning) {
      this.nextBridge?.resume()
    }
  }

  private createLayer(): HTMLElement {
    const layer = document.createElement('div')
    layer.className = 'theatre-scene-layer absolute inset-0'
    layer.style.opacity = '1'
    layer.style.transitionProperty = 'opacity'
    layer.style.transitionTimingFunction = 'linear'
    layer.style.pointerEvents = 'none'
    this.container.appendChild(layer)
    return layer
  }

  private async destroyLayer(
    layer: HTMLElement | null,
    bridge: AnimationBridge | null,
    presetId?: string | null,
  ) {
    if (bridge) {
      theatreBreadcrumb('deck:destroyLayer:before-exit', { presetId: presetId ?? undefined })
      await bridge.exit({ presetId: presetId ?? undefined })
    }
    if (layer?.parentElement) {
      layer.parentElement.removeChild(layer)
    }
  }

  public async enterInitial(
    presetId: string,
    factories: AnimationFactory[],
    ctx: AnimationContext,
  ) {
    if (this.activeBridge) {
      await this.destroyLayer(this.activeLayer, this.activeBridge, this.activePresetId)
    }

    this.activePresetId = presetId
    this.activeLayer = this.createLayer()
    this.activeBridge = new AnimationBridge()
    theatreBreadcrumb('deck:enterInitial:before-enter', { presetId })
    await this.activeBridge.enter(this.activeLayer, factories, ctx, { presetId })
    this.assertInvariants('enterInitial')
  }

  public async preload(
    presetId: string,
    factories: AnimationFactory[],
    ctx: AnimationContext,
  ) {
    if (this.transitioning) return
    if (this.nextBridge) {
      if (this.nextPresetId === presetId) return
      await this.destroyLayer(this.nextLayer, this.nextBridge, this.nextPresetId)
      this.nextLayer = null
      this.nextBridge = null
    }

    this.nextLayer = this.createLayer()
    this.nextLayer.style.opacity = '0'
    this.nextBridge = new AnimationBridge()
    this.nextPresetId = presetId

    theatreBreadcrumb('deck:preload:before-enter', { presetId })
    await this.nextBridge.enter(this.nextLayer, factories, ctx, { presetId })
    this.nextBridge.pause()

    if (this.nextLayer) {
      this.nextLayer.offsetHeight
    }
    this.assertInvariants('preload')
  }

  /** Manual preset path: no preload slot, instant cut swap. */
  public async transitionToDirect(
    presetId: string,
    factories: AnimationFactory[],
    ctx: AnimationContext,
  ) {
    await this.cancelInFlight()
    theatreBreadcrumb('deck:transitionToDirect:start', { presetId })

    const nextLayer = this.createLayer()
    const nextBridge = new AnimationBridge()
    theatreBreadcrumb('deck:transitionToDirect:before-enter', { presetId })
    await nextBridge.enter(nextLayer, factories, ctx, { presetId })

    theatreBreadcrumb('deck:transitionToDirect:before-destroy', {
      presetId,
      detail: `replacing=${this.activePresetId ?? 'none'}`,
    })
    await this.destroyLayer(this.activeLayer, this.activeBridge, this.activePresetId)

    this.activeLayer = nextLayer
    this.activeBridge = nextBridge
    this.activePresetId = presetId

    this.assertInvariants('transitionToDirect')
    theatreBreadcrumb('deck:transitionToDirect:complete', { presetId })
  }

  public async transitionToPreloaded(kind: TheatreTransitionKind) {
    if (this.transitioning || !this.nextBridge || !this.nextLayer || !this.nextPresetId) return
    this.transitioning = true
    this.nextBridge.resume()
    theatreBreadcrumb('deck:transitionToPreloaded:start', { presetId: this.nextPresetId ?? undefined })

    const timings = THEATRE_TRANSITIONS[kind]
    const presetId = this.nextPresetId
    const nextLayer = this.nextLayer
    const nextBridge = this.nextBridge

    return new Promise<void>((resolve) => {
      this.transitionResolve = resolve
      let watchdogFired = false
      const watchdog = this.trackTimeout(window.setTimeout(() => {
        watchdogFired = true
        console.warn(`[Theatre] Watchdog fired for transition to ${presetId}. Forcing cleanup.`)
        void this.destroyLayer(this.nextLayer, this.nextBridge, this.nextPresetId).then(() => {
          this.nextLayer = null
          this.nextBridge = null
          this.nextPresetId = null
          this.transitioning = false
          this.transitionResolve = null
          resolve()
        })
      }, timings.outMs + timings.inMs + 5000))

      if (this.activeLayer) {
        this.activeLayer.style.transitionDuration = `${timings.outMs}ms`
        if (kind === 'dipToBlack' || kind === 'fastFade' || kind === 'slowFade') {
          this.activeLayer.style.opacity = '0'
        }
      }

      const waitBeforeIn = Math.max(0, timings.outMs - timings.overlapMs)

      this.trackTimeout(window.setTimeout(() => {
        if (watchdogFired) return

        if (nextLayer) {
          nextLayer.style.transitionDuration = `${timings.inMs}ms`
          nextLayer.style.opacity = '1'
        }

        if (this.activeLayer && kind === 'crossfade') {
          this.activeLayer.style.transitionDuration = `${timings.outMs}ms`
          this.activeLayer.style.opacity = '0'
        }

        this.trackTimeout(window.setTimeout(() => {
          if (watchdogFired) return
          window.clearTimeout(watchdog)

          void this.destroyLayer(this.activeLayer, this.activeBridge, this.activePresetId).then(() => {
            this.activeLayer = nextLayer
            this.activeBridge = nextBridge
            this.activePresetId = presetId

            this.nextLayer = null
            this.nextBridge = null
            this.nextPresetId = null

            this.transitioning = false
            this.transitionResolve = null

            this.assertInvariants('transitionToPreloaded:complete')
            resolve()
          })
        }, timings.inMs))
      }, waitBeforeIn))
    })
  }

  public async transitionTo(
    presetId: string,
    factories: AnimationFactory[],
    ctx: AnimationContext,
    kind: TheatreTransitionKind,
  ) {
    await this.preload(presetId, factories, ctx)
    await this.transitionToPreloaded(kind)
  }

  public async exit() {
    this.clearPendingTimeouts()
    await this.destroyLayer(this.activeLayer, this.activeBridge, this.activePresetId)
    await this.destroyLayer(this.nextLayer, this.nextBridge, this.nextPresetId)
    this.activeLayer = null
    this.activeBridge = null
    this.nextLayer = null
    this.nextBridge = null
    this.activePresetId = null
    this.nextPresetId = null
    this.transitioning = false
    this.assertInvariants('exit')
  }
}

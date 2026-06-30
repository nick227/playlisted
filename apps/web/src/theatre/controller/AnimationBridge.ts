import { AnimationFactory, IAnimation, AnimationContext } from '../core/IAnimation'
import { staticFallbackFactory } from '../animations/staticFallback'
import { theatreBreadcrumb } from './theatreBreadcrumbs'
import { resolveTheatreInitContext } from './theatreFrameContext'

export type AnimationBridgeTrace = {
  presetId?: string
}

export type AnimationBridgeEnterOptions = {
  start?: boolean
}

export class AnimationBridge {
  private instances: IAnimation[] = []

  async enter(
    container: HTMLElement,
    factories: AnimationFactory[],
    ctx: AnimationContext,
    trace?: AnimationBridgeTrace,
    options: AnimationBridgeEnterOptions = {},
  ) {
    const shouldStart = options.start ?? true
    theatreBreadcrumb('bridge:enter:start', {
      presetId: trace?.presetId,
      detail: `layers=${factories.length}`,
    })

    for (let layerIndex = 0; layerIndex < factories.length; layerIndex++) {
      const factory = factories[layerIndex]
      let instance: IAnimation | null = null
      try {
        theatreBreadcrumb('bridge:enter:layer:before-init', {
          presetId: trace?.presetId,
          detail: `layer=${layerIndex}`,
        })
        instance = factory(ctx)
        const initContext = resolveTheatreInitContext(instance, ctx)
        await instance.init(container, initContext)
        // Opt in to controller RAF loop before start() so the animation never
        // creates its own loop. Old-pattern animations without enableExternalDriving
        // are unaffected and continue self-driving (backward compat).
        instance.enableExternalDriving?.()
        theatreBreadcrumb('bridge:enter:layer:before-start', {
          presetId: trace?.presetId,
          detail: `layer=${layerIndex}`,
        })
        if (shouldStart) {
          await instance.start()
        }
        this.instances.push(instance)
      } catch (e) {
        console.warn('[Theatre] Layer init failed, skipping:', e)
        try { instance?.destroy() } catch { /* ignore cleanup error */ }
      }
    }

    if (this.instances.length === 0) {
      try {
        const fallback = staticFallbackFactory(ctx)
        await fallback.init(container, ctx)
        fallback.enableExternalDriving?.()
        if (shouldStart) {
          await fallback.start()
        }
        this.instances.push(fallback)
      } catch (e) {
        console.error('[Theatre] Fallback also failed:', e)
      }
    }
  }

  // Driven by the controller's single RAF loop — forwards to every instance that
  // opted in to external driving. Old-pattern instances that didn't implement
  // renderFrame() are silently skipped.
  renderFrame(ctx: AnimationContext) {
    for (const i of this.instances) {
      try { i.renderFrame?.(ctx) } catch { /* ignore per-frame errors */ }
    }
  }

  /** Safe to call repeatedly — no-op when {@link instances} is already empty. */
  async exit(trace?: AnimationBridgeTrace) {
    if (this.instances.length === 0) return
    theatreBreadcrumb('bridge:exit:before-stop', {
      presetId: trace?.presetId,
      detail: `instances=${this.instances.length}`,
    })
    await Promise.all(this.instances.map(i => i.stop().catch(() => {})))
    this.instances.forEach(i => { try { i.destroy() } catch { /* ignore */ } })
    this.instances = []
  }

  pause()  { this.instances.forEach(i => { try { i.pause()  } catch { /* ignore */ } }) }
  resume() { this.instances.forEach(i => { try { i.resume() } catch { /* ignore */ } }) }

  getInstances() { return this.instances }
}

export default AnimationBridge

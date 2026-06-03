import { AnimationFactory, IAnimation, AnimationContext } from './IAnimation'
import { staticFallbackFactory } from './animations/staticFallback'

export class AnimationBridge {
  private instances: IAnimation[] = []

  async enter(container: HTMLElement, factories: AnimationFactory[], ctx: AnimationContext) {
    for (const factory of factories) {
      let instance: IAnimation | null = null
      try {
        instance = factory(ctx)
        await instance.init(container, ctx)
        // Opt in to controller RAF loop before start() so the animation never
        // creates its own loop. Old-pattern animations without enableExternalDriving
        // are unaffected and continue self-driving (backward compat).
        instance.enableExternalDriving?.()
        await instance.start()
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
        await fallback.start()
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
  async exit() {
    if (this.instances.length === 0) return
    await Promise.all(this.instances.map(i => i.stop().catch(() => {})))
    this.instances.forEach(i => { try { i.destroy() } catch { /* ignore */ } })
    this.instances = []
  }

  pause()  { this.instances.forEach(i => { try { i.pause()  } catch { /* ignore */ } }) }
  resume() { this.instances.forEach(i => { try { i.resume() } catch { /* ignore */ } }) }

  getInstances() { return this.instances }
}

export default AnimationBridge

import type { AnimationContext, IAnimation } from '../core/IAnimation'

/** Empty theatre layer for attachedOnly gaps and hydration — no site FX. */
export class BlankTheatreAnimation implements IAnimation {
  private root: HTMLElement | null = null

  enableExternalDriving() {}

  async init(container: HTMLElement, _context: AnimationContext) {
    this.root = document.createElement('div')
    this.root.style.position = 'absolute'
    this.root.style.inset = '0'
    this.root.style.background = '#08080a'
    this.root.style.pointerEvents = 'none'
    container.appendChild(this.root)
  }

  async start() {}

  pause() {}

  resume() {}

  async stop() {}

  destroy() {
    if (this.root?.parentElement) {
      this.root.parentElement.removeChild(this.root)
    }
    this.root = null
  }
}

import { IAnimation, AnimationContext } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'

/** Minimal fallback: dark gradient with a single slow-breathing glow. No audio dependency. */
export class StaticFallback extends CanvasAnimation {
  private lastGlowKey = ''
  private glowGrad: CanvasGradient | null = null

  constructor() {
    super({ useEffects: false, defaultOpacity: 1, defaultZIndex: 100 })
  }

  protected draw(context: AnimationContext) {
    const w = this.cssWidth
    const h = this.cssHeight
    const now = context.shared?.time?.elapsed ?? performance.now()
    const pulse = (Math.sin(now / 2800) + 1) * 0.5 * 0.06

    this.ctx.fillStyle = '#08080a'
    this.ctx.fillRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2
    const r = Math.min(w, h) * 0.18
    const glowKey = `${w}|${h}|${pulse.toFixed(4)}`
    if (glowKey !== this.lastGlowKey || !this.glowGrad) {
      this.glowGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      this.glowGrad.addColorStop(0, `rgba(55,55,88,${0.22 + pulse})`)
      this.glowGrad.addColorStop(1, 'rgba(8,8,10,0)')
      this.lastGlowKey = glowKey
    }
    this.ctx.fillStyle = this.glowGrad
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2)
    this.ctx.fill()
  }
}

export function staticFallbackFactory(_ctx: AnimationContext): IAnimation {
  return new StaticFallback()
}

export default staticFallbackFactory

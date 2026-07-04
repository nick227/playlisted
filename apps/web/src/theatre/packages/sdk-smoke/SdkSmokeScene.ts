import {
  CanvasAnimation,
  type PublicAnimationContext,
} from '@/theatre/author'

class SdkSmokeScene extends CanvasAnimation {
  constructor() {
    super({ defaultZIndex: 101 })
  }

  protected draw(context: PublicAnimationContext) {
    const w = this.cssWidth
    const h = this.cssHeight
    if (!w || !h) return

    const bands = this.readBands(context)
    const alpha = 0.12 + bands.bass * 0.2
    this.ctx.fillStyle = `rgba(0, 245, 212, ${alpha})`
    this.ctx.fillRect(0, 0, w, h)
  }
}

export function sdkSmokeFactory() {
  return new SdkSmokeScene()
}

import type { CacheCtx } from './faceUtil'

/** Rounded-square head in local coords centered at origin. */
export function pathSquircle(ctx: CacheCtx, hw: number, hh: number, round = 0.4) {
  const r = Math.min(hw, hh) * round
  ctx.beginPath()
  ctx.roundRect(-hw, -hh, hw * 2, hh * 2, r)
}

/** Eye socket: flat top, domed bottom (reference plate style). */
export function pathSocketDome(ctx: CacheCtx, cx: number, cy: number, ew: number, eh: number) {
  const flatY = cy - eh * 0.22
  ctx.moveTo(cx - ew, flatY)
  ctx.lineTo(cx + ew, flatY)
  ctx.bezierCurveTo(cx + ew * 1.02, cy + eh * 0.85, cx + ew * 0.35, cy + eh * 1.05, cx, cy + eh * 1.08)
  ctx.bezierCurveTo(cx - ew * 0.35, cy + eh * 1.05, cx - ew * 1.02, cy + eh * 0.85, cx - ew, flatY)
  ctx.closePath()
}

/** Wide mouth cavity bean. */
export function pathMouthBean(ctx: CacheCtx, mx: number, my: number, mw: number, mh: number, smile: number) {
  const dip = mh * (0.15 + smile * 0.2)
  ctx.moveTo(mx - mw, my)
  ctx.bezierCurveTo(mx - mw * 0.55, my + mh * (1.05 + smile), mx + mw * 0.55, my + mh * (1.05 + smile), mx + mw, my)
  ctx.bezierCurveTo(mx + mw * 0.65, my - dip, mx - mw * 0.65, my - dip, mx - mw, my)
  ctx.closePath()
}

/** Smile-slot mouth for closed pose. */
export function pathSmileSlot(ctx: CacheCtx, mx: number, my: number, mw: number, mh: number, smile: number) {
  ctx.moveTo(mx - mw, my)
  ctx.quadraticCurveTo(mx, my + mh * (0.85 + smile), mx + mw, my)
  ctx.quadraticCurveTo(mx, my + mh * 0.25, mx - mw, my)
  ctx.closePath()
}

export function drawChicletTeeth(
  ctx: CacheCtx,
  mx: number,
  my: number,
  mw: number,
  mh: number,
  tooth: string,
  shade: string,
  count: number,
) {
  const n = Math.max(2, count)
  const gap = mw * 0.07
  const tw = (mw * 2 - gap * (n - 1)) / n
  const th = mh * 0.48
  for (let i = 0; i < n; i++) {
    const tx = mx - mw + i * (tw + gap)
    ctx.fillStyle = tooth
    ctx.beginPath()
    ctx.roundRect(tx, my, tw, th, th * 0.4)
    ctx.fill()
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.roundRect(tx, my, tw, th * 0.28, th * 0.15)
    ctx.fill()
  }
}

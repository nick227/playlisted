import type { CacheCtx } from './faceUtil'

export function setRubberInk(ctx: CacheCtx, s: number, ink = '#0c0a10') {
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = Math.max(1.2, s * 0.022)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

export function drawCheekDots(ctx: CacheCtx, cx: number, cy: number, s: number) {
  const r = s * 0.018
  for (const side of [-1, 1] as const) {
    ctx.beginPath()
    ctx.arc(cx + side * s * 0.34, cy + s * 0.14, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawHookNose(ctx: CacheCtx, cx: number, cy: number, s: number, side = -1) {
  const nx = cx + side * s * 0.04
  const ny = cy + s * 0.04
  ctx.beginPath()
  ctx.moveTo(nx, ny - s * 0.04)
  ctx.lineTo(nx, ny + s * 0.05)
  ctx.lineTo(nx + side * s * 0.05, ny + s * 0.05)
  ctx.stroke()
}

export function drawBulbNose(ctx: CacheCtx, cx: number, cy: number, s: number) {
  ctx.beginPath()
  ctx.ellipse(cx, cy + s * 0.05, s * 0.035, s * 0.04, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function drawCarrotNose(ctx: CacheCtx, cx: number, cy: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(cx - s * 0.12, cy + s * 0.06)
  ctx.lineTo(cx + s * 0.14, cy + s * 0.04)
  ctx.lineTo(cx - s * 0.1, cy + s * 0.09)
  ctx.closePath()
  ctx.fill()
}

export function drawBrowArc(ctx: CacheCtx, cx: number, y: number, hw: number, lift: number) {
  ctx.beginPath()
  ctx.moveTo(cx - hw, y)
  ctx.quadraticCurveTo(cx, y - lift, cx + hw, y)
  ctx.stroke()
}

export function drawAngryBrow(ctx: CacheCtx, cx: number, y: number, hw: number, side: -1 | 1) {
  ctx.beginPath()
  ctx.moveTo(cx - side * hw * 0.2, y - hw * 0.15)
  ctx.lineTo(cx + side * hw * 0.85, y + hw * 0.35)
  ctx.stroke()
}

/** Vertical eye oval outline. */
export function drawEyeOval(ctx: CacheCtx, ex: number, ey: number, ew: number, eh: number) {
  ctx.beginPath()
  ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2)
  ctx.stroke()
}

/** Pie-cut pupil (Cuphead style). */
export function drawPieCutPupil(
  ctx: CacheCtx, ex: number, ey: number, pr: number, lookX: number, lookY: number,
) {
  const px = ex + lookX * pr * 0.5
  const py = ey + lookY * pr * 0.5
  ctx.beginPath()
  ctx.arc(px, py, pr, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4e8dc'
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.arc(px, py, pr * 0.92, Math.atan2(lookY, lookX) - 0.55, Math.atan2(lookY, lookX) + 0.55)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#0c0a10'
}

export function drawOvalPupilHighlight(
  ctx: CacheCtx, ex: number, ey: number, ew: number, eh: number, lookX: number, lookY: number,
) {
  drawEyeOval(ctx, ex, ey, ew, eh)
  const pr = ew * 0.42
  const px = ex + lookX * pr * 0.35
  const py = ey + lookY * pr * 0.35
  ctx.beginPath()
  ctx.ellipse(px, py, pr, pr * 1.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4e8dc'
  ctx.beginPath()
  ctx.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0c0a10'
}

export function drawSlitEyes(ctx: CacheCtx, cx: number, cy: number, s: number) {
  const spread = s * 0.2
  const ew = s * 0.11
  const eh = s * 0.14
  for (const side of [-1, 1] as const) {
    const ex = cx + side * spread
    drawEyeOval(ctx, ex, cy, ew, eh)
    ctx.fillRect(ex - ew * 0.85, cy - eh * 0.15, ew * 1.7, eh * 0.35)
  }
}

export function drawSlitLashes(ctx: CacheCtx, ex: number, ey: number, ew: number, eh: number) {
  ctx.beginPath()
  ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4e8dc'
  ctx.fillRect(ex - ew * 0.82, ey - eh * 0.14, ew * 1.64, eh * 0.28)
  ctx.fillStyle = '#0c0a10'
  const lash = Math.max(1, ew * 0.12)
  for (const tier of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const t = (i - 1) * 0.35
      ctx.beginPath()
      ctx.moveTo(ex + t * ew, ey + tier * eh * 0.75)
      ctx.lineTo(ex + t * ew * 1.2, ey + tier * (eh + lash * 2.2))
      ctx.stroke()
    }
  }
}

export function drawSquintArc(ctx: CacheCtx, ex: number, ey: number, ew: number) {
  ctx.beginPath()
  ctx.arc(ex, ey + ew * 0.15, ew, Math.PI * 1.08, Math.PI * 1.92)
  ctx.stroke()
}

export function drawSpiralEye(ctx: CacheCtx, ex: number, ey: number, ew: number, eh: number) {
  for (let ring = 3; ring >= 1; ring--) {
    ctx.beginPath()
    ctx.ellipse(ex, ey, ew * (ring * 0.32), eh * (ring * 0.32), 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(ex, ey, ew * 0.18, 0, Math.PI * 2)
  ctx.fill()
}

export function drawGrinMouth(ctx: CacheCtx, mx: number, my: number, mw: number, open: boolean) {
  ctx.beginPath()
  ctx.arc(mx, my, mw, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
  if (open) {
    ctx.beginPath()
    ctx.arc(mx, my + mw * 0.15, mw * 0.92, 0, Math.PI)
    ctx.lineTo(mx - mw * 0.92, my + mw * 0.15)
    ctx.fill()
    const gap = mw * 0.22
    for (let i = -2; i <= 2; i++) {
      const tx = mx + i * gap
      ctx.beginPath()
      ctx.moveTo(tx, my)
      ctx.lineTo(tx, my + mw * 0.55)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(mx - mw * 0.15, my + mw * 0.5)
    ctx.quadraticCurveTo(mx, my + mw * 0.35, mx + mw * 0.15, my + mw * 0.5)
    ctx.stroke()
  }
}

export function drawPillMouth(ctx: CacheCtx, mx: number, my: number, mw: number, mh: number) {
  ctx.beginPath()
  ctx.roundRect(mx - mw, my, mw * 2, mh, mh * 0.45)
  ctx.stroke()
  const gap = mw * 0.28
  for (let i = -1; i <= 1; i++) {
    const tx = mx + i * gap
    ctx.beginPath()
    ctx.moveTo(tx, my + mh * 0.15)
    ctx.lineTo(tx, my + mh * 0.85)
    ctx.stroke()
  }
}

export function drawFrownMouth(ctx: CacheCtx, mx: number, my: number, mw: number, mh: number) {
  ctx.beginPath()
  ctx.arc(mx, my - mh * 0.3, mw, Math.PI * 0.08, Math.PI * 0.92)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(mx, my - mh * 0.22, mw * 0.92, Math.PI * 0.1, Math.PI * 0.9)
  ctx.stroke()
  const gap = mw * 0.24
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(mx + i * gap, my - mh * 0.05)
    ctx.lineTo(mx + i * gap, my + mh * 0.5)
    ctx.stroke()
  }
}

export function drawZigMouth(ctx: CacheCtx, mx: number, my: number, mw: number) {
  const step = mw * 0.35
  ctx.beginPath()
  ctx.moveTo(mx - mw, my)
  for (let i = 0; i < 4; i++) {
    const x = mx - mw + i * step
    ctx.lineTo(x + step * 0.5, my + (i % 2 === 0 ? -mw * 0.2 : mw * 0.2))
  }
  ctx.stroke()
}

export function drawBowLips(ctx: CacheCtx, mx: number, my: number, s: number) {
  const w = s * 0.07
  ctx.beginPath()
  ctx.moveTo(mx - w, my)
  ctx.quadraticCurveTo(mx - w * 0.4, my - w * 0.8, mx, my - w * 0.35)
  ctx.quadraticCurveTo(mx + w * 0.4, my - w * 0.8, mx + w, my)
  ctx.quadraticCurveTo(mx, my + w * 0.55, mx - w, my)
  ctx.fill()
}

export function drawOMouth(ctx: CacheCtx, mx: number, my: number, w: number, h: number, tongue: boolean) {
  ctx.beginPath()
  ctx.ellipse(mx, my, w, h, 0, 0, Math.PI * 2)
  ctx.fill()
  if (tongue) {
    ctx.fillStyle = '#f4e8dc'
    ctx.beginPath()
    ctx.ellipse(mx, my + h * 0.35, w * 0.45, h * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0c0a10'
  }
}

export function drawSmirk(ctx: CacheCtx, mx: number, my: number, mw: number) {
  ctx.beginPath()
  ctx.moveTo(mx - mw, my)
  ctx.quadraticCurveTo(mx + mw * 0.2, my + mw * 0.35, mx + mw, my - mw * 0.05)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(mx + mw, my - mw * 0.05, mw * 0.12, 0, Math.PI * 2)
  ctx.fill()
}

export function drawMustache(ctx: CacheCtx, mx: number, my: number, mw: number) {
  ctx.beginPath()
  ctx.moveTo(mx - mw * 1.1, my)
  ctx.quadraticCurveTo(mx - mw * 0.4, my - mw * 0.35, mx, my - mw * 0.15)
  ctx.quadraticCurveTo(mx + mw * 0.4, my - mw * 0.35, mx + mw * 1.1, my)
  ctx.quadraticCurveTo(mx + mw * 0.5, my + mw * 0.45, mx, my + mw * 0.25)
  ctx.quadraticCurveTo(mx - mw * 0.5, my + mw * 0.45, mx - mw * 1.1, my)
  ctx.fill()
}

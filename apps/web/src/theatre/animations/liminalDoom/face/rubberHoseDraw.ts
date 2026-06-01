import type { RubberExpression } from '../character/libraries/face'
import type { CacheCtx } from './faceUtil'
import {
  drawAngryBrow,
  drawBowLips,
  drawBrowArc,
  drawBulbNose,
  drawCarrotNose,
  drawCheekDots,
  drawEyeOval,
  drawFrownMouth,
  drawGrinMouth,
  drawHookNose,
  drawMustache,
  drawOMouth,
  drawOvalPupilHighlight,
  drawPieCutPupil,
  drawPillMouth,
  drawSlitLashes,
  drawSmirk,
  drawSpiralEye,
  drawSquintArc,
  drawZigMouth,
  setRubberInk,
} from './rubberParts'

type Layout = { cx: number; cy: number; s: number; spread: number; ew: number; eh: number; pr: number }

function layout(cx: number, cy: number, s: number): Layout {
  return {
    cx, cy, s,
    spread: s * 0.21,
    ew: s * 0.1,
    eh: s * 0.15,
    pr: s * 0.042,
  }
}

function eyesPair(l: Layout, fn: (ex: number, ey: number) => void) {
  const ey = l.cy - l.s * 0.1
  fn(l.cx - l.spread, ey)
  fn(l.cx + l.spread, ey)
}

function drawNervous(ctx: CacheCtx, l: Layout) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.24, l.ew * 1.1, l.eh * 0.35)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.24, l.ew * 1.1, l.eh * 0.35)
  eyesPair(l, (ex, ey) => drawOvalPupilHighlight(ctx, ex, ey, l.ew, l.eh, -0.2, 0.15))
  drawHookNose(ctx, l.cx, l.cy, l.s)
  drawZigMouth(ctx, l.cx, l.cy + l.s * 0.22, l.s * 0.16)
}

function drawGrin(ctx: CacheCtx, l: Layout, open: boolean) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.24, l.ew, l.eh * 0.3)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.24, l.ew, l.eh * 0.3)
  eyesPair(l, (ex, ey) => {
    drawEyeOval(ctx, ex, ey, l.ew, l.eh)
    drawPieCutPupil(ctx, ex, ey, l.pr, -0.6, 0.5)
  })
  drawHookNose(ctx, l.cx, l.cy, l.s)
  drawGrinMouth(ctx, l.cx, l.cy + l.s * 0.2, l.s * 0.2, open)
}

function drawFlirty(ctx: CacheCtx, l: Layout) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.28, l.ew * 0.9, l.eh * 0.55)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.28, l.ew * 0.9, l.eh * 0.55)
  eyesPair(l, (ex, ey) => drawSlitLashes(ctx, ex, ey, l.ew, l.eh))
  drawHookNose(ctx, l.cx, l.cy, l.s)
  drawBowLips(ctx, l.cx, l.cy + l.s * 0.2, l.s)
  drawCheekDots(ctx, l.cx, l.cy, l.s)
}

function drawSmirkExpr(ctx: CacheCtx, l: Layout) {
  drawAngryBrow(ctx, l.cx - l.spread, l.cy - l.s * 0.28, l.ew * 1.2, -1)
  drawAngryBrow(ctx, l.cx + l.spread, l.cy - l.s * 0.28, l.ew * 1.2, 1)
  eyesPair(l, (ex, ey) => {
    drawEyeOval(ctx, ex, ey - l.eh * 0.15, l.ew, l.eh * 0.85)
    drawPieCutPupil(ctx, ex, ey, l.pr, -0.8, 0)
  })
  drawBulbNose(ctx, l.cx, l.cy, l.s)
  drawSmirk(ctx, l.cx + l.s * 0.02, l.cy + l.s * 0.24, l.s * 0.14)
}

function drawSquint(ctx: CacheCtx, l: Layout) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.22, l.ew, l.eh * 0.25)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.22, l.ew, l.eh * 0.25)
  eyesPair(l, (ex, ey) => {
    drawSquintArc(ctx, ex, ey, l.ew * 1.1)
    drawPieCutPupil(ctx, ex, ey + l.eh * 0.2, l.pr * 0.85, 0.2, 0.3)
  })
  drawHookNose(ctx, l.cx, l.cy + l.s * 0.02, l.s)
  ctx.beginPath()
  ctx.arc(l.cx, l.cy + l.s * 0.06, l.s * 0.025, Math.PI, 0)
  ctx.stroke()
  drawPillMouth(ctx, l.cx, l.cy + l.s * 0.2, l.s * 0.17, l.s * 0.07)
  drawCheekDots(ctx, l.cx, l.cy, l.s)
}

function drawWorried(ctx: CacheCtx, l: Layout) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.22, l.ew, l.eh * 0.35)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.22, l.ew, l.eh * 0.35)
  eyesPair(l, (ex, ey) => drawOvalPupilHighlight(ctx, ex, ey, l.ew, l.eh, -0.35, 0.4))
  drawHookNose(ctx, l.cx, l.cy, l.s)
  drawFrownMouth(ctx, l.cx, l.cy + l.s * 0.24, l.s * 0.18, l.s * 0.08)
  drawCheekDots(ctx, l.cx, l.cy, l.s)
}

function drawGoofy(ctx: CacheCtx, l: Layout, open: boolean) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.24, l.ew * 1.05, l.eh * 0.28)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.24, l.ew * 1.05, l.eh * 0.28)
  eyesPair(l, (ex, ey) => {
    drawEyeOval(ctx, ex, ey, l.ew * 1.05, l.eh * 1.05)
    drawPieCutPupil(ctx, ex, ey, l.pr, -0.7, 0.1)
  })
  drawCarrotNose(ctx, l.cx, l.cy, l.s)
  drawGrinMouth(ctx, l.cx, l.cy + l.s * 0.22, l.s * 0.19, open)
}

function drawMustacheExpr(ctx: CacheCtx, l: Layout, open: boolean) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.24, l.ew, l.eh * 0.3)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.24, l.ew, l.eh * 0.3)
  eyesPair(l, (ex, ey) => {
    drawEyeOval(ctx, ex, ey, l.ew, l.eh)
    drawPieCutPupil(ctx, ex, ey, l.pr, 0, 0.6)
  })
  drawBulbNose(ctx, l.cx, l.cy, l.s)
  drawMustache(ctx, l.cx, l.cy + l.s * 0.1, l.s * 0.1)
  drawOMouth(ctx, l.cx, l.cy + l.s * 0.2, l.s * 0.045, l.s * 0.035, open)
  drawCheekDots(ctx, l.cx, l.cy, l.s)
}

function drawShocked(ctx: CacheCtx, l: Layout, open: boolean) {
  drawBrowArc(ctx, l.cx - l.spread, l.cy - l.s * 0.26, l.ew, l.eh * 0.4)
  drawBrowArc(ctx, l.cx + l.spread, l.cy - l.s * 0.26, l.ew, l.eh * 0.4)
  eyesPair(l, (ex, ey) => drawSpiralEye(ctx, ex, ey, l.ew, l.eh))
  drawHookNose(ctx, l.cx, l.cy, l.s)
  drawOMouth(ctx, l.cx, l.cy + l.s * 0.22, l.s * 0.05, open ? l.s * 0.12 : l.s * 0.08, open)
}

const DRAWERS: Record<RubberExpression, (ctx: CacheCtx, l: Layout, open: boolean) => void> = {
  nervous: (ctx, l) => drawNervous(ctx, l),
  grin: drawGrin,
  flirty: (ctx, l) => drawFlirty(ctx, l),
  smirk: (ctx, l) => drawSmirkExpr(ctx, l),
  squint: (ctx, l) => drawSquint(ctx, l),
  worried: (ctx, l) => drawWorried(ctx, l),
  goofy: drawGoofy,
  mustache: drawMustacheExpr,
  shocked: drawShocked,
}

export function drawRubberHoseFace(
  ctx: CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  expr: RubberExpression,
  talkLevel: number,
) {
  setRubberInk(ctx, scale)
  const l = layout(cx, cy, scale)
  const open = talkLevel > 0.45
  DRAWERS[expr](ctx, l, open)
}

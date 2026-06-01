import type { HairStyle } from '../body/fashion'
import type { CacheCtx } from './faceUtil'
import { faceHash as h } from './faceUtil'

type HairCtx = { cx: number; cy: number; s: number; w: number; h0: number; topY: number; hairlineY: number }

function fillClump(
  ctx: CacheCtx,
  lx: number,
  rx: number,
  rootY: number,
  tipX: number,
  tipY: number,
  bulge: number,
) {
  const midY = (rootY + tipY) * 0.5
  ctx.beginPath()
  ctx.moveTo(lx, rootY)
  ctx.bezierCurveTo(lx - bulge * 0.2, midY, tipX - bulge * 0.35, tipY + bulge * 0.1, tipX, tipY)
  ctx.bezierCurveTo(tipX + bulge * 0.35, tipY + bulge * 0.1, rx + bulge * 0.2, midY, rx, rootY)
  ctx.closePath()
  ctx.fill()
}

function bangRow(ctx: CacheCtx, c: HairCtx, count: number, seed: number, spread: number) {
  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0.5 : i / (count - 1)
    const tipX = c.cx - c.w * spread + t * c.w * spread * 2
    const tipY = c.topY + c.h0 * (0.05 + h(seed, 280 + i) * 0.22)
    const half = c.w * (0.11 + h(seed, 290 + i) * 0.06)
    const lift = c.h0 * (0.35 + h(seed, 300 + i) * 0.55)
    fillClump(ctx, tipX - half, tipX + half, c.hairlineY, tipX, tipY - lift, half * 1.4)
  }
}

function sideLock(
  ctx: CacheCtx,
  c: HairCtx,
  side: -1 | 1,
  lengthMul: number,
) {
  const sx = c.cx + side * c.w * 0.72
  const ex = sx + side * c.w * 0.28
  const tipY = c.hairlineY + c.h0 * lengthMul
  fillClump(
    ctx,
    sx - side * c.w * 0.08,
    sx + side * c.w * 0.14,
    c.hairlineY,
    ex,
    tipY,
    c.w * 0.22,
  )
}

function crownVolume(ctx: CacheCtx, c: HairCtx, seed: number, fullness: number) {
  const layers = 3 + Math.floor(h(seed, 265) * 2)
  for (let i = 0; i < layers; i++) {
    const t = i / Math.max(1, layers - 1)
    const capW = c.w * (0.75 + t * 0.35) * fullness
    const capH = c.h0 * (0.45 + t * 0.25)
    const capY = c.topY + c.h0 * (0.35 + t * 0.15)
    ctx.beginPath()
    ctx.moveTo(c.cx - capW, c.hairlineY)
    ctx.bezierCurveTo(
      c.cx - capW * 0.9, capY - capH,
      c.cx - capW * 0.35, capY - capH * 1.05,
      c.cx, capY - capH * 1.1,
    )
    ctx.bezierCurveTo(
      c.cx + capW * 0.35, capY - capH * 1.05,
      c.cx + capW * 0.9, capY - capH,
      c.cx + capW, c.hairlineY,
    )
    ctx.closePath()
    ctx.fill()
  }
}

function hairHighlight(ctx: CacheCtx, c: HairCtx, hi: string, seed: number) {
  ctx.fillStyle = hi
  ctx.globalAlpha *= 0.55
  const hx = c.cx - c.w * (0.18 + h(seed, 350) * 0.12)
  ctx.beginPath()
  ctx.moveTo(hx - c.w * 0.12, c.hairlineY)
  ctx.bezierCurveTo(
    hx - c.w * 0.08, c.topY + c.h0 * 0.15,
    hx + c.w * 0.2, c.topY + c.h0 * 0.05,
    hx + c.w * 0.28, c.hairlineY,
  )
  ctx.closePath()
  ctx.fill()
}

export function drawStudioHair(
  ctx: CacheCtx,
  cx: number,
  cy: number,
  scale: number,
  seed: number,
  style: HairStyle,
  base: string,
  hi: string,
) {
  const c: HairCtx = {
    cx,
    cy,
    s: scale,
    w: scale * 0.62,
    h0: scale * 0.48,
    topY: cy - scale * 0.62,
    hairlineY: cy - scale * 0.08,
  }
  const swing = (h(seed, 260) - 0.5) * 0.1

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(swing)
  ctx.translate(-cx, -cy)
  ctx.fillStyle = base

  switch (style) {
    case 'buzz':
      crownVolume(ctx, c, seed, 0.85)
      bangRow(ctx, c, 5, seed, 0.55)
      break
    case 'crop':
      crownVolume(ctx, c, seed, 1)
      bangRow(ctx, c, 7, seed, 0.92)
      sideLock(ctx, c, -1, 0.35)
      sideLock(ctx, c, 1, 0.35)
      break
    case 'spiky': {
      const n = 11
      for (let i = 0; i < n; i++) {
        const t = n <= 1 ? 0.5 : i / (n - 1)
        const tipX = c.cx - c.w + t * c.w * 2
        const len = c.h0 * (0.55 + h(seed, 270 + i) * 0.95)
        fillClump(
          ctx,
          tipX - c.w * 0.07,
          tipX + c.w * 0.07,
          c.hairlineY,
          tipX,
          c.topY + c.h0 * 0.2 - len,
          c.w * 0.1,
        )
      }
      crownVolume(ctx, c, seed, 0.7)
      break
    }
    case 'bob':
      crownVolume(ctx, c, seed, 1.05)
      bangRow(ctx, c, 6, seed, 0.85)
      sideLock(ctx, c, -1, 0.95)
      sideLock(ctx, c, 1, 0.95)
      fillClump(ctx, c.cx - c.w * 0.2, c.cx + c.w * 0.2, c.hairlineY, c.cx, c.hairlineY + c.h0 * 0.75, c.w * 0.35)
      break
    case 'long':
    case 'bun':
      crownVolume(ctx, c, seed, 1.08)
      bangRow(ctx, c, 8, seed, 0.95)
      sideLock(ctx, c, -1, 1.85)
      sideLock(ctx, c, 1, 1.85)
      fillClump(ctx, c.cx - c.w * 0.55, c.cx - c.w * 0.15, c.hairlineY, c.cx - c.w * 0.42, c.hairlineY + c.h0 * 2.1, c.w * 0.28)
      fillClump(ctx, c.cx + c.w * 0.15, c.cx + c.w * 0.55, c.hairlineY, c.cx + c.w * 0.42, c.hairlineY + c.h0 * 2.1, c.w * 0.28)
      if (style === 'bun') {
        ctx.beginPath()
        ctx.ellipse(c.cx + c.w * 0.38, c.topY + c.h0 * 0.2, c.w * 0.32, c.h0 * 0.34, 0.15, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(c.cx + c.w * 0.38, c.topY + c.h0 * 0.2, c.w * 0.22, c.h0 * 0.24, 0.15, 0, Math.PI * 2)
        ctx.globalAlpha *= 0.5
        ctx.fill()
      }
      break
    default:
      crownVolume(ctx, c, seed, 1)
      bangRow(ctx, c, 6, seed, 0.88)
  }

  hairHighlight(ctx, c, hi, seed)
  ctx.restore()
}

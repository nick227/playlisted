import { clamp } from '../core/math'
import type { FaceConfig } from '../face'
import type { GraphicHeadDef } from './libraries/graphicHeads'

type Ctx = CanvasRenderingContext2D
type ImageState = {
  image: HTMLImageElement
  loaded: boolean
  failed: boolean
}

const imageCache = new Map<string, ImageState>()

export function drawGraphicHead(
  ctx: Ctx,
  x: number,
  y: number,
  scale: number,
  config: FaceConfig,
  head: GraphicHeadDef,
  timeMs: number,
  imageSrc?: string,
) {
  const alpha = clamp(config.dissolveAlpha, 0, 1)
  if (alpha <= 0.01) return

  const wobble = Math.sin(timeMs / 520 + config.seed) * scale * 0.025
  const glanceX = clamp(config.trackX, -1, 1) * scale * 0.08
  const glanceY = clamp(config.trackY, -1, 1) * scale * 0.055
  const talk = clamp(config.talkLevel, 0, 1)
  const fragment = clamp(config.fragmentLevel, 0, 1)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x + wobble, y)
  ctx.rotate(Math.sin(timeMs / 900 + config.seed * 0.2) * 0.025)

  if (!drawImageHead(ctx, scale, head, imageSrc)) {
    drawShape(ctx, scale, head)
    drawGraphicFace(ctx, scale, head, glanceX, glanceY, talk)
  }
  if (fragment > 0.02) drawFragmentLines(ctx, scale, head.ink, fragment, timeMs, config.seed)

  ctx.restore()
}

function drawImageHead(ctx: Ctx, r: number, head: GraphicHeadDef, imageSrc?: string): boolean {
  const src = imageSrc ?? head.imageSrc
  if (!src) return false

  const state = getImageState(src)
  if (!state.loaded || state.failed) return false

  drawHeadPath(ctx, r, head)
  ctx.save()
  ctx.clip()
  const d = r * 1.9
  ctx.drawImage(state.image, -d * 0.5, -d * 0.5, d, d)
  ctx.restore()

  ctx.lineWidth = Math.max(1.25, r * 0.075)
  ctx.strokeStyle = head.ink
  drawHeadPath(ctx, r, head)
  ctx.stroke()
  return true
}

function getImageState(src: string): ImageState {
  const cached = imageCache.get(src)
  if (cached) return cached

  const image = new Image()
  const state: ImageState = { image, loaded: false, failed: false }
  image.onload = () => { state.loaded = true }
  image.onerror = () => { state.failed = true }
  image.src = src
  imageCache.set(src, state)
  return state
}

function drawShape(ctx: Ctx, r: number, head: GraphicHeadDef) {
  ctx.lineWidth = Math.max(1.25, r * 0.075)
  ctx.strokeStyle = head.ink
  ctx.fillStyle = head.bg

  drawHeadPath(ctx, r, head)
  ctx.fill()
  ctx.stroke()

  switch (head.shape) {
    case 'poster':
      ctx.fillStyle = head.bg2
      ctx.fillRect(-r * 0.58, -r * 0.64, r * 1.16, r * 0.18)
      break
    case 'monitor':
      ctx.fillStyle = head.bg2
      roundRect(ctx, -r * 0.66, -r * 0.48, r * 1.32, r * 0.9, r * 0.1)
      ctx.fill()
      ctx.fillStyle = head.ink
      ctx.fillRect(-r * 0.24, r * 0.7, r * 0.48, r * 0.13)
      break
    case 'sticker':
      ctx.fillStyle = head.bg2
      ctx.beginPath()
      ctx.moveTo(r * 0.48, r * 0.44)
      ctx.lineTo(r * 0.82, r * 0.22)
      ctx.lineTo(r * 0.58, r * 0.78)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    case 'mask':
      ctx.fillStyle = head.bg2
      ctx.fillRect(-r * 0.42, -r * 0.72, r * 0.84, r * 0.12)
      break
    case 'record':
      ctx.strokeStyle = head.bg2
      ctx.lineWidth = Math.max(1, r * 0.035)
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(0, 0, r * (0.38 + i * 0.17), 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'badge':
      break
  }
}

function drawHeadPath(ctx: Ctx, r: number, head: GraphicHeadDef) {
  switch (head.shape) {
    case 'poster':
      roundRect(ctx, -r * 0.82, -r * 0.92, r * 1.64, r * 1.82, r * 0.16)
      break
    case 'monitor':
      roundRect(ctx, -r * 0.9, -r * 0.72, r * 1.8, r * 1.36, r * 0.18)
      break
    case 'sticker':
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 0.86, r * 0.9, -0.08, 0, Math.PI * 2)
      break
    case 'mask':
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.95)
      ctx.bezierCurveTo(r * 0.9, -r * 0.75, r * 0.82, r * 0.42, 0, r * 0.92)
      ctx.bezierCurveTo(-r * 0.82, r * 0.42, -r * 0.9, -r * 0.75, 0, -r * 0.95)
      ctx.closePath()
      break
    case 'record':
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2)
      break
    case 'badge':
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4
        const rr = i % 2 === 0 ? r * 0.95 : r * 0.78
        const px = Math.cos(a) * rr
        const py = Math.sin(a) * rr
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
  }
}

function drawGraphicFace(ctx: Ctx, r: number, head: GraphicHeadDef, glanceX: number, glanceY: number, talk: number) {
  ctx.lineWidth = Math.max(1.5, r * 0.08)
  ctx.strokeStyle = head.ink
  ctx.fillStyle = head.ink

  drawEye(ctx, -r * 0.3 + glanceX, -r * 0.16 + glanceY, r, head)
  drawEye(ctx, r * 0.3 + glanceX, -r * 0.16 + glanceY, r, head)

  ctx.strokeStyle = head.accent
  ctx.lineWidth = Math.max(1, r * 0.045)
  ctx.beginPath()
  ctx.moveTo(-r * 0.48, -r * 0.44)
  ctx.lineTo(-r * 0.12, -r * 0.34)
  ctx.moveTo(r * 0.48, -r * 0.44)
  ctx.lineTo(r * 0.12, -r * 0.34)
  ctx.stroke()

  ctx.strokeStyle = head.ink
  ctx.lineWidth = Math.max(1.5, r * 0.07)
  const mouthOpen = r * (0.12 + talk * 0.24)
  ctx.beginPath()
  ctx.ellipse(0, r * 0.32, r * 0.28, mouthOpen, 0, 0, Math.PI * 2)
  ctx.stroke()
  if (talk > 0.45) {
    ctx.fillStyle = head.accent
    ctx.beginPath()
    ctx.ellipse(0, r * 0.32, r * 0.12, mouthOpen * 0.45, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawEye(ctx: Ctx, x: number, y: number, r: number, head: GraphicHeadDef) {
  ctx.fillStyle = head.accent
  ctx.beginPath()
  ctx.ellipse(x, y, r * 0.16, r * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = head.ink
  ctx.beginPath()
  ctx.arc(x, y, r * 0.055, 0, Math.PI * 2)
  ctx.fill()
}

function drawFragmentLines(ctx: Ctx, r: number, ink: string, fragment: number, timeMs: number, seed: number) {
  ctx.strokeStyle = ink
  ctx.globalAlpha *= 0.25 + fragment * 0.45
  ctx.lineWidth = Math.max(1, r * 0.035)
  for (let i = 0; i < 5; i++) {
    const y = -r * 0.7 + i * r * 0.34
    const dx = Math.sin(timeMs / 120 + seed + i) * r * fragment * 0.22
    ctx.beginPath()
    ctx.moveTo(-r * 0.75 + dx, y)
    ctx.lineTo(r * 0.75 + dx, y + r * 0.04)
    ctx.stroke()
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

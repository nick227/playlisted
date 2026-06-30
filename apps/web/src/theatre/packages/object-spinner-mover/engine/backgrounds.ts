import type { BackgroundPreset } from './types'
import type { PaletteColors } from './palettes'
import { seededRandom } from './rng'

type BgCtx = { ctx: CanvasRenderingContext2D; w: number; h: number; cx: number; cy: number; time: number; flash: number; palette: PaletteColors }

export function drawBackground(preset: BackgroundPreset, bg: BgCtx) {
  const { ctx, w, h, cx, cy, time, flash, palette } = bg
  const flashMix = Math.min(1, flash * 0.6)

  switch (preset) {
    case 'radialGradient': {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7)
      g.addColorStop(0, palette.bg[0]!)
      g.addColorStop(0.5, palette.bg[1] ?? palette.bg[0]!)
      g.addColorStop(1, palette.bg[2] ?? palette.bg[0]!)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      break
    }
    case 'checkerboard': {
      const size = 64
      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          const idx = ((x / size) + (y / size)) % 2
          ctx.fillStyle = idx === 0 ? palette.bg[0]! : (palette.bg[1] ?? palette.bg[0]!)
          ctx.fillRect(x, y, size, size)
        }
      }
      break
    }
    case 'starfield': {
      ctx.fillStyle = palette.bg[0]!
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 48; i++) {
        const sx = seededRandom(i * 7) * w
        const sy = seededRandom(i * 13) * h
        const twinkle = 0.3 + Math.abs(Math.sin(time * 0.002 + i)) * 0.7
        ctx.globalAlpha = twinkle
        ctx.fillStyle = palette.accent
        ctx.fillRect(sx, sy, 1 + seededRandom(i) * 2, 1 + seededRandom(i * 3) * 2)
      }
      ctx.globalAlpha = 1
      break
    }
    case 'liquidLava': {
      const g = ctx.createLinearGradient(0, 0, w, h)
      const phase = Math.sin(time * 0.001) * 0.5 + 0.5
      g.addColorStop(0, palette.bg[0]!)
      g.addColorStop(phase, palette.bg[1] ?? palette.bg[0]!)
      g.addColorStop(1, palette.bg[2] ?? palette.bg[0]!)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc(cx + Math.sin(time * 0.001 + i) * w * 0.3, cy + Math.cos(time * 0.0012 + i) * h * 0.2, 60 + i * 20, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${0.03 + flashMix * 0.1})`
        ctx.fill()
      }
      break
    }
    case 'vhsGrid': {
      ctx.fillStyle = palette.bg[0]!
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = `rgba(255,255,255,0.08)`
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      const scanY = (time * 0.15) % h
      ctx.fillStyle = `rgba(255,255,255,${0.04 + flashMix * 0.06})`
      ctx.fillRect(0, scanY, w, 4)
      break
    }
    case 'comicBurst': {
      ctx.fillStyle = palette.bg[0]!
      ctx.fillRect(0, 0, w, h)
      const rays = 16
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + time * 0.0003
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * w, cy + Math.sin(angle) * h)
        ctx.lineTo(cx + Math.cos(angle + 0.08) * w, cy + Math.sin(angle + 0.08) * h)
        ctx.closePath()
        ctx.fillStyle = i % 2 === 0 ? palette.bg[1]! : palette.bg[0]!
        ctx.fill()
      }
      break
    }
    case 'spotlightStage': {
      ctx.fillStyle = palette.bg[0]!
      ctx.fillRect(0, 0, w, h)
      const g = ctx.createRadialGradient(cx, h * 0.2, 0, cx, h * 0.2, h * 0.8)
      g.addColorStop(0, `rgba(255,255,255,${0.25 + flashMix * 0.2})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      break
    }
    case 'tunnelWarp': {
      ctx.fillStyle = palette.bg[0]!
      ctx.fillRect(0, 0, w, h)
      for (let ring = 8; ring >= 1; ring--) {
        const t = ring / 8
        const r = (Math.max(w, h) * 0.5) * t + Math.sin(time * 0.003 + ring) * 10
        ctx.strokeStyle = palette.fill[ring % palette.fill.length]!
        ctx.globalAlpha = 0.15 + t * 0.5
        ctx.lineWidth = 2 + flashMix * 4
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      break
    }
    case 'paperCollage': {
      const patches = ['#f5e6d3', '#e8d5c4', '#d4c4b0', '#c9b8a0']
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = palette.bg[i % palette.bg.length] ?? patches[i % patches.length]!
        const px = seededRandom(i * 5) * w * 0.8
        const py = seededRandom(i * 11) * h * 0.8
        ctx.fillRect(px, py, w * 0.3, h * 0.25)
      }
      break
    }
    case 'neonCity': {
      const g = ctx.createLinearGradient(0, h, 0, 0)
      g.addColorStop(0, palette.bg[0]!)
      g.addColorStop(0.6, palette.bg[1] ?? palette.bg[0]!)
      g.addColorStop(1, palette.bg[2] ?? palette.bg[0]!)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 12; i++) {
        const bx = (i / 12) * w
        const bh = 40 + seededRandom(i * 3) * 120
        ctx.fillStyle = palette.fill[i % palette.fill.length]!
        ctx.globalAlpha = 0.4 + flashMix * 0.3
        ctx.fillRect(bx, h - bh, w / 14, bh)
      }
      ctx.globalAlpha = 1
      break
    }
  }

  if (flashMix > 0.01) {
    ctx.fillStyle = palette.accent
    ctx.globalAlpha = flashMix * 0.35
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }
}

import type { ShapeKind, ShapePack } from './types'

export const SHAPE_PACKS: Record<ShapePack, ShapeKind[]> = {
  fastFood: ['burger', 'taco', 'hotdog', 'pizza', 'donut'],
  spooky: ['ghost', 'skull', 'moon', 'knife'],
  party: ['smiley', 'discoBall', 'star', 'heart'],
  kitchen: ['knife', 'donut', 'burger', 'hotdog'],
  nature: ['bee', 'duck', 'heart'],
  gambling: ['dice', 'star', 'lightning'],
  cosmic: ['ufo', 'moon', 'star', 'discoBall'],
  silly: ['smiley', 'poop', 'duck', 'taco', 'hotdog'],
  rave: ['discoBall', 'lightning', 'star', 'smiley'],
  horrorSnack: ['skull', 'knife', 'ghost', 'burger', 'poop'],
}

type DrawShapeCtx = { ctx: CanvasRenderingContext2D; size: number; fill: string; stroke: string; time: number }

export function drawShape(kind: ShapeKind, d: DrawShapeCtx) {
  const { ctx, size: s, fill, stroke } = d
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1, s * 0.06)

  switch (kind) {
    case 'smiley':
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = stroke; ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.2, s * 0.12, 0, Math.PI * 2); ctx.arc(s * 0.35, -s * 0.2, s * 0.12, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.45, 0.1, Math.PI - 0.1); ctx.lineWidth = s * 0.08; ctx.stroke()
      break
    case 'burger':
      ctx.fillRect(-s, -s * 0.7, s * 2, s * 0.35); ctx.fillRect(-s, -s * 0.15, s * 2, s * 0.3)
      ctx.fillStyle = '#2d8a2d'; ctx.fillRect(-s, s * 0.2, s * 2, s * 0.2)
      ctx.fillStyle = fill; ctx.fillRect(-s, s * 0.45, s * 2, s * 0.35); ctx.strokeRect(-s, -s * 0.7, s * 2, s * 1.5)
      break
    case 'ghost':
      ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.85, Math.PI, 0)
      ctx.lineTo(s * 0.85, s * 0.6)
      for (let i = 3; i >= 0; i--) { ctx.lineTo(s * 0.85 - (i * s * 0.42), s * (i % 2 === 0 ? 0.85 : 0.55)) }
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = stroke; ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.1, s * 0.15, 0, Math.PI * 2); ctx.arc(s * 0.3, -s * 0.1, s * 0.15, 0, Math.PI * 2); ctx.fill()
      break
    case 'dice':
      ctx.fillRect(-s, -s, s * 2, s * 2); ctx.strokeRect(-s, -s, s * 2, s * 2)
      ctx.fillStyle = stroke
      for (const [dx, dy] of [[-0.4, -0.4], [0.4, 0.4], [0, 0]] as const) {
        ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.12, 0, Math.PI * 2); ctx.fill()
      }
      break
    case 'knife':
      ctx.beginPath(); ctx.moveTo(-s * 0.2, s); ctx.lineTo(s * 0.2, s); ctx.lineTo(s * 0.05, -s * 0.3); ctx.lineTo(-s * 0.05, -s * 0.3); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#8b4513'; ctx.fillRect(-s * 0.15, s * 0.1, s * 0.3, s * 0.5); ctx.stroke()
      break
    case 'bee':
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = stroke; ctx.fillRect(-s * 0.7, -s * 0.15, s * 1.4, s * 0.12); ctx.fillRect(-s * 0.7, s * 0.1, s * 1.4, s * 0.12)
      ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(s, -s * 0.3, s * 0.4, s * 0.25, -0.5, 0, Math.PI * 2); ctx.fill()
      break
    case 'taco':
      ctx.beginPath(); ctx.moveTo(-s, s * 0.3); ctx.quadraticCurveTo(0, -s, s, s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#2d8a2d'; ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.1); ctx.lineTo(s * 0.6, s * 0.1); ctx.stroke()
      break
    case 'duck':
      ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.7, s * 0.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.3, s * 0.45, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ff8c00'; ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.2); ctx.lineTo(s * 1.2, -s * 0.1); ctx.lineTo(s * 0.8, 0); ctx.closePath(); ctx.fill()
      break
    case 'pizza':
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#cc2222'; ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.2, s * 0.12, 0, Math.PI * 2); ctx.arc(s * 0.3, 0, s * 0.1, 0, Math.PI * 2); ctx.fill()
      break
    case 'skull':
      ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = stroke; ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.15, s * 0.2, 0, Math.PI * 2); ctx.arc(s * 0.3, -s * 0.15, s * 0.2, 0, Math.PI * 2); ctx.fill()
      ctx.fillRect(-s * 0.5, s * 0.3, s, s * 0.35)
      break
    case 'moon':
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0a0a1a'; ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.2, s * 0.75, 0, Math.PI * 2); ctx.fill()
      break
    case 'star':
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? s : s * 0.4
        const px = Math.cos(a) * r; const py = Math.sin(a) * r
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
      break
    case 'ufo':
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = `rgba(180,255,255,0.5)`; ctx.beginPath(); ctx.ellipse(0, -s * 0.25, s * 0.35, s * 0.3, 0, 0, Math.PI * 2); ctx.fill()
      break
    case 'donut':
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0a0a1a'; ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = s * 0.15; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, Math.PI); ctx.stroke()
      break
    case 'hotdog':
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#cc2222'; ctx.fillRect(-s * 0.3, -s * 0.55, s * 0.6, s * 0.15); ctx.fillRect(-s * 0.3, s * 0.4, s * 0.6, s * 0.15)
      break
    case 'heart':
      ctx.beginPath(); ctx.moveTo(0, s * 0.3)
      ctx.bezierCurveTo(-s, -s * 0.3, -s, s * 0.5, 0, s)
      ctx.bezierCurveTo(s, s * 0.5, s, -s * 0.3, 0, s * 0.3); ctx.fill(); ctx.stroke()
      break
    case 'discoBall':
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-s, i * s * 0.3); ctx.lineTo(s, i * s * 0.3); ctx.stroke() }
      break
    case 'poop':
      ctx.beginPath(); ctx.ellipse(0, s * 0.5, s * 0.5, s * 0.3, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.6, s * 0.35, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(0, -s * 0.3, s * 0.45, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      break
    case 'lightning':
      ctx.beginPath(); ctx.moveTo(s * 0.1, -s); ctx.lineTo(-s * 0.4, s * 0.1); ctx.lineTo(s * 0.05, s * 0.1)
      ctx.lineTo(-s * 0.2, s); ctx.lineTo(s * 0.5, -s * 0.2); ctx.lineTo(0, -s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke()
      break
  }
}

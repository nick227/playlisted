import { IAnimation } from '../core/IAnimation'
import type { PublicAnimationContext } from '../author/types'
import CanvasAnimation from '../core/CanvasAnimation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Comet {
  x: number; y: number; vx: number; vy: number
  size: number; alpha: number
  color: [number, number, number]
  trail: Array<[number, number]>
}

// hat:     -1=none  0=tophat  1=partyhat  2=cowboy  3=crown  4=beanie
// glasses: -1=none  0=round   1=wayfarer  2=shades  3=heart  4=star  5=spiral
// wig:     -1=none  0=afro    1=pigtails  2=mohawk
// facial:  -1=none  0=thin    1=bushy     2=goatee  3=beard  4=fumanchu
interface Outfit {
  hat: number; glasses: number; bowtie: boolean; wig: number; facial: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COMET_COLORS: Array<[number, number, number]> = [
  [255, 200, 80], [180, 100, 255], [80, 200, 255], [255, 120, 180], [120, 255, 190],
]

function randOutfit(): Outfit {
  return {
    hat:     Math.random() < 0.40 ? -1 : Math.floor(Math.random() * 5),
    glasses: Math.random() < 0.35 ? -1 : Math.floor(Math.random() * 6),
    bowtie:  Math.random() < 0.30,
    wig:     Math.random() < 0.50 ? -1 : Math.floor(Math.random() * 3),
    facial:  Math.random() < 0.45 ? -1 : Math.floor(Math.random() * 5),
  }
}

// Must be drawn BEFORE the body so it appears behind
function drawWig(ctx: CanvasRenderingContext2D, type: number, cx: number, cy: number, bodyR: number): void {
  if (type < 0) return
  if (type === 0) {
    // Afro — base sphere + lighter highlight patches for texture
    const r = bodyR * 1.05; const oy = cy - bodyR * 0.12
    const g = ctx.createRadialGradient(cx, oy, r * 0.25, cx, oy, r)
    g.addColorStop(0, '#5a3820'); g.addColorStop(1, '#1e0c04')
    ctx.beginPath(); ctx.arc(cx, oy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
    // Texture: a few lighter arc highlights
    ctx.strokeStyle = 'rgba(110,60,25,0.35)'; ctx.lineWidth = r * 0.12
    for (const [ax, ay, ar, a0, a1] of [
      [-0.5, -0.55, 0.38, 0.2, 1.8], [0.45, -0.5, 0.35, 1.4, 2.9],
      [-0.1, -0.80, 0.28, 0.5, 2.2], [0.55, 0.10, 0.25, 3.5, 5.0],
    ] as Array<[number, number, number, number, number]>) {
      ctx.beginPath(); ctx.arc(cx + ax * r, oy + ay * r, ar * r, a0, a1); ctx.stroke()
    }
  } else if (type === 1) {
    // Pigtails — round buns with visible ribbon bows
    for (const s of [-1, 1]) {
      const px = cx + s * bodyR * 0.88; const py = cy - bodyR * 0.14; const pr = bodyR * 0.36
      const g = ctx.createRadialGradient(px - pr * 0.25, py - pr * 0.25, pr * 0.05, px, py, pr)
      g.addColorStop(0, '#7a3a12'); g.addColorStop(1, '#3a1a06')
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
      ctx.strokeStyle = 'rgba(140,80,30,0.3)'; ctx.lineWidth = 1; ctx.stroke()
      // Ribbon bow (two small triangles + knot)
      const by = py - pr * 0.90; const bw = pr * 0.28; const bh = pr * 0.16
      ctx.fillStyle = '#ee2277'
      for (const bs of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(px, by); ctx.lineTo(px + bs * bw, by - bh); ctx.lineTo(px + bs * bw, by + bh); ctx.closePath(); ctx.fill()
      }
      ctx.beginPath(); ctx.arc(px, by, pr * 0.07, 0, Math.PI * 2); ctx.fillStyle = '#ff55aa'; ctx.fill()
    }
  } else if (type === 2) {
    // Mohawk fin with subtle highlight
    const mW = bodyR * 0.20; const mH = bodyR * 0.72; const mY = cy - bodyR * 0.94
    ctx.beginPath()
    ctx.moveTo(cx - mW / 2, mY + mH)
    ctx.bezierCurveTo(cx - mW * 1.1, mY + mH * 0.4, cx - mW * 0.5, mY - mH * 0.05, cx, mY - mH * 0.38)
    ctx.bezierCurveTo(cx + mW * 0.5, mY - mH * 0.05, cx + mW * 1.1, mY + mH * 0.4, cx + mW / 2, mY + mH)
    ctx.closePath()
    const g = ctx.createLinearGradient(cx, mY - mH * 0.38, cx, mY + mH)
    g.addColorStop(0, '#ff1144'); g.addColorStop(0.45, '#ff6600'); g.addColorStop(1, '#ffdd00')
    ctx.fillStyle = g; ctx.fill()
    // Edge highlight
    const gh = ctx.createLinearGradient(cx - mW * 0.5, 0, cx, 0)
    gh.addColorStop(0, 'rgba(255,255,255,0.0)'); gh.addColorStop(0.4, 'rgba(255,255,255,0.18)'); gh.addColorStop(1, 'rgba(255,255,255,0.0)')
    ctx.fillStyle = gh; ctx.fill()
    ctx.strokeStyle = 'rgba(255,200,100,0.25)'; ctx.lineWidth = 1; ctx.stroke()
  }
}

// Drawn AFTER the body and eyes
function drawHat(ctx: CanvasRenderingContext2D, type: number, cx: number, baseY: number, bodyR: number): void {
  if (type < 0) return
  if (type === 0) {
    // Top hat
    const cW = bodyR * 0.44; const cH = bodyR * 0.50; const bW = bodyR * 0.72; const bH = bodyR * 0.065
    const top = baseY - cH - bH
    // Brim
    ctx.fillStyle = '#0d0d18'; ctx.fillRect(cx - bW / 2, baseY - bH, bW, bH)
    ctx.strokeStyle = 'rgba(80,60,140,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(cx - bW / 2, baseY - bH, bW, bH)
    // Crown
    ctx.fillStyle = '#101018'; ctx.fillRect(cx - cW / 2, top, cW, cH)
    // Band — fillRect not strokeRect
    ctx.fillStyle = 'rgba(140,100,220,0.85)'; ctx.fillRect(cx - cW / 2, top + cH * 0.78, cW, bodyR * 0.038)
    // Crown outline + shine
    ctx.strokeStyle = 'rgba(80,60,140,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(cx - cW / 2, top, cW, cH)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(cx - cW / 2 + 2, top + 2, cW * 0.3, cH - 4)
  } else if (type === 1) {
    // Party hat
    const tipY = baseY - bodyR * 0.70; const hW = bodyR * 0.30
    ctx.beginPath()
    ctx.moveTo(cx - hW, baseY); ctx.lineTo(cx + hW, baseY); ctx.lineTo(cx, tipY); ctx.closePath()
    const g = ctx.createLinearGradient(cx, tipY, cx, baseY)
    g.addColorStop(0, '#ffb0d8'); g.addColorStop(1, '#ff3380')
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke()
    // Polka dots
    const dH = baseY - tipY
    for (const [dx, dt] of [[-hW * 0.30, 0.22], [hW * 0.30, 0.28], [hW * 0.10, 0.52], [-hW * 0.14, 0.70]] as Array<[number, number]>) {
      ctx.beginPath(); ctx.arc(cx + dx, baseY - dH * dt, bodyR * 0.036, 0, Math.PI * 2)
      ctx.fillStyle = '#ffdd00'; ctx.fill()
    }
    // Pompom
    ctx.beginPath(); ctx.arc(cx, tipY, bodyR * 0.065, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(255,180,220,0.5)'; ctx.lineWidth = 1; ctx.stroke()
    // Elastic string arc
    ctx.strokeStyle = 'rgba(200,160,190,0.55)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, baseY + bodyR * 0.28, hW * 0.85, 0, Math.PI); ctx.stroke()
  } else if (type === 2) {
    // Cowboy hat
    const cW = bodyR * 0.40; const cH = bodyR * 0.34; const bW = bodyR * 0.88; const bH = bodyR * 0.055
    const top = baseY - cH - bH
    ctx.fillStyle = '#5c3418'
    ctx.beginPath(); ctx.ellipse(cx, top + cH / 2, cW / 2, cH / 2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(cx, baseY - bH, bW / 2, bH * 2.4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.ellipse(cx, top + cH / 2, cW / 2, cH / 2, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(cx, baseY - bH, bW / 2, bH * 2.4, 0, 0, Math.PI * 2); ctx.stroke()
    // Hat band
    ctx.strokeStyle = '#c8882a'; ctx.lineWidth = bodyR * 0.040
    ctx.beginPath(); ctx.ellipse(cx, baseY - bH - cH * 0.06, cW / 2 + 1, bodyR * 0.040, 0, 0, Math.PI * 2); ctx.stroke()
    // Crown crease
    ctx.strokeStyle = 'rgba(40,20,8,0.5)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx - cW * 0.3, top + cH * 0.3); ctx.lineTo(cx + cW * 0.3, top + cH * 0.3); ctx.stroke()
  } else if (type === 3) {
    // Crown — symmetric 5-peak zigzag
    const cW = bodyR * 0.62; const cH = bodyR * 0.38; const top = baseY - cH
    const baseRow = top + cH * 0.44
    // Build the zigzag: valley at edges, 5 peaks between them
    const pts: Array<[number, number]> = [
      [0,      0.44], [0.10, 0], [0.20, 0.38],
      [0.30,   0],    [0.40, 0.38],
      [0.50,   0],    [0.60, 0.38],
      [0.70,   0],    [0.80, 0.38],
      [0.90,   0],    [1,    0.44],
    ]
    ctx.beginPath()
    ctx.moveTo(cx - cW / 2, baseRow)
    for (const [fx, fy] of pts) ctx.lineTo(cx - cW / 2 + fx * cW, top + fy * cH)
    ctx.lineTo(cx + cW / 2, top + cH); ctx.lineTo(cx - cW / 2, top + cH); ctx.closePath()
    const cg = ctx.createLinearGradient(cx, top, cx, top + cH)
    cg.addColorStop(0, '#ffe040'); cg.addColorStop(1, '#c89000')
    ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#a07000'; ctx.lineWidth = 1.5; ctx.stroke()
    // Gems at 3 central peaks (positions 0.30, 0.50, 0.70)
    for (const [gx, gc] of [[0.30, '#ff3030'], [0.50, '#40d0ff'], [0.70, '#40ff60']] as Array<[number, string]>) {
      const gemX = cx - cW / 2 + gx * cW; const gemY = top + 4
      ctx.beginPath(); ctx.arc(gemX, gemY, bodyR * 0.040, 0, Math.PI * 2)
      ctx.fillStyle = gc; ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke()
    }
  } else if (type === 4) {
    // Beanie
    const bR = bodyR * 0.44; const cuffH = bodyR * 0.07
    const domeY = baseY - cuffH  // dome arc center = just above cuff
    ctx.fillStyle = '#cc3333'
    ctx.beginPath()
    ctx.arc(cx, domeY, bR, Math.PI, 0)  // top half of dome
    ctx.lineTo(cx + bR, domeY + cuffH); ctx.lineTo(cx - bR, domeY + cuffH); ctx.closePath()
    ctx.fill(); ctx.strokeStyle = '#ee5555'; ctx.lineWidth = 1; ctx.stroke()
    // Stripe
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = bodyR * 0.042
    ctx.beginPath(); ctx.arc(cx, domeY + cuffH * 0.3, bR * 0.97, Math.PI, 0); ctx.stroke()
    // Pompom
    ctx.beginPath(); ctx.arc(cx, domeY - bR, bodyR * 0.078, 0, Math.PI * 2)
    ctx.fillStyle = '#ffecec'; ctx.fill(); ctx.strokeStyle = 'rgba(255,150,150,0.4)'; ctx.lineWidth = 1; ctx.stroke()
  }
}

// Drawn AFTER eyes
function drawGlasses(ctx: CanvasRenderingContext2D, type: number, cx: number, eyeY: number, eyeOffX: number, eyeR: number, time: number): void {
  if (type < 0) return
  const lR = eyeR * 1.08
  // Ear arms helper — shared across round/wayfarer/sunglasses
  const arm = (frameColor: string, ox: number) => {
    ctx.strokeStyle = frameColor; ctx.lineWidth = 1.8; ctx.lineCap = 'round'
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + s * ox, eyeY)
      ctx.lineTo(cx + s * (ox + lR * 1.55), eyeY + eyeR * 0.28); ctx.stroke()
    }
  }

  if (type === 0) {
    // Round glasses — tinted lens fill + dark frame + ear arms
    ctx.fillStyle = 'rgba(50,80,140,0.18)'
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * eyeOffX, eyeY, lR, 0, Math.PI * 2); ctx.fill() }
    ctx.strokeStyle = '#282830'; ctx.lineWidth = 2.8
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * eyeOffX, eyeY, lR, 0, Math.PI * 2); ctx.stroke() }
    // Bridge
    ctx.beginPath(); ctx.moveTo(cx - eyeOffX + lR, eyeY); ctx.lineTo(cx + eyeOffX - lR, eyeY); ctx.stroke()
    arm('#282830', eyeOffX + lR)
  } else if (type === 1) {
    // Wayfarer — tinted lens + thick frame + ear arms
    const lW = lR * 2.25; const lH = lR * 1.85
    // Tinted fill
    ctx.fillStyle = 'rgba(50,80,140,0.22)'
    for (const s of [-1, 1]) { ctx.fillRect(cx + s * eyeOffX - lW / 2, eyeY - lH / 2, lW, lH) }
    // Frame (stroke over fill)
    ctx.strokeStyle = '#181820'; ctx.lineWidth = 4
    for (const s of [-1, 1]) { ctx.strokeRect(cx + s * eyeOffX - lW / 2, eyeY - lH / 2, lW, lH) }
    // Bridge
    ctx.beginPath(); ctx.moveTo(cx - eyeOffX + lW / 2, eyeY); ctx.lineTo(cx + eyeOffX - lW / 2, eyeY); ctx.stroke()
    arm('#181820', eyeOffX + lW / 2)
  } else if (type === 2) {
    // Sunglasses — rounded bar + nose bridge + ear arms
    const tW = (eyeOffX + lR) * 2; const sH = lR * 1.10; const rr = sH * 0.38
    // Rounded rect via arc path
    const lx = cx - tW / 2; const ty = eyeY - sH / 2
    ctx.beginPath()
    ctx.moveTo(lx + rr, ty)
    ctx.lineTo(lx + tW - rr, ty); ctx.arcTo(lx + tW, ty, lx + tW, ty + sH, rr)
    ctx.lineTo(lx + tW, ty + sH - rr); ctx.arcTo(lx + tW, ty + sH, lx, ty + sH, rr)
    ctx.lineTo(lx + rr, ty + sH); ctx.arcTo(lx, ty + sH, lx, ty, rr)
    ctx.lineTo(lx, ty + rr); ctx.arcTo(lx, ty, lx + tW, ty, rr)
    ctx.closePath()
    ctx.fillStyle = 'rgba(12,12,20,0.92)'; ctx.fill()
    ctx.strokeStyle = '#303040'; ctx.lineWidth = 2; ctx.stroke()
    // Nose bridge divider
    ctx.strokeStyle = 'rgba(80,80,100,0.7)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx, eyeY - sH * 0.28); ctx.lineTo(cx, eyeY + sH * 0.28); ctx.stroke()
    // Lens sheen
    ctx.fillStyle = 'rgba(255,255,255,0.055)'
    ctx.beginPath(); ctx.ellipse(cx - tW * 0.20, eyeY - sH * 0.08, tW * 0.22, sH * 0.20, 0, 0, Math.PI * 2); ctx.fill()
    arm('#303040', tW / 2)
  } else if (type === 3) {
    // Heart glasses — two-circle approach (guaranteed correct shape)
    const bR = lR * 0.50  // radius of each bump arc
    const bumpY = eyeY - lR * 0.10  // bump circle centers
    const pointY = eyeY + lR * 0.92  // bottom point of heart
    for (const s of [-1, 1]) {
      const hx = cx + s * eyeOffX
      ctx.fillStyle = 'rgba(225,45,75,0.84)'
      ctx.beginPath()
      // Left bump (top half arc) then right bump (top half arc), close to bottom point
      ctx.arc(hx - bR, bumpY, bR, Math.PI, 0)  // ends at (hx, bumpY)
      ctx.arc(hx + bR, bumpY, bR, Math.PI, 0)  // ends at (hx + 2bR, bumpY)
      ctx.lineTo(hx, pointY)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#aa1835'; ctx.lineWidth = 1.5; ctx.stroke()
    }
    // Bridge
    ctx.strokeStyle = '#aa1835'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx - eyeOffX + bR * 2, bumpY + bR * 0.2); ctx.lineTo(cx + eyeOffX - bR * 2, bumpY + bR * 0.2); ctx.stroke()
  } else if (type === 4) {
    // Star glasses — gold star with faint fill
    ctx.fillStyle = 'rgba(255,210,0,0.18)'
    for (const s of [-1, 1]) {
      const scx = cx + s * eyeOffX; const pts = 5
      ctx.beginPath()
      for (let p = 0; p < pts * 2; p++) {
        const r = p % 2 === 0 ? lR : lR * 0.42
        const a = (p * Math.PI) / pts - Math.PI / 2
        if (p === 0) ctx.moveTo(scx + r * Math.cos(a), eyeY + r * Math.sin(a))
        else         ctx.lineTo(scx + r * Math.cos(a), eyeY + r * Math.sin(a))
      }
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(255,220,0,0.84)'; ctx.fill()
      ctx.strokeStyle = '#c89000'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.fillStyle = 'rgba(255,210,0,0.18)'  // reset for next iteration
    }
  } else if (type === 5) {
    // Spiral / hypno (counter-rotating, animated)
    for (const s of [-1, 1]) {
      const scx = cx + s * eyeOffX
      ctx.save(); ctx.translate(scx, eyeY); ctx.rotate(time * (s > 0 ? 1.3 : -1.3))
      ctx.beginPath(); ctx.arc(0, 0, lR * 1.06, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(18,8,28,0.82)'; ctx.fill()
      for (let t = 0; t < 3; t++) {
        const r0 = lR * t / 3; const r1 = lR * (t + 1) / 3
        ctx.beginPath(); ctx.arc(0, 0, (r0 + r1) / 2, 0, Math.PI * 1.75)
        ctx.strokeStyle = t % 2 === 0 ? 'rgba(255,60,200,0.94)' : 'rgba(60,200,255,0.94)'
        ctx.lineWidth = (r1 - r0) * 0.72; ctx.stroke()
      }
      ctx.strokeStyle = '#9060cc'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(0, 0, lR * 1.06, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }
    // Bridge
    ctx.strokeStyle = '#9060cc'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx - eyeOffX + lR, eyeY); ctx.lineTo(cx + eyeOffX - lR, eyeY); ctx.stroke()
  }
}

// Drawn AFTER mouth
function drawFacial(ctx: CanvasRenderingContext2D, type: number, cx: number, mouthCY: number, mouthW: number, mouthH: number): void {
  if (type < 0) return
  const aboveY = mouthCY - mouthH * 0.5  // just above the mouth opening
  const belowY = mouthCY + mouthH * 1.1  // just below the mouth

  if (type === 0) {
    // Thin handlebar — two curving arms from center
    ctx.strokeStyle = '#2e1808'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx, aboveY)
      ctx.bezierCurveTo(cx + s * mouthW * 0.20, aboveY - 5, cx + s * mouthW * 0.52, aboveY, cx + s * mouthW * 0.58, aboveY + 8)
      ctx.stroke()
    }
    // Center join so both halves meet cleanly
    ctx.beginPath(); ctx.arc(cx, aboveY, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#2e1808'; ctx.fill()
  } else if (type === 1) {
    // Bushy — two large overlapping ellipses, lighter highlight lines
    ctx.fillStyle = '#281408'
    ctx.beginPath(); ctx.ellipse(cx - mouthW * 0.25, aboveY, mouthW * 0.32, mouthH * 0.90, -0.15, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(cx + mouthW * 0.25, aboveY, mouthW * 0.32, mouthH * 0.90,  0.15, 0, Math.PI * 2); ctx.fill()
    // Darker center to blend halves
    ctx.fillStyle = '#160a02'
    ctx.beginPath(); ctx.ellipse(cx, aboveY, mouthW * 0.08, mouthH * 0.55, 0, 0, Math.PI * 2); ctx.fill()
    // Subtle highlight strokes for hair texture
    ctx.strokeStyle = 'rgba(80,45,18,0.50)'; ctx.lineWidth = 1; ctx.lineCap = 'round'
    for (const [hx, hy, ha] of [[-0.20, 0, -0.3], [0.20, 0, 0.3], [-0.30, 0.3, -0.5], [0.30, 0.3, 0.5]] as Array<[number, number, number]>) {
      ctx.beginPath()
      ctx.moveTo(cx + hx * mouthW, aboveY + hy * mouthH - mouthH * 0.4)
      ctx.lineTo(cx + (hx + Math.sin(ha) * 0.15) * mouthW, aboveY + hy * mouthH + mouthH * 0.4)
      ctx.stroke()
    }
  } else if (type === 2) {
    // Goatee — pointed teardrop below chin
    ctx.fillStyle = '#281408'
    ctx.beginPath()
    ctx.moveTo(cx - mouthW * 0.18, belowY)
    ctx.bezierCurveTo(cx - mouthW * 0.20, belowY + mouthH * 1.5, cx - mouthW * 0.04, belowY + mouthH * 2.4, cx, belowY + mouthH * 2.4)
    ctx.bezierCurveTo(cx + mouthW * 0.04, belowY + mouthH * 2.4, cx + mouthW * 0.20, belowY + mouthH * 1.5, cx + mouthW * 0.18, belowY)
    ctx.closePath(); ctx.fill()
    // Highlight stroke down center
    ctx.strokeStyle = 'rgba(80,45,18,0.40)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx, belowY + mouthH * 0.2); ctx.lineTo(cx, belowY + mouthH * 2.0); ctx.stroke()
  } else if (type === 3) {
    // Full beard — broad rounded mass below mouth
    ctx.fillStyle = '#281408'
    ctx.beginPath(); ctx.ellipse(cx, belowY + mouthH * 1.3, mouthW * 0.60, mouthH * 1.5, 0, 0, Math.PI * 2); ctx.fill()
    // A few hair-line arcs for texture
    ctx.strokeStyle = 'rgba(75,42,14,0.45)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
    for (const [bx, by] of [[-0.20, 1.0], [0.20, 1.0], [-0.05, 1.8], [0.25, 1.6], [-0.28, 1.5]] as Array<[number, number]>) {
      ctx.beginPath()
      ctx.moveTo(cx + bx * mouthW, belowY + by * mouthH - mouthH * 0.4)
      ctx.lineTo(cx + bx * mouthW * 0.85, belowY + by * mouthH + mouthH * 0.5)
      ctx.stroke()
    }
  } else if (type === 4) {
    // Fu manchu — droops from mouth CORNERS, not from above the mouth
    const cornerX = mouthW * 0.50  // start at outer mouth edge
    ctx.strokeStyle = '#281408'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + s * cornerX, mouthCY)  // start at mouth corner
      ctx.bezierCurveTo(
        cx + s * cornerX * 1.10, mouthCY + mouthH * 0.8,
        cx + s * cornerX * 0.90, belowY + mouthH * 1.2,
        cx + s * cornerX * 0.60, belowY + mouthH * 2.2,
      )
      ctx.stroke()
    }
  }
}

function drawBowtie(ctx: CanvasRenderingContext2D, cx: number, y: number, bodyR: number): void {
  const tW = bodyR * 0.36; const tH = bodyR * 0.13
  // Wings
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + s * tW, y - tH); ctx.lineTo(cx + s * tW, y + tH); ctx.closePath()
    ctx.fillStyle = '#cc2020'; ctx.fill(); ctx.strokeStyle = '#881010'; ctx.lineWidth = 1; ctx.stroke()
    // Three polka dots per wing
    for (const [fx, fy] of [[0.40, -0.45], [0.68, 0], [0.40, 0.45]] as Array<[number, number]>) {
      ctx.beginPath(); ctx.arc(cx + s * tW * fx, y + tH * fy, bodyR * 0.018, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,180,180,0.65)'; ctx.fill()
    }
  }
  // Center knot
  ctx.beginPath(); ctx.ellipse(cx, y, tW * 0.10, tH * 0.80, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#ff5555'; ctx.fill(); ctx.strokeStyle = '#881010'; ctx.lineWidth = 1; ctx.stroke()
}

// ── Animation class ───────────────────────────────────────────────────────────

export function cuteMonstroFactory(): IAnimation {
  class CuteMonstro extends CanvasAnimation {
    private comets: Comet[] = []
    private blinkTimer = 3000
    private blinkPhase = 0     // 0=open  1=closing  2=opening
    private blinkT = 0
    private mouthOpen = 0
    private lastTime = 0
    private outfit: Outfit = randOutfit()
    private outfitTimer = 16000 + Math.floor(Math.random() * 14000)
    private headTurn = 1.0         // current x-scale of face (-1..1)
    private headTurnTarget = 1.0
    private headTurnTimer = 3000 + Math.floor(Math.random() * 5000)

    constructor() {
      super({ useEffects: true, defaultBlendMode: 'normal', defaultZIndex: 101 })
    }

    private pickOutfit(cx: number, cy: number, bodyR: number): void {
      this.outfit = randOutfit()
      this.outfitTimer = 14000 + Math.floor(Math.random() * 16000)
      if (this.effects) {
        this.effects.triggerParticleBurst(cx, cy - bodyR * 0.8, 18, 0.9, '255,220,80')
        this.effects.triggerParticleBurst(cx, cy, 10, 0.6, '200,100,255')
      }
    }

    private spawnComet(w: number, h: number, energy: number): void {
      if (this.comets.length >= 30) return
      const side = Math.floor(Math.random() * 4)
      const speed = 160 + Math.random() * 210 + energy * 240
      const spread = (Math.random() - 0.5) * 0.55
      let x = 0, y = 0, vx = 0, vy = 0
      if      (side === 0) { x = Math.random() * w; y = -20;    vx = spread * speed; vy = speed }
      else if (side === 1) { x = w + 20;            y = Math.random() * h; vx = -speed; vy = spread * speed }
      else if (side === 2) { x = Math.random() * w; y = h + 20; vx = spread * speed; vy = -speed }
      else                 { x = -20;               y = Math.random() * h; vx = speed;  vy = spread * speed }
      this.comets.push({
        x, y, vx, vy,
        size: 2.5 + Math.random() * 3 + energy * 3,
        alpha: 0.75 + Math.random() * 0.25,
        color: COMET_COLORS[Math.floor(Math.random() * COMET_COLORS.length)],
        trail: [],
      })
    }

    protected draw(context: PublicAnimationContext): void {
      const w = this.cssWidth; const h = this.cssHeight
      this.ctx.clearRect(0, 0, w, h)
      this.ctx.fillStyle = '#060810'; this.ctx.fillRect(0, 0, w, h)

      const { bass, mids, highs } = this.readBands(context)
      const features   = context.shared?.features
      const sensitivity = context.options?.sensitivity || 1
      const intensity   = context.options?.intensity  || 1
      const now   = context.shared?.time?.elapsed ?? performance.now()
      const delta = this.lastTime === 0 ? 16 : Math.min(now - this.lastTime, 100)
      this.lastTime = now
      const dt   = delta / 1000
      const time = now / 1000

      const audioSens   = sensitivity * intensity
      const energyValue = Math.min(1, (features?.env || features?.rms || 0) * 1.4)
      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false, midsHit: false, highsHit: false, beat: false, chaosHit: false,
        energy: energyValue, brightness: features?.centroid || 0,
      }

      const cx = w / 2; const cy = h / 2
      const minSide = Math.min(w, h)
      const bodyR   = minSide * (0.27 + bass * 0.05 * intensity)
      const wobble  = Math.sin(time * 2.2) * 0.02 + bass * 0.03 * intensity
      const bH      = bodyR * (1 - wobble * 0.6)

      // Outfit change timer
      this.outfitTimer -= delta
      if (this.outfitTimer <= 0) this.pickOutfit(cx, cy, bodyR)

      // Head-turn timer — picks a new target angle periodically
      this.headTurnTimer -= delta
      if (this.headTurnTimer <= 0) {
        const opts = [1.0, 1.0, 1.0, 0.78, 0.60, -0.60, -0.78, -1.0]
        this.headTurnTarget = opts[Math.floor(Math.random() * opts.length)]
        this.headTurnTimer = 3500 + Math.random() * 7000
      }
      // Smooth exponential approach — ~800 ms to reach target at 60 fps
      this.headTurn += (this.headTurnTarget - this.headTurn) * Math.min(1, 0.08 * (delta / 16))

      // ── Comets ──────────────────────────────────────────────────────────────
      if (triggers.beat) this.spawnComet(w, h, triggers.energy)
      if (triggers.chaosHit) { this.spawnComet(w, h, triggers.energy); this.spawnComet(w, h, triggers.energy) }
      if (Math.random() < 0.014 + energyValue * 0.055) this.spawnComet(w, h, energyValue * 0.55)

      for (let i = this.comets.length - 1; i >= 0; i--) {
        const c = this.comets[i]
        c.trail.push([c.x, c.y])
        if (c.trail.length > 14) c.trail.shift()
        c.x += c.vx * dt; c.y += c.vy * dt; c.alpha -= 0.009 * (delta / 16)
        if (c.alpha <= 0 || c.x < -160 || c.x > w + 160 || c.y < -160 || c.y > h + 160) { this.comets.splice(i, 1); continue }
        const [cr, cg, cb] = c.color
        for (let t = 0; t < c.trail.length; t++) {
          const tp = t / c.trail.length; const [tx, ty] = c.trail[t]
          this.ctx.beginPath(); this.ctx.arc(tx, ty, c.size * tp * 0.6, 0, Math.PI * 2)
          this.ctx.fillStyle = `rgba(${cr},${cg},${cb},${c.alpha * tp * 0.5})`; this.ctx.fill()
        }
        const grd = this.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 3.5)
        grd.addColorStop(0, `rgba(${cr},${cg},${cb},${c.alpha * 0.55})`); grd.addColorStop(1, 'rgba(0,0,0,0)')
        this.ctx.beginPath(); this.ctx.arc(c.x, c.y, c.size * 3.5, 0, Math.PI * 2); this.ctx.fillStyle = grd; this.ctx.fill()
        this.ctx.beginPath(); this.ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(255,255,255,${c.alpha})`; this.ctx.fill()
      }

      // ── Face turn — horizontal scale centred at cx (cheated 3-D turn) ────────
      this.ctx.save()
      this.ctx.translate(cx, 0)
      this.ctx.scale(this.headTurn, 1)
      this.ctx.translate(-cx, 0)

      // ── Wig (behind body) ────────────────────────────────────────────────────
      drawWig(this.ctx, this.outfit.wig, cx, cy, bodyR)

      // ── Body glow ────────────────────────────────────────────────────────────
      const gr = Math.round(70 + mids * 110); const gg = Math.round(30 + highs * 70); const gb = Math.round(160 + bass * 80)
      const glowR = bodyR * (1.7 + energyValue * 0.55)
      const glowGrd = this.ctx.createRadialGradient(cx, cy, bodyR * 0.7, cx, cy, glowR)
      glowGrd.addColorStop(0, `rgba(${gr},${gg},${gb},${0.10 + energyValue * 0.24 * audioSens})`)
      glowGrd.addColorStop(0.55, `rgba(${gr},${gg},${gb},${0.05 + energyValue * 0.10 * audioSens})`)
      glowGrd.addColorStop(1, 'rgba(0,0,0,0)')
      this.ctx.beginPath(); this.ctx.ellipse(cx, cy, glowR, glowR, 0, 0, Math.PI * 2)
      this.ctx.fillStyle = glowGrd; this.ctx.fill()

      // ── Body fill ────────────────────────────────────────────────────────────
      const br = Math.round(50 + mids * 50); const bg2 = Math.round(25 + bass * 35); const bb = Math.round(90 + highs * 70)
      const bW = bodyR * (1 + wobble)
      const bodyGrd = this.ctx.createRadialGradient(cx - bodyR * 0.22, cy - bodyR * 0.24, bodyR * 0.1, cx, cy, bodyR)
      bodyGrd.addColorStop(0, `rgb(${br + 55},${bg2 + 45},${bb + 55})`); bodyGrd.addColorStop(1, `rgb(${br},${bg2},${bb})`)
      this.ctx.beginPath(); this.ctx.ellipse(cx, cy, bW, bH, 0, 0, Math.PI * 2)
      this.ctx.fillStyle = bodyGrd; this.ctx.fill()
      this.ctx.strokeStyle = `rgba(${br + 90},${bg2 + 60},${bb + 100},0.5)`;  this.ctx.lineWidth = 1.5 + bass * 3 * intensity; this.ctx.stroke()

      // Horns
      const hornBaseY = cy - bH
      for (const side of [-1, 1]) {
        const hx = cx + side * bodyR * 0.38
        this.ctx.beginPath()
        this.ctx.moveTo(hx - bodyR * 0.10, hornBaseY + bodyR * 0.06)
        this.ctx.lineTo(hx,                hornBaseY - bodyR * (0.22 + bass * 0.07 * intensity))
        this.ctx.lineTo(hx + bodyR * 0.10, hornBaseY + bodyR * 0.06)
        this.ctx.closePath()
        this.ctx.fillStyle = `rgb(${br + 28},${bg2 + 20},${bb + 38})`; this.ctx.fill()
        this.ctx.strokeStyle = `rgba(${br + 80},${bg2 + 55},${bb + 90},0.5)`; this.ctx.lineWidth = 1.5; this.ctx.stroke()
      }

      // Spots
      const spots: Array<[number, number, number]> = [
        [-0.32, -0.37, 0.050], [0.30, -0.27, 0.042], [-0.42, 0.14, 0.046], [0.37, 0.20, 0.040], [0.02, 0.44, 0.050],
      ]
      for (const [sx, sy, sr] of spots) {
        this.ctx.beginPath(); this.ctx.arc(cx + sx * bodyR, cy + sy * bodyR, bodyR * (sr + highs * 0.014), 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${br + 65},${bg2 + 50},${bb + 85},0.28)`; this.ctx.fill()
      }

      // ── Eyes ─────────────────────────────────────────────────────────────────
      const eyeOffX = bodyR * 0.40; const eyeOffY = cy - bodyR * 0.10
      const eyeR    = bodyR * 0.265; const pupilR = eyeR * (0.40 + energyValue * 0.16)
      const pupilX  = Math.sin(time * 0.65) * eyeR * 0.22 + mids * eyeR * 0.18
      const pupilY  = Math.cos(time * 0.48) * eyeR * 0.18 - bass * eyeR * 0.14

      this.blinkTimer -= delta
      if (this.blinkTimer <= 0 && this.blinkPhase === 0) { this.blinkPhase = 1; this.blinkT = 0; this.blinkTimer = 2200 + Math.random() * 3000 }
      let blinkScale = 1.0
      if (this.blinkPhase > 0) {
        this.blinkT += delta; const half = 80
        if (this.blinkPhase === 1) { blinkScale = Math.max(0, 1 - this.blinkT / half); if (blinkScale <= 0) { this.blinkPhase = 2; this.blinkT = 0 } }
        else                       { blinkScale = Math.min(1, this.blinkT / half);     if (blinkScale >= 1)   this.blinkPhase = 0 }
      }

      for (const e of [-1, 1]) {
        const ex = cx + e * eyeOffX
        this.ctx.save(); this.ctx.translate(ex, eyeOffY); this.ctx.scale(1, blinkScale)
        this.ctx.beginPath(); this.ctx.arc(0, 0, eyeR, 0, Math.PI * 2); this.ctx.fillStyle = '#eef2ff'; this.ctx.fill()
        this.ctx.strokeStyle = `rgba(${br + 60},${bg2 + 40},${bb + 80},0.55)`; this.ctx.lineWidth = 1.5; this.ctx.stroke()
        this.ctx.beginPath(); this.ctx.arc(pupilX, pupilY, pupilR, 0, Math.PI * 2); this.ctx.fillStyle = '#080818'; this.ctx.fill()
        this.ctx.strokeStyle = `rgba(${gr},${gg + 20},${gb + 50},0.45)`; this.ctx.lineWidth = pupilR * 0.22
        this.ctx.beginPath(); this.ctx.arc(pupilX, pupilY, pupilR * 0.70, 0, Math.PI * 2); this.ctx.stroke()
        this.ctx.beginPath(); this.ctx.arc(pupilX - pupilR * 0.30, pupilY - pupilR * 0.32, pupilR * 0.27, 0, Math.PI * 2); this.ctx.fillStyle = 'rgba(255,255,255,0.90)'; this.ctx.fill()
        this.ctx.beginPath(); this.ctx.arc(pupilX + pupilR * 0.22, pupilY + pupilR * 0.20, pupilR * 0.12, 0, Math.PI * 2); this.ctx.fillStyle = 'rgba(255,255,255,0.50)'; this.ctx.fill()
        if (triggers.beat || triggers.bassHit) {
          const eg = this.ctx.createRadialGradient(0, 0, eyeR * 0.35, 0, 0, eyeR * 2.0)
          eg.addColorStop(0, `rgba(${gr + 80},${gg + 60},255,${0.38 * triggers.energy})`); eg.addColorStop(1, 'rgba(0,0,0,0)')
          this.ctx.beginPath(); this.ctx.arc(0, 0, eyeR * 2.0, 0, Math.PI * 2); this.ctx.fillStyle = eg; this.ctx.fill()
        }
        this.ctx.restore()
      }

      // ── Glasses (over eyes) ──────────────────────────────────────────────────
      drawGlasses(this.ctx, this.outfit.glasses, cx, eyeOffY, eyeOffX, eyeR, time)

      // ── Mouth ─────────────────────────────────────────────────────────────────
      this.mouthOpen += (bass * 0.75 * intensity - this.mouthOpen) * 0.20
      const mouthCY = cy + bodyR * 0.35; const mouthW = bodyR * 0.52 * (1 + bass * 0.18 * intensity)
      const mouthH  = Math.max(5, bodyR * 0.10 + this.mouthOpen * bodyR * 0.38)
      this.ctx.save()
      this.ctx.beginPath(); this.ctx.ellipse(cx, mouthCY, mouthW, mouthH, 0, 0, Math.PI); this.ctx.fillStyle = '#07040e'; this.ctx.fill()
      if (this.mouthOpen > 0.08) {
        const mg = this.ctx.createRadialGradient(cx, mouthCY, 0, cx, mouthCY, mouthW * 0.85)
        mg.addColorStop(0, `rgba(${gr + 40},${gg + 30},${gb + 60},${this.mouthOpen * 0.65})`); mg.addColorStop(1, 'rgba(0,0,0,0)')
        this.ctx.beginPath(); this.ctx.ellipse(cx, mouthCY, mouthW * 0.8, mouthH * 0.85, 0, 0, Math.PI); this.ctx.fillStyle = mg; this.ctx.fill()
      }
      const fW = mouthW * 0.11; const fH = mouthH * 0.78
      for (const f of [-1, 1]) {
        const fx = cx + f * mouthW * 0.26
        this.ctx.beginPath(); this.ctx.moveTo(fx - fW / 2, mouthCY); this.ctx.lineTo(fx + fW / 2, mouthCY); this.ctx.lineTo(fx, mouthCY + fH); this.ctx.closePath()
        this.ctx.fillStyle = '#dde2ff'; this.ctx.fill()
      }
      this.ctx.restore()

      // ── Facial hair (over lower face) ────────────────────────────────────────
      drawFacial(this.ctx, this.outfit.facial, cx, mouthCY, mouthW, mouthH)

      // ── Hat (on top of head) ─────────────────────────────────────────────────
      drawHat(this.ctx, this.outfit.hat, cx, hornBaseY, bodyR)

      // ── Bow tie (below chin) ─────────────────────────────────────────────────
      if (this.outfit.bowtie) drawBowtie(this.ctx, cx, cy + bodyR * 0.56, bodyR)

      // Restore face-turn transform; effects render in world space
      this.ctx.restore()

      // ── Effects ───────────────────────────────────────────────────────────────
      if (this.effects) {
        if (triggers.beat)     this.effects.triggerParticleBurst(cx, cy - bodyR * 0.9, Math.floor(8 + triggers.energy * 20), triggers.energy * 0.9, `${gr},${gg},${gb}`)
        if (triggers.chaosHit) this.effects.triggerShockwave(cx, cy, triggers.energy)
        if (triggers.midsHit)  this.effects.triggerParticleBurst(cx + bodyR * 0.65, cy - bodyR * 0.2, Math.floor(5 + triggers.energy * 12), triggers.energy * 0.7, '180,140,255')
      }
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }
  }

  return new CuteMonstro()
}

export default cuteMonstroFactory

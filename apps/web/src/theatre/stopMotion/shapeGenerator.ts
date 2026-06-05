/**
 * Procedural shape generator for dynamic canvas figures.
 * Uses seeded randomness to create reproducible but varied shapes.
 * All shapes render directly to canvas context—no SVG or external deps.
 */

/**
 * Simple seeded random for reproducibility.
 * Pass a seed to get consistent pseudo-random sequences.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Generate a shape descriptor from a seed.
 * Shape type is selected by seed, with parameters for variation.
 */
export interface ShapeDescriptor {
  type: 'spikes' | 'petals' | 'blob' | 'rings' | 'gear' | 'organic' | 'thorns'
  seed: number
  complexity: number
  asymmetry: number
  wobbleAmount: number
  innerVoid: number
}

export function generateShapeDescriptor(seed: number): ShapeDescriptor {
  const rng = (offset: number) => seededRandom(seed + offset * 0.7)
  const typeIndex = Math.floor(rng(1) * 7)
  const types: ShapeDescriptor['type'][] = ['spikes', 'petals', 'blob', 'rings', 'gear', 'organic', 'thorns']

  return {
    type: types[typeIndex],
    seed,
    complexity: 4 + Math.floor(rng(2) * 12),
    asymmetry: rng(3) * 0.7,
    wobbleAmount: rng(4) * 0.35,
    innerVoid: Math.max(0, rng(5) * 0.4 - 0.1),
  }
}

interface ShapeRenderContext {
  ctx: CanvasRenderingContext2D
  cx: number
  cy: number
  baseRadius: number
  rotation: number
  time: number
  energy: number
}

/**
 * Render a procedural shape to canvas context.
 * All rendering uses direct path drawing—no allocations in hot path.
 */
export function renderShape(descriptor: ShapeDescriptor, render: ShapeRenderContext) {
  const { ctx, cx, cy, baseRadius: r, rotation, time, energy } = render
  const { type, complexity, asymmetry, wobbleAmount, innerVoid } = descriptor

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)

  ctx.strokeStyle = `rgba(160,200,255,0.6)`
  ctx.fillStyle = `rgba(120,160,220,${0.08 + energy * 0.12})`
  ctx.lineWidth = 1.2 + energy * 1.5

  switch (type) {
    case 'spikes':
      renderSpikes(ctx, r, complexity, wobbleAmount, time, energy, asymmetry)
      break
    case 'petals':
      renderPetals(ctx, r, complexity, wobbleAmount, time, energy, innerVoid)
      break
    case 'blob':
      renderBlob(ctx, r, complexity, wobbleAmount, time, energy)
      break
    case 'rings':
      renderRings(ctx, r, complexity, energy, asymmetry)
      break
    case 'gear':
      renderGear(ctx, r, complexity, energy)
      break
    case 'organic':
      renderOrganic(ctx, r, complexity, wobbleAmount, time, energy)
      break
    case 'thorns':
      renderThorns(ctx, r, complexity, wobbleAmount, time, energy, asymmetry)
      break
  }

  ctx.restore()
}

function renderSpikes(
  ctx: CanvasRenderingContext2D,
  r: number,
  complexity: number,
  wobble: number,
  time: number,
  energy: number,
  asymmetry: number,
) {
  ctx.beginPath()
  for (let i = 0; i < complexity; i++) {
    const angle = (i / complexity) * Math.PI * 2
    const len = r * (0.7 + wobble * Math.sin(time / 400 + i) * energy + asymmetry * 0.08)
    const innerLen = r * 0.3 + energy * r * 0.15
    const x = Math.cos(angle) * len
    const y = Math.sin(angle) * len
    const ix = Math.cos(angle) * innerLen
    const iy = Math.sin(angle) * innerLen

    if (i === 0) ctx.moveTo(ix, iy)
    ctx.lineTo(x, y)
    ctx.lineTo(ix, iy)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function renderPetals(
  ctx: CanvasRenderingContext2D,
  r: number,
  complexity: number,
  wobble: number,
  time: number,
  energy: number,
  innerVoid: number,
) {
  const petalCount = Math.max(3, Math.floor(complexity / 2))
  ctx.beginPath()
  for (let p = 0; p < petalCount; p++) {
    const angle = (p / petalCount) * Math.PI * 2
    const cx = Math.cos(angle) * r * 0.4
    const cy = Math.sin(angle) * r * 0.4
    const pr = r * (0.35 + wobble * Math.sin(time / 300 + p) * energy * 0.8)

    if (p === 0) ctx.moveTo(cx, cy - pr)
    ctx.quadraticCurveTo(cx + pr * 0.5, cy, cx, cy + pr)
    ctx.quadraticCurveTo(cx - pr * 0.5, cy, cx, cy - pr)
  }
  if (innerVoid > 0.05) {
    ctx.moveTo(0, -r * innerVoid)
    ctx.arc(0, 0, r * innerVoid, 0, Math.PI * 2, true)
  }
  ctx.fill()
  ctx.stroke()
}

function renderBlob(
  ctx: CanvasRenderingContext2D,
  r: number,
  complexity: number,
  wobble: number,
  time: number,
  energy: number,
) {
  ctx.beginPath()
  for (let i = 0; i < complexity; i++) {
    const angle = (i / complexity) * Math.PI * 2
    const wob = Math.sin(time / 250 + i * 0.5) * wobble * energy + wobble * 0.2
    const radius = r * (0.5 + wob)
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function renderRings(
  ctx: CanvasRenderingContext2D,
  r: number,
  complexity: number,
  energy: number,
  asymmetry: number,
) {
  const ringCount = Math.max(3, Math.floor(complexity / 4 + energy * 2))
  for (let i = 0; i < ringCount; i++) {
    const ringR = (r * (i + 1)) / ringCount + asymmetry * r * Math.sin(i)
    ctx.lineWidth = 0.6 + energy * 0.8
    ctx.beginPath()
    ctx.arc(0, 0, ringR, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function renderGear(ctx: CanvasRenderingContext2D, r: number, complexity: number, energy: number) {
  const teeth = Math.max(6, Math.floor(complexity / 2))
  const innerR = r * 0.5
  const outerR = r
  const toothDepth = (r - innerR) * 0.6

  ctx.beginPath()
  for (let t = 0; t < teeth; t++) {
    const angle = (t / teeth) * Math.PI * 2
    const nextAngle = ((t + 1) / teeth) * Math.PI * 2
    const midAngle = (angle + nextAngle) / 2

    // Inner edge
    ctx.lineTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR)
    // Tooth outer
    ctx.lineTo(
      Math.cos(midAngle) * (outerR + energy * toothDepth),
      Math.sin(midAngle) * (outerR + energy * toothDepth),
    )
    ctx.lineTo(Math.cos(nextAngle) * innerR, Math.sin(nextAngle) * innerR)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function renderOrganic(
  ctx: CanvasRenderingContext2D,
  r: number,
  complexity: number,
  wobble: number,
  time: number,
  energy: number,
) {
  ctx.beginPath()
  const points = Math.max(8, complexity)
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const n = Math.sin(angle * 3) * 0.3 + Math.cos(angle * 5) * 0.2
    const wob = Math.sin(time / 320 + i * 0.6) * wobble * energy * 0.5
    const radius = r * (0.55 + n + wob)
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function renderThorns(
  ctx: CanvasRenderingContext2D,
  r: number,
  complexity: number,
  wobble: number,
  time: number,
  energy: number,
  asymmetry: number,
) {
  const thornCount = Math.max(5, Math.floor(complexity / 1.5))
  ctx.beginPath()

  for (let t = 0; t < thornCount; t++) {
    const angle = (t / thornCount) * Math.PI * 2 + asymmetry * Math.sin(t) * 0.4
    const baseLen = r * (0.4 + wobble * Math.sin(time / 280 + t * 0.8) * energy)
    const tipLen = baseLen + r * 0.3 * energy
    const spreadAngle = Math.PI / 20

    const baseX = Math.cos(angle) * r * 0.5
    const baseY = Math.sin(angle) * r * 0.5
    const tipX = Math.cos(angle) * tipLen
    const tipY = Math.sin(angle) * tipLen
    const leftX = Math.cos(angle - spreadAngle) * baseLen
    const leftY = Math.sin(angle - spreadAngle) * baseLen
    const rightX = Math.cos(angle + spreadAngle) * baseLen
    const rightY = Math.sin(angle + spreadAngle) * baseLen

    if (t === 0) ctx.moveTo(baseX, baseY)
    ctx.lineTo(leftX, leftY)
    ctx.lineTo(tipX, tipY)
    ctx.lineTo(rightX, rightY)
    ctx.lineTo(baseX, baseY)
  }

  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

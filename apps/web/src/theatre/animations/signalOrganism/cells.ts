import type { CellNode } from './types'
import type { EvolveCtx } from './evolution'
import { clamp, lerp } from './types'
import { frameHold } from '../../stopMotion/stopMotion'
import { extremeRoll } from './evolution'
import { randSigned } from './random'

export const GRID_COLS = 4
export const GRID_ROWS = 3

export function buildCells(w: number, h: number): CellNode[] {
  const cells: CellNode[] = []
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      cells.push({
        gx, gy, x: 0, y: 0, r: 22, heat: 0, splitHold: 0, stress: 0, driftX: 0, driftY: 0,
      })
    }
  }
  layoutCells(cells, w, h)
  return cells
}

export function layoutCells(cells: CellNode[], w: number, h: number) {
  const padX = w * 0.08
  const padY = h * 0.12
  const spanX = w - padX * 2
  const spanY = h * 0.52
  for (const c of cells) {
    c.x = padX + (c.gx / (GRID_COLS - 1)) * spanX
    c.y = padY + (c.gy / (GRID_ROWS - 1)) * spanY
  }
}

export function applyCensusRitual(cells: CellNode[]) {
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]
    c.splitHold = 8 + Math.floor(Math.random() * 8)
    c.r *= 1.08 + Math.random() * 0.4
    c.heat = clamp(c.heat + 0.25 + Math.random() * 0.55, 0, 1)
    c.stress = clamp(c.stress + 0.2, 0, 1)
  }
}

export function applyMutantRitual(cells: CellNode[]) {
  const patient = cells[Math.floor(Math.random() * cells.length)]
  for (const c of cells) {
    if (Math.random() < 0.35) {
      c.heat = 1
      c.r *= 1.2 + Math.random() * 0.5
    }
    c.driftX = lerp(c.driftX, randSigned(c.gx + c.gy) * 18, 0.08)
    c.driftY = lerp(c.driftY, randSigned(c.gx * 2) * 14, 0.08)
  }
  patient.r *= 1.6
  patient.stress = 1
}

export function updateCells(
  cells: CellNode[],
  bass: number,
  mids: number,
  phaseMix: number,
  metabolic: boolean,
  chaos: boolean,
  now: number,
  evo: EvolveCtx,
) {
  const stepT = frameHold(now, 110)
  const grow = (bass * 210 + mids * 90) * phaseMix * evo.sizeMul
  const lerpRate = metabolic ? 0.35 : 0.1 + evo.age * 0.04
  const wild = evo.wildness

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]
    const wobble = Math.abs(Math.sin(stepT / (320 + i * 38))) * 48 * evo.sizeMul
    const targetR = (18 + wobble + grow * 0.35) * (1 + c.stress * 0.15)
    c.r = lerp(c.r, targetR, lerpRate)
    if (c.splitHold > 0) c.splitHold -= 1

    if (chaos && extremeRoll(wild, evo.age, 0.88)) {
      c.heat = clamp(c.heat + 0.35 + Math.random() * 0.4, 0, 1)
      c.stress = clamp(c.stress + 0.15, 0, 1)
    }
    if (extremeRoll(wild * 0.7, evo.age, 0.94)) {
      c.driftX = lerp(c.driftX, randSigned(now + i) * (8 + wild * 22), 0.06)
      c.driftY = lerp(c.driftY, randSigned(now + i * 2) * (6 + wild * 18), 0.06)
    } else {
      c.driftX = lerp(c.driftX, 0, 0.03)
      c.driftY = lerp(c.driftY, 0, 0.03)
    }

    c.heat = lerp(c.heat, chaos ? 0.35 + wild * 0.25 : 0, 0.018 + wild * 0.01)
    if (evo.isExhaust || evo.ritual === 'mutant') {
      c.stress = lerp(c.stress, 0.35 + wild * 0.2, 0.008)
    } else {
      c.stress = lerp(c.stress, 0, 0.006)
    }
    for (let j = 0; j < cells.length; j++) {
      if (i === j) continue
      const o = cells[j]
      if (Math.abs(c.gx - o.gx) + Math.abs(c.gy - o.gy) !== 1) continue
      if (c.heat > 0.4 && o.heat < c.heat) o.heat = lerp(o.heat, c.heat * 0.85, 0.03)
    }
  }
}

export function triggerDivision(cells: CellNode[]) {
  const c = cells[Math.floor(Math.random() * cells.length)]
  c.splitHold = 8
  c.r *= 1.15
}

export function drawVeins(
  ctx: CanvasRenderingContext2D,
  cells: CellNode[],
  veinPulse: number,
  mids: number,
  phaseMix: number,
  veinBoost = 0,
) {
  if (phaseMix < 0.28 && veinPulse < 0.05 && veinBoost < 0.1) return
  const alpha = clamp(0.08 + veinPulse * 0.5 + mids * 0.4 + veinBoost * 0.35, 0, 0.85) * phaseMix
  ctx.strokeStyle = `rgba(90,220,160,${alpha})`
  ctx.lineWidth = 1.2 + veinPulse * 2.5
  const at = (gx: number, gy: number) => cells[gy * GRID_COLS + gx]
  for (const c of cells) {
    const right = c.gx + 1 < GRID_COLS ? at(c.gx + 1, c.gy) : null
    const down = c.gy + 1 < GRID_ROWS ? at(c.gx, c.gy + 1) : null
    if (right) {
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(right.x, right.y)
      ctx.stroke()
    }
    if (down) {
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(down.x, down.y)
      ctx.stroke()
    }
  }
}

export function drawCells(
  ctx: CanvasRenderingContext2D,
  cells: CellNode[],
  mids: number,
  bass: number,
  phaseMix: number,
) {
  const sat = clamp(100 + mids * 280, 80, 255)
  const sh = Math.floor(sat * 0.5)
  const sf = Math.floor(sat)
  const st = Math.floor(sat * 0.72)
  for (const c of cells) {
    const heat = c.heat
    const fillA = clamp(0.12 + mids * 1.1 * phaseMix, 0.1, 0.9)
    const r = c.r
    const cx = c.x + 60 + c.driftX
    const cy = c.y + 60 + c.driftY
    const grad = ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r)
    grad.addColorStop(0, `rgba(${sh + heat * 80},${sf},${st - heat * 40},${fillA})`)
    grad.addColorStop(1, `rgba(12,22,32,${clamp(0.55 - bass * 0.4, 0.1, 0.6)})`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    if (c.splitHold > 0) {
      const splitR = r * 0.55
      ctx.fillStyle = `rgba(${sh},${sf},${st},${fillA * 0.85})`
      ctx.beginPath()
      ctx.arc(cx - splitR * 0.5, cy, splitR, 0, Math.PI * 2)
      ctx.arc(cx + splitR * 0.5, cy, splitR, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function drawTendrils(
  ctx: CanvasRenderingContext2D,
  cells: CellNode[],
  cx: number,
  cy: number,
  synapse: boolean,
  mids: number,
  phaseMix: number,
) {
  if (phaseMix < 0.4 && !synapse) return
  const top = [...cells].sort((a, b) => b.r + b.heat * 40 - (a.r + a.heat * 40)).slice(0, 4)
  const alpha = clamp(0.06 + mids * 0.55 + (synapse ? 0.35 : 0), 0, 0.7)
  ctx.strokeStyle = `rgba(160,230,255,${alpha})`
  ctx.lineWidth = synapse ? 2.2 : 1
  for (const c of top) {
    const tx = c.x + 60
    const ty = c.y + 60
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.quadraticCurveTo((cx + tx) * 0.5, (cy + ty) * 0.45 - 30, tx, ty)
    ctx.stroke()
  }
}

export function strongestCell(cells: CellNode[]) {
  let best = cells[0]
  for (const c of cells) {
    if (c.r + c.heat * 50 > best.r + best.heat * 50) best = c
  }
  return best
}

export function cellCenter(c: CellNode) {
  return { x: c.x + 60, y: c.y + 60 }
}

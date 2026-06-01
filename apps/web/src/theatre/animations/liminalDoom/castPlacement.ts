import type { CastMemberDef } from '../../sceneKit'
import { CAST_CHARACTER_SCALE } from './castScale'
import { clamp } from './types'

type Slot = {
  def: CastMemberDef
  nx: number
  ny: number
  r: number
  fixed: boolean
}

function isAnchoredRole(def: CastMemberDef): boolean {
  const role = def.role ?? (def.speaks ? 'speaker' : 'ambient')
  return role === 'speaker' || role === 'listener' || !!def.speaks
}

/** Normalized stage radius (0–1) for overlap tests — includes body + large face halo. */
export function castFootprintRadius(def: CastMemberDef): number {
  const body = (def.bodyScale ?? def.placement.scale) * CAST_CHARACTER_SCALE
  const face = def.showFace || def.speaks
    ? (def.faceScale ?? def.placement.scale) * CAST_CHARACTER_SCALE
    : 0
  return clamp(body * 0.11 + face * 0.42 + 0.05, 0.07, 0.24)
}

function clampSlot(s: Slot) {
  s.nx = clamp(s.nx, 0.05, 0.95)
  s.ny = clamp(s.ny, 0.3, 0.96)
}

/**
 * Push apart overlapping cast in normalized stage space.
 * Anchored speakers/listeners stay put; ambient crowd yields.
 */
export function separateCastPlacements(members: readonly CastMemberDef[]): CastMemberDef[] {
  if (members.length < 2) return [...members]

  const slots: Slot[] = members.map((def) => ({
    def,
    nx: def.placement.nx,
    ny: def.placement.ny,
    r: castFootprintRadius(def),
    fixed: isAnchoredRole(def),
  }))

  const gap = 0.025
  const iterations = 28

  for (let pass = 0; pass < iterations; pass++) {
    let moved = false
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]
        const b = slots[j]
        let dx = b.nx - a.nx
        let dy = b.ny - a.ny
        const dist = Math.hypot(dx, dy)
        const need = a.r + b.r + gap
        if (dist >= need) continue
        moved = true
        if (dist < 0.002) {
          dx = (i - j) * 0.03
          dy = 0.02
        } else {
          dx /= dist
          dy /= dist
        }
        const push = (need - Math.max(dist, 0.001)) * 0.52
        const px = dx * push
        const py = dy * push * 0.45

        if (!a.fixed && !b.fixed) {
          a.nx -= px
          a.ny -= py
          b.nx += px
          b.ny += py
        } else if (a.fixed && !b.fixed) {
          b.nx += px * 2
          b.ny += py * 2
        } else if (!a.fixed && b.fixed) {
          a.nx -= px * 2
          a.ny -= py * 2
        }
      }
    }
    for (const s of slots) clampSlot(s)
    if (!moved && pass > 6) break
  }

  return slots.map((s) => ({
    ...s.def,
    placement: { ...s.def.placement, nx: s.nx, ny: s.ny },
  }))
}

/** Evenly spaced nx slots for crowd builders (deterministic). */
export function spreadNxSlots(count: number, margin = 0.1): number[] {
  if (count <= 1) return [0.5]
  const out: number[] = []
  const span = 1 - margin * 2
  for (let i = 0; i < count; i++) {
    out.push(margin + (i / (count - 1)) * span)
  }
  return out
}

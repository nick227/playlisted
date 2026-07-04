import { describe, expect, it } from 'vitest'

import { layoutLandmarks } from '../packages/metropolis/render/graphicNovelPanel'

describe('metropolis panel layout', () => {
  it('fits five landmarks across the viewport without overlap', () => {
    const w = 1280
    const streetY = 900
    const slots = layoutLandmarks(w, streetY)
    expect(slots).toHaveLength(5)
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].x).toBeGreaterThanOrEqual(slots[i - 1].x + slots[i - 1].bw)
    }
    expect(slots[1].kind).toBe('theatre')
    expect(slots[1].bh).toBeGreaterThan(slots[4].bh)
    expect(slots[1].bh).toBeGreaterThan(streetY * 0.5)
  })
})

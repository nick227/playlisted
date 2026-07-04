import { buildVisibleChunks, iterateVisibleCells } from '../world/chunks'
import { hash2 } from '../world/rng'
import type { CityGrid } from '../world/cityGen'
import type { CameraState } from '../world/types'
import { projectTile } from '../world/coords'

export function drawIndustrialVents(
  ctx: CanvasRenderingContext2D,
  grid: CityGrid,
  cam: CameraState,
  cssW: number,
  cssH: number,
  elapsed: number,
  reducedMotion: boolean,
  scale: number,
) {
  if (scale <= 0) return
  const visible = buildVisibleChunks(grid.size, cam, cssW, cssH)
  iterateVisibleCells(grid.size, visible, (gx, gy) => {
    const cell = grid.cells[gy][gx]
    if (cell.district !== 'industrial' || cell.floors < 2) return
    if (hash2(cell.seed, 20) % 5 !== 0) return
    const p = projectTile(gx + 0.5, gy + 0.5, cell.floors * 0.35, cam)
    const drift = reducedMotion ? 0 : elapsed * 0.03 + cell.seed
    for (let i = 0; i < 3; i++) {
      const ox = Math.sin(drift + i) * 4
      const oy = -8 - (drift * 0.02 + i * 5) % 20
      ctx.fillStyle = `rgba(120,120,130,${0.12 * scale})`
      ctx.fillRect(p.sx + ox, p.sy + oy, 3, 3)
    }
  })
}

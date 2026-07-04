import { DISTRICTS } from '../world/districts'
import { rand01 } from '../world/rng'
import type { DistrictId } from '../world/types'
import { fillQuad, shade, tileCorners } from './drawUtils'
import type { CameraState } from '../world/types'

type Pt = { sx: number; sy: number }

export function drawStaticRoofClutter(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  district: DistrictId,
  seed: number,
  cam: CameraState,
) {
  const h = floors * 0.35
  const roof = tileCorners(gx, gy, h, cam)
  const cx = (roof[0].sx + roof[2].sx) * 0.5
  const cy = (roof[0].sy + roof[2].sy) * 0.5
  const style = DISTRICTS[district]

  if (rand01(seed, 9) > 0.55) {
    ctx.fillStyle = '#2a2a30'
    ctx.fillRect(cx - 2, cy - 4, 4, 3)
  }
  if (district === 'core' && rand01(seed, 11) > 0.4) {
    ctx.strokeStyle = '#445566'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, cy - 2)
    ctx.lineTo(cx, cy - 10 - rand01(seed, 12) * 6)
    ctx.stroke()
  }
  if (rand01(seed, 13) > 0.7) {
    ctx.fillStyle = shade(style.accent, -0.2)
    ctx.fillRect(roof[1].sx - 3, roof[1].sy - 2, 2, 4)
  }
}

export function drawFireEscape(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  seed: number,
  leftWall: Pt[],
  cam: CameraState,
) {
  if (floors < 3 || rand01(seed, 7) < 0.5) return
  ctx.strokeStyle = '#3a3530'
  ctx.lineWidth = 1
  for (let f = 1; f < floors; f += 2) {
    const t = f / floors
    const x = leftWall[0].sx + (leftWall[3].sx - leftWall[0].sx) * t
    const y = leftWall[0].sy + (leftWall[3].sy - leftWall[0].sy) * t
    ctx.strokeRect(x - 1, y - 6, 3, 5)
    if (f > 1) {
      ctx.beginPath()
      ctx.moveTo(x, y - 6)
      ctx.lineTo(x, y - 12)
      ctx.stroke()
    }
  }
  void gy
  void cam
}

const NEON_DISTRICTS: DistrictId[] = ['strip', 'clubRow', 'theatre', 'venue']

export function drawNeonSign(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  floors: number,
  district: DistrictId,
  seed: number,
  rightWall: Pt[],
  elapsed: number,
  reducedMotion: boolean,
) {
  if (!NEON_DISTRICTS.includes(district) || rand01(seed, 5) < 0.35) return
  const style = DISTRICTS[district]
  const t = 0.35
  const sx = rightWall[0].sx + (rightWall[3].sx - rightWall[0].sx) * t
  const sy = rightWall[0].sy + (rightWall[3].sy - rightWall[0].sy) * t - floors * 0.8
  const flicker = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 0.008 + seed)
  const w = 6 + Math.floor(rand01(seed, 6) * 4)

  ctx.fillStyle = style.glow
  ctx.globalAlpha = flicker * 0.35
  ctx.fillRect(sx - 1, sy - 3, w + 2, 5)
  ctx.globalAlpha = flicker * 0.95
  ctx.fillStyle = style.accent
  ctx.fillRect(sx, sy - 2, w, 3)
  ctx.globalAlpha = 1
  void gx
  void gy
}

export function drawTheatreMarquee(
  ctx: CanvasRenderingContext2D,
  district: DistrictId,
  seed: number,
  rightWall: Pt[],
  elapsed: number,
  reducedMotion: boolean,
) {
  if (district !== 'theatre' || rand01(seed, 8) < 0.4) return
  const sx = rightWall[1].sx - 4
  const sy = rightWall[1].sy - 8
  const pulse = reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(elapsed * 0.005)
  ctx.fillStyle = '#ff2244'
  ctx.globalAlpha = pulse
  ctx.fillRect(sx, sy, 8, 2)
  ctx.fillStyle = '#ffcc88'
  ctx.fillRect(sx + 1, sy + 3, 6, 2)
  ctx.globalAlpha = 1
}

import { IAnimation } from '../core/IAnimation'
import type { PublicAnimationContext } from '../author/types'
import CanvasAnimation from '../core/CanvasAnimation'

type Rgb = [number, number, number]

const SKY_PALETTE: [Rgb, Rgb][] = [
  [[8, 12, 35],  [4, 6, 20]],
  [[20, 8, 35],  [12, 4, 22]],
  [[5, 25, 35],  [3, 15, 22]],
  [[20, 20, 30], [12, 12, 20]],
  [[15, 10, 45], [8, 5, 28]],
  [[25, 15, 15], [15, 8, 10]],
]

const LIGHTNING_COLORS = ['255,255,255', '200,240,255', '220,200,255', '255,255,210'] as const

// Pastel palette for sky flashes — each entry is [r, g, b]
const FLASH_PALETTE: Rgb[] = [
  [180, 160, 255],  // lavender
  [140, 220, 200],  // mint
  [255, 195, 175],  // peach-rose
  [255, 235, 155],  // warm gold
  [160, 205, 255],  // sky blue
  [210, 255, 200],  // pale green
  [255, 175, 225],  // soft pink
  [200, 230, 255],  // ice blue
]

type LightningBolt = {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>
  color: string
  born: number
  life: number
  x: number
}

type SkyFlash = {
  x: number
  y: number
  radius: number
  born: number
  life: number
  r: number
  g: number
  b: number
}

// Per-drop state — generated once at init, reused every frame.
// x/phase are fractions (0-1) so they survive canvas resizes without regeneration.
type RainDrop = {
  x:      number  // horizontal position, 0-1 fraction of width
  phase:  number  // initial y-scroll phase, 0-1
  spd:    number  // individual speed multiplier: 0.80-1.20
  len:    number  // length multiplier: 0.60-1.40
  aVar:   number  // alpha variation: 0.55-1.00
  thresh: number  // intensity threshold to become visible: 0-1
}

// 3 depth layers: far → near.
// count is the base count at particleScale=1.
const LAYERS = [
  { speed: 0.50, width: 0.6,  lenBase: 3,  alphaMult: 0.22, count: 560 },
  { speed: 1.00, width: 1.0,  lenBase: 7,  alphaMult: 0.38, count: 430 },
  { speed: 1.60, width: 1.7,  lenBase: 13, alphaMult: 0.54, count: 290 },
] as const

// At layerSpeed=1 and songSpeed=1, near layer falls ~380px/sec at h=800px
const TIME_SCALE    = 0.00030
const MAX_BOLTS      = 10
const MAX_FLASHES    = 70
const BOLT_COOLDOWN  = 800    // ms — frequent but not every hit
const FLASH_COOLDOWN = 35     // ms per band — allows rapid multi-band bursts
// Each drop oscillates on its own ~2.1s shimmer cycle; ~22% are bright at any moment
const SHIMMER_RATE  = 0.003   // radians/ms

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }

function makeDrops(count: number): RainDrop[] {
  const drops: RainDrop[] = new Array(count)
  for (let i = 0; i < count; i++) {
    drops[i] = {
      x:      Math.random(),
      phase:  Math.random(),
      spd:    0.80 + Math.random() * 0.40,
      len:    0.60 + Math.random() * 0.80,
      aVar:   0.55 + Math.random() * 0.45,
      thresh: Math.random(),
    }
  }
  return drops
}

export function rainFactory(): IAnimation {
  class Rain extends CanvasAnimation {
    // ── Sky ──────────────────────────────────────────────────────────────────
    private skyTop: Rgb = [8, 12, 35]
    private skyBot: Rgb = [4, 6, 20]
    private skyFrom: [Rgb, Rgb] = [[8, 12, 35], [4, 6, 20]]
    private skyTo:   [Rgb, Rgb] = [[8, 12, 35], [4, 6, 20]]
    private skyProgress  = 1.0
    private skyDuration  = 8000
    private skyTimer     = 0
    private skyInterval  = 45000
    private lastGradKey  = ''
    private skyGrad: CanvasGradient | null = null

    // ── Drop pools ───────────────────────────────────────────────────────────
    private farDrops:  RainDrop[] = []
    private midDrops:  RainDrop[] = []
    private nearDrops: RainDrop[] = []
    private dropsReady = false
    private lastPScale = -1

    // ── Lightning ────────────────────────────────────────────────────────────
    private bolts: LightningBolt[] = []
    private lastBoltTime = 0
    private lastBoltX = -1

    // ── Sky flashes ──────────────────────────────────────────────────────────
    private flashes: SkyFlash[] = []
    private lastFlashBass  = 0
    private lastFlashMids  = 0
    private lastFlashHighs = 0

    constructor() {
      super({ defaultZIndex: 100 })
    }

    protected draw(context: PublicAnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w <= 0 || h <= 0) return

      const pScale = this.particleScale(context)
      if (!this.dropsReady || Math.abs(pScale - this.lastPScale) > 0.15) {
        const s = Math.max(0.25, Math.min(1, pScale))
        this.farDrops  = makeDrops(Math.floor(LAYERS[0].count * s))
        this.midDrops  = makeDrops(Math.floor(LAYERS[1].count * s))
        this.nearDrops = makeDrops(Math.floor(LAYERS[2].count * s))
        this.dropsReady = true
        this.lastPScale = pScale
      }

      const now   = context.shared?.time?.elapsed ?? performance.now()
      const delta = context.shared?.time?.delta   ?? 16

      const { bass, mids, highs } = this.readBands(context)
      const features    = context.shared?.features
      const env         = features?.env           ?? 0
      const fluxAll     = features?.flux?.overall ?? 0
      const sensitivity = context.options?.sensitivity ?? 1
      const intensity   = context.options?.intensity   ?? 1

      const songIntensity = Math.min(1, (bass * 0.55 + env * 0.45) * intensity * sensitivity)
      // Speed only ever increases — never slower than baseline
      const songSpeed     = Math.min(1.8, Math.max(1.0, 1.0 + fluxAll * 1.3 + env * 0.55))

      // ── Sky ────────────────────────────────────────────────────────────────
      this.updateSky(delta, songIntensity)
      this.ctx.clearRect(0, 0, w, h)
      this.drawSky(w, h)

      // ── Sky flashes (before rain so drops fall through the glow) ────────────
      const triggers  = context.shared?.getTriggers?.(context.options?.preset as string)
      const bassHit   = triggers?.bassHit   ?? (bass  > 0.45)
      const midsHit   = triggers?.midsHit   ?? (mids  > 0.40)
      const highsHit  = triggers?.highsHit  ?? (highs > 0.38)
      const energy    = triggers?.energy    ?? Math.min(1, env * 1.4)

      // Spawn helper — picks a random palette color and queues a flash
      const spawnFlash = (scaleR: number) => {
        if (this.flashes.length >= MAX_FLASHES) return
        const [r, g, b] = FLASH_PALETTE[Math.floor(Math.random() * FLASH_PALETTE.length)]
        const fx = this.lastBoltX >= 0 && Math.random() < 0.4
          ? this.lastBoltX + (Math.random() - 0.5) * 260
          : w * (0.04 + Math.random() * 0.92)
        this.flashes.push({
          x: fx,
          y: h * (0.02 + Math.random() * 0.32),
          radius: (220 + energy * 420) * scaleR,
          born: now,
          life: 350 + Math.random() * 600,
          r, g, b,
        })
      }

      // Bass — large flashes; 2-3 per hit depending on energy
      if (bassHit && now - this.lastFlashBass > FLASH_COOLDOWN && energy > 0.06) {
        spawnFlash(1.0)
        spawnFlash(0.70)
        if (energy > 0.35) spawnFlash(0.50)
        this.lastFlashBass = now
      }
      // Mids — medium; 1-2 per hit
      if (midsHit && now - this.lastFlashMids > FLASH_COOLDOWN && energy > 0.05) {
        spawnFlash(0.80)
        if (energy > 0.30) spawnFlash(0.55)
        this.lastFlashMids = now
      }
      // Highs — quick bright bursts; 1-2 per hit
      if (highsHit && now - this.lastFlashHighs > FLASH_COOLDOWN && energy > 0.04) {
        spawnFlash(0.60)
        if (energy > 0.25) spawnFlash(0.40)
        this.lastFlashHighs = now
      }

      this.drawFlashes(now)

      // ── Rain drops ─────────────────────────────────────────────────────────
      // Near-zero wind: slightly drifts sinusoidally, essentially straight down
      const wx = Math.sin(now * 0.00022) * h * 0.0018

      this.drawDropLayer(this.farDrops,  LAYERS[0], w, h, now, songIntensity, songSpeed, wx)
      this.drawDropLayer(this.midDrops,  LAYERS[1], w, h, now, songIntensity, songSpeed, wx)
      this.drawDropLayer(this.nearDrops, LAYERS[2], w, h, now, songIntensity, songSpeed, wx)

      // ── Lightning ──────────────────────────────────────────────────────────
      if (bassHit && now - this.lastBoltTime > BOLT_COOLDOWN) {
        if (Math.random() < 0.45 + bass * 0.50) {
          this.spawnLightning(w, h, now)
          // Double-strike on strong hits
          if (energy > 0.55 && Math.random() < 0.5) this.spawnLightning(w, h, now)
          this.lastBoltTime = now
        }
      }
      this.drawLightning(now)
    }

    // ── Sky ───────────────────────────────────────────────────────────────────

    private updateSky(delta: number, intensity: number) {
      if (this.skyProgress < 1) {
        this.skyProgress = Math.min(1, this.skyProgress + delta / this.skyDuration)
        const t = easeInOut(this.skyProgress)
        for (let c = 0; c < 3; c++) {
          this.skyTop[c] = Math.round(lerp(this.skyFrom[0][c], this.skyTo[0][c], t))
          this.skyBot[c] = Math.round(lerp(this.skyFrom[1][c], this.skyTo[1][c], t))
        }
      }
      this.skyTimer += delta
      const interval = this.skyInterval * (1 - intensity * 0.35)
      if (this.skyTimer >= interval) {
        this.skyTimer = 0
        this.triggerSkyEvent()
      }
    }

    private triggerSkyEvent() {
      const idx = Math.floor(Math.random() * SKY_PALETTE.length)
      this.skyFrom = [[...this.skyTop] as Rgb, [...this.skyBot] as Rgb]
      this.skyTo   = [SKY_PALETTE[idx][0], SKY_PALETTE[idx][1]]
      this.skyProgress = 0
      this.skyDuration = 6000 + Math.random() * 10000
    }

    private drawSky(w: number, h: number) {
      const [tr, tg, tb] = this.skyTop
      const [br, bg, bb] = this.skyBot
      const key = `${w}|${h}|${tr},${tg},${tb}|${br},${bg},${bb}`
      if (key !== this.lastGradKey || !this.skyGrad) {
        this.skyGrad = this.ctx.createLinearGradient(0, 0, 0, h)
        this.skyGrad.addColorStop(0, `rgb(${tr},${tg},${tb})`)
        this.skyGrad.addColorStop(1, `rgb(${br},${bg},${bb})`)
        this.lastGradKey = key
      }
      this.ctx.fillStyle = this.skyGrad
      this.ctx.fillRect(0, 0, w, h)
    }

    // ── Sky flashes ───────────────────────────────────────────────────────────

    private drawFlashes(now: number) {
      let write = 0
      for (let i = 0; i < this.flashes.length; i++) {
        const f    = this.flashes[i]
        const age  = now - f.born
        if (age >= f.life) continue
        const prog  = age / f.life
        const alpha = 0.16 * Math.max(0, 1 - prog * prog)
        const { r, g: gb, b } = { r: f.r, g: f.g, b: f.b }
        const grad = this.ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius)
        grad.addColorStop(0,   `rgba(${r},${gb},${b},${alpha})`)
        grad.addColorStop(0.45, `rgba(${r},${gb},${b},${alpha * 0.45})`)
        grad.addColorStop(1,   `rgba(${r},${gb},${b},0)`)
        this.ctx.fillStyle = grad
        this.ctx.beginPath()
        this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
        this.ctx.fill()
        if (write !== i) this.flashes[write] = f
        write++
      }
      this.flashes.length = write
    }

    // ── Rain ──────────────────────────────────────────────────────────────────

    private drawDropLayer(
      drops: RainDrop[],
      layer: typeof LAYERS[number],
      w: number,
      h: number,
      now: number,
      intensity: number,
      speed: number,
      wx: number,
    ) {
      const timeOffset = now * TIME_SCALE * layer.speed * speed
      const lenScale   = 1 + intensity * 0.85
      const [tr, tg, tb] = this.skyTop
      const rR = Math.min(255, tr + 158)
      const rG = Math.min(255, tg + 182)
      const rB = Math.min(255, tb + 215)
      const baseAlpha = layer.alphaMult * (0.28 + intensity * 0.72)

      // Quantity gate: thresh is each drop's random 0-1 activation threshold.
      // At low intensity only low-thresh drops are visible; full intensity = all drops.
      // Range 0.18→1.0 so even at silence a sparse baseline is visible.
      const visThreshold = 0.18 + intensity * 0.82

      // ── Passes 1a + 1b: density variation ────────────────────────────────────
      // Two sub-passes with complementary spatial waves based on each drop's x and
      // phase. Where both waves select the same drop it gets double alpha (denser);
      // where only one selects it, single alpha (normal); where neither, invisible.
      // The wave drifts imperceptibly over minutes — density pockets slowly evolve.
      const driftT = now * 0.000095
      const halfAlpha = baseAlpha * 0.72

      for (let pass = 0; pass < 2; pass++) {
        const passOffset = pass * 0.53   // offset so the two waves don't mirror each other
        this.ctx.beginPath()
        this.ctx.strokeStyle = `rgba(${rR},${rG},${rB},${halfAlpha})`
        this.ctx.lineWidth   = layer.width

        for (const drop of drops) {
          if (drop.thresh > visThreshold) continue
          // 2D spatial wave: uses both x and phase so clusters are scattered, not striped
          const wave = (drop.x * 3.14 + drop.phase * 2.71 + passOffset + driftT) % 1
          if (wave > 0.62) continue   // ~62% selected per pass → overlap gives density variation
          const t = (drop.phase + timeOffset * drop.spd) % 1
          const x = drop.x * w
          const y = t * h
          const len = layer.lenBase * lenScale * drop.len
          this.ctx.moveTo(x,      y)
          this.ctx.lineTo(x + wx, y + len)
        }
        this.ctx.stroke()
      }

      // ── Pass 2: shimmer highlights ──────────────────────────────────────────
      // Each drop cycles on its own ~2.1s period; ~22% bright at any moment.
      this.ctx.beginPath()
      this.ctx.strokeStyle = `rgba(${Math.min(255, rR + 38)},${Math.min(255, rG + 32)},${Math.min(255, rB + 18)},${baseAlpha * 1.55})`
      this.ctx.lineWidth   = layer.width * 0.65

      for (const drop of drops) {
        if (drop.thresh > visThreshold) continue
        if (Math.sin(drop.phase * 17.3 + now * SHIMMER_RATE) < 0.76) continue
        const t = (drop.phase + timeOffset * drop.spd) % 1
        const x = drop.x * w
        const y = t * h
        const len = layer.lenBase * lenScale * drop.len * 0.70
        this.ctx.moveTo(x,      y)
        this.ctx.lineTo(x + wx, y + len)
      }
      this.ctx.stroke()
    }

    // ── Lightning ─────────────────────────────────────────────────────────────

    private spawnLightning(w: number, h: number, now: number) {
      if (this.bolts.length >= MAX_BOLTS) this.bolts.shift()
      const segments: LightningBolt['segments'] = []
      const startX = w * (0.05 + Math.random() * 0.90)
      const endX   = startX + (Math.random() - 0.5) * 380
      const endY   = h * (0.55 + Math.random() * 0.40)
      this.buildBolt(segments, startX, 0, endX, endY, 5)
      this.lastBoltX = startX
      this.bolts.push({
        segments,
        color: LIGHTNING_COLORS[Math.floor(Math.random() * LIGHTNING_COLORS.length)],
        born: now,
        life: 280 + Math.random() * 550,
        x: startX,
      })
    }

    private buildBolt(
      segs: LightningBolt['segments'],
      x1: number, y1: number,
      x2: number, y2: number,
      depth: number,
    ) {
      if (depth <= 0 || Math.hypot(x2 - x1, y2 - y1) < 10) {
        segs.push({ x1, y1, x2, y2 })
        return
      }
      const jitter = 80 * (depth / 5)
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * jitter
      const my = (y1 + y2) / 2
      this.buildBolt(segs, x1, y1, mx, my, depth - 1)
      this.buildBolt(segs, mx, my, x2, y2, depth - 1)
      // More aggressive branching at higher depths
      if (depth > 2 && Math.random() < 0.55) {
        const fx = mx + (Math.random() - 0.5) * 220
        const fy = my + (y2 - y1) * (0.1 + Math.random() * 0.35)
        this.buildBolt(segs, mx, my, fx, fy, depth - 2)
      }
      if (depth > 3 && Math.random() < 0.30) {
        const fx = mx + (Math.random() - 0.5) * 140
        const fy = my + (y2 - y1) * (0.05 + Math.random() * 0.20)
        this.buildBolt(segs, mx, my, fx, fy, depth - 2)
      }
    }

    private drawLightning(now: number) {
      let write = 0
      for (let i = 0; i < this.bolts.length; i++) {
        const bolt = this.bolts[i]
        const age  = now - bolt.born
        if (age >= bolt.life) continue
        const prog  = age / bolt.life
        const alpha = 0.65 * Math.max(0, 1 - prog * prog * prog)
        this.ctx.beginPath()
        this.ctx.strokeStyle = `rgba(${bolt.color},${alpha})`
        this.ctx.lineWidth   = 2.0 * (1 - prog * 0.65)
        for (const s of bolt.segments) {
          this.ctx.moveTo(s.x1, s.y1)
          this.ctx.lineTo(s.x2, s.y2)
        }
        this.ctx.stroke()
        if (write !== i) this.bolts[write] = bolt
        write++
      }
      this.bolts.length = write
    }
  }

  return new Rain()
}

export default rainFactory

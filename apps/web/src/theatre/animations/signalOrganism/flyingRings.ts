import type { TriggerFrame } from '../../VisualTriggers'
import { lerp } from './types'

export type RingMode = 'drift' | 'gather' | 'orbit' | 'scatter'

export type FlyingRing = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  radius: number
  wobble: number
  life: number
  maxLife: number
  mode: RingMode
  gather: number
  sparkle: number
  seed: number
}

const MAX_RINGS = 36

function rand01(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export class FlyingRingField {
  rings: FlyingRing[] = []
  private spawnCd = 0
  private gatherWaveUntil = 0
  private orbitBurstUntil = 0
  private baseSeed = Math.floor(Math.random() * 10000)

  reactToAudio(
    now: number,
    triggers: TriggerFrame,
    cx: number,
    cy: number,
    w: number,
    h: number,
    energy: number,
    hyper: boolean,
  ) {
    if (triggers.beat) {
      this.gatherWaveUntil = now + 520
      this.spawnBurst(cx, cy, w, h, 4 + Math.floor(energy * 6), 'gather', energy)
      for (const r of this.rings) {
        r.mode = 'gather'
        r.gather = Math.max(r.gather, 0.55 + energy * 0.45)
        r.sparkle = 1
      }
    }
    if (triggers.bassHit) {
      this.spawnBurst(cx, cy, w, h, 2 + Math.floor(energy * 3), 'gather', energy * 0.9)
    }
    if (triggers.midsHit) {
      this.orbitBurstUntil = now + 380
      for (const r of this.rings) {
        if (r.mode === 'drift' && rand01(r.seed + now) > 0.4) r.mode = 'orbit'
      }
      this.spawnBurst(cx, cy, w, h, 3, 'orbit', energy * 0.7)
    }
    if (triggers.highsHit) {
      for (const r of this.rings) {
        r.mode = 'scatter'
        const a = rand01(r.seed + 2) * Math.PI * 2
        r.vx += Math.cos(a) * (120 + energy * 180)
        r.vy += Math.sin(a) * (120 + energy * 180)
        r.sparkle = 0.8
      }
      this.spawnBurst(cx, cy, w, h, 2, 'scatter', energy * 0.5)
    }
    if (triggers.chaosHit && energy > 0.5) {
      this.gatherWaveUntil = now + 900
      this.spawnBurst(cx, cy, w, h, 8 + Math.floor(energy * 10), 'gather', energy)
      if (hyper) this.spawnBurst(cx, cy, w, h, 6, 'orbit', energy)
    }
  }

  private spawnBurst(
    cx: number, cy: number, w: number, h: number,
    count: number, mode: RingMode, strength: number,
  ) {
    for (let i = 0; i < count && this.rings.length < MAX_RINGS; i++) {
      this.rings.push(this.makeRing(cx, cy, w, h, mode, strength, this.baseSeed + this.rings.length * 17 + i))
    }
  }

  private makeRing(
    cx: number, cy: number, w: number, h: number,
    mode: RingMode, strength: number, seed: number,
  ): FlyingRing {
    const edge = Math.floor(rand01(seed) * 4)
    let x = cx
    let y = cy
    const pad = 40
    if (edge === 0) { x = rand01(seed + 1) * w; y = -pad }
    else if (edge === 1) { x = w + pad; y = rand01(seed + 2) * h }
    else if (edge === 2) { x = rand01(seed + 3) * w; y = h + pad }
    else { x = -pad; y = rand01(seed + 4) * h }

    const a = Math.atan2(cy - y, cx - x) + (rand01(seed + 5) - 0.5) * 0.8
    const speed = 40 + rand01(seed + 6) * 90 + strength * 120
    return {
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      rot: rand01(seed + 7) * Math.PI * 2,
      spin: (rand01(seed + 8) > 0.5 ? 1 : -1) * (2.2 + strength * 4),
      radius: 10 + rand01(seed + 9) * 8 + strength * 4,
      wobble: rand01(seed + 10) * Math.PI * 2,
      life: 0,
      maxLife: 12000 + rand01(seed + 11) * 8000,
      mode,
      gather: mode === 'gather' ? 0.4 + strength * 0.5 : 0.15,
      sparkle: strength,
      seed,
    }
  }

  update(
    dt: number,
    now: number,
    cx: number,
    cy: number,
    w: number,
    h: number,
    energy: number,
    phaseMix: number,
    bass: number,
    reducedMotion: boolean,
    particleScale: number,
  ) {
    const cap = Math.floor(MAX_RINGS * particleScale * (0.35 + phaseMix * 0.65))
    this.spawnCd -= dt
    if (this.spawnCd <= 0 && this.rings.length < cap) {
      this.spawnCd = 280 + rand01(now * 0.01) * 420
      this.rings.push(this.makeRing(cx, cy, w, h, 'drift', energy * 0.5, now + this.rings.length))
    }

    const globalGather = now < this.gatherWaveUntil
    const globalOrbit = now < this.orbitBurstUntil
    const magnet = (0.35 + bass * 0.9 + energy * 0.5) * phaseMix

    let write = 0
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i]
      r.life += dt
      if (r.life > r.maxLife) continue

      r.rot += r.spin * dt * 0.001
      r.wobble += dt * 0.004

      const dx = cx - r.x
      const dy = cy - r.y
      const dist = Math.hypot(dx, dy) || 1
      const inv = 1 / dist

      let mode = r.mode
      if (globalGather && mode === 'drift') mode = 'gather'
      if (globalOrbit && mode === 'drift') mode = 'orbit'

      if (mode === 'gather') {
        const pull = (r.gather + magnet) * (globalGather ? 1.35 : 1)
        const swirl = Math.sin(r.wobble + now * 0.006) * 0.55
        r.vx += (dx * inv * pull - dy * inv * swirl) * dt * 0.14
        r.vy += (dy * inv * pull + dx * inv * swirl) * dt * 0.14
        r.vx *= 0.985
        r.vy *= 0.985
        if (dist < 42 + r.radius) {
          r.sparkle = 1.2
          r.radius *= 0.88
          if (dist < 28 || r.radius < 4) continue
        }
      } else if (mode === 'orbit') {
        const tangentX = -dy * inv
        const tangentY = dx * inv
        const orbitSpeed = 90 + energy * 140
        r.vx = lerp(r.vx, tangentX * orbitSpeed + dx * inv * 20, 0.06)
        r.vy = lerp(r.vy, tangentY * orbitSpeed + dy * inv * 20, 0.06)
        r.gather = lerp(r.gather, 0.25, 0.02)
      } else if (mode === 'scatter') {
        r.vx *= 0.992
        r.vy *= 0.992
        r.gather = lerp(r.gather, 0.35, 0.015)
        if (r.life > 400) r.mode = 'gather'
      } else {
        r.vx += Math.sin(r.wobble) * 8 * dt * 0.001
        r.vy += Math.cos(r.wobble * 1.3) * 6 * dt * 0.001 - (reducedMotion ? 0 : 12 * dt * 0.001)
        r.vx *= 0.998
        r.vy *= 0.998
        r.gather = lerp(r.gather, 0.12 + bass * 0.2, 0.01)
        r.vx += dx * inv * r.gather * dt * 0.04
        r.vy += dy * inv * r.gather * dt * 0.04
      }

      const s = dt * 0.001
      r.x += r.vx * s
      r.y += r.vy * s

      if (r.x < -80 || r.x > w + 80 || r.y < -80 || r.y > h + 80) continue
      if (write !== i) this.rings[write] = r
      write++
    }
    this.rings.length = write
  }

  draw(ctx: CanvasRenderingContext2D, now: number, allowSparkle: boolean) {
    const step = Math.floor(now / 70)
    for (const r of this.rings) {
      const bob = Math.sin(r.wobble + now * 0.005) * 3
      const pulse = 1 + Math.sin(r.seed + now * 0.008) * 0.08
      const R = r.radius * pulse
      const tilt = r.rot
      const sparkle = allowSparkle && r.sparkle > 0.3

      ctx.save()
      ctx.translate(r.x, r.y + bob)
      ctx.rotate(tilt)

      if (sparkle) {
        ctx.shadowColor = 'rgba(255,220,80,0.85)'
        ctx.shadowBlur = 8 + r.sparkle * 10
      }

      ctx.lineWidth = Math.max(2.5, R * 0.38)
      ctx.lineCap = 'round'
      const gold = step % 2 === 0 ? '#ffe566' : '#ffd028'
      ctx.strokeStyle = gold
      ctx.beginPath()
      ctx.ellipse(0, 0, R * 1.15, R * 0.72, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255,248,200,0.55)'
      ctx.lineWidth = Math.max(1, R * 0.12)
      ctx.beginPath()
      ctx.ellipse(-R * 0.15, -R * 0.2, R * 0.85, R * 0.45, -0.4, 0.5, Math.PI * 1.2)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(200,120,40,0.45)'
      ctx.beginPath()
      ctx.ellipse(R * 0.1, R * 0.15, R * 0.9, R * 0.5, 0.3, Math.PI * 0.1, Math.PI * 1.5)
      ctx.stroke()

      if (sparkle && allowSparkle) {
        ctx.fillStyle = `rgba(255,255,220,${0.25 + r.sparkle * 0.35})`
        for (let k = 0; k < 4; k++) {
          const a = r.rot + k * 1.57 + now * 0.01
          ctx.fillRect(Math.cos(a) * R * 1.3 - 1, Math.sin(a) * R * 0.8 - 1, 2, 2)
        }
      }

      ctx.shadowBlur = 0
      ctx.restore()
      r.sparkle = Math.max(0, r.sparkle - 0.008)
    }
  }
}

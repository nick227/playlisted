import type { TriggerFrame } from '../../audio/VisualTriggers'
import type { EvolveCtx } from './evolution'
import { extremeRoll } from './evolution'
import { rand01 } from './random'
import { lerp } from './types'

export type RingMode = 'drift' | 'gather' | 'orbit' | 'scatter' | 'wild'

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

const MAX_RINGS = 40

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
    evo: EvolveCtx,
    gatherUntil: number,
  ) {
    if (evo.ritual === 'hurricane') {
      this.spawnBurst(cx, cy, w, h, 10 + Math.floor(Math.random() * 8), 'wild', energy)
      this.gatherWaveUntil = Math.max(this.gatherWaveUntil, now + 800)
    }
    if (gatherUntil > now) this.gatherWaveUntil = Math.max(this.gatherWaveUntil, gatherUntil)
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
      if (extremeRoll(evo.wildness, evo.age, 0.75)) {
        this.spawnBurst(cx, cy, w, h, 6 + Math.floor(Math.random() * 8), 'wild', energy)
      }
    }
    if (extremeRoll(evo.wildness, evo.age, 0.9) && energy > 0.35) {
      this.spawnBurst(cx, cy, w, h, 2, rand01(now) > 0.5 ? 'scatter' : 'wild', energy * 0.8)
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
    const speed = 40 + rand01(seed + 6) * 120 + strength * 160
    const spinMul = mode === 'wild' ? 2.8 + rand01(seed + 12) * 2 : 1
    return {
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      rot: rand01(seed + 7) * Math.PI * 2,
      spin: (rand01(seed + 8) > 0.5 ? 1 : -1) * (2.2 + strength * 4) * spinMul,
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
    evo: EvolveCtx,
    gatherUntil: number,
  ) {
    const cap = Math.floor(MAX_RINGS * particleScale * (0.35 + phaseMix * 0.65) * evo.spawnMul)
    this.spawnCd -= dt
    const spawnEvery = (220 + rand01(now * 0.02) * 380) / evo.spawnMul
    if (this.spawnCd <= 0 && this.rings.length < cap) {
      this.spawnCd = spawnEvery
      const mode = extremeRoll(evo.wildness, evo.age, 0.85) ? 'wild' : 'drift'
      this.rings.push(this.makeRing(cx, cy, w, h, mode, energy * (0.4 + evo.wildness * 0.4), now + this.rings.length))
    }
    if (evo.ritual === 'hurricane' && this.rings.length < cap && rand01(now) > 0.92) {
      this.rings.push(this.makeRing(cx, cy, w, h, 'wild', energy, now + this.rings.length * 3))
    }

    const globalGather = now < this.gatherWaveUntil || now < gatherUntil
    const globalOrbit = now < this.orbitBurstUntil
    const magnet = (0.35 + bass * 0.9 + energy * 0.5) * phaseMix * evo.speedMul
    const speedScale = evo.speedMul * (1 + evo.wildness * 0.6)

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

      if (mode === 'wild') {
        const pull = magnet * (0.6 + Math.random() * 0.8)
        const swirl = Math.sin(r.wobble + now * 0.01) * (1.2 + evo.chaosBias)
        r.vx += (dx * inv * pull - dy * inv * swirl) * dt * 0.18 * speedScale
        r.vy += (dy * inv * pull + dx * inv * swirl) * dt * 0.18 * speedScale
        r.vx += evo.chaosBias * 55 * dt * 0.001
        r.vy += Math.sin(now * 0.007 + r.seed) * 40 * dt * 0.001
        r.vx *= 0.982
        r.vy *= 0.982
        if (extremeRoll(evo.wildness, evo.age, 0.7)) r.spin *= 1.02
      } else if (mode === 'gather') {
        const pull = (r.gather + magnet) * (globalGather ? 1.55 : 1) * speedScale
        const swirl = Math.sin(r.wobble + now * 0.006) * (0.55 + evo.wildness)
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
        const orbitSpeed = (90 + energy * 140) * speedScale
        r.vx = lerp(r.vx, tangentX * orbitSpeed + dx * inv * 20, 0.06)
        r.vy = lerp(r.vy, tangentY * orbitSpeed + dy * inv * 20, 0.06)
        r.gather = lerp(r.gather, 0.25, 0.02)
      } else if (mode === 'scatter') {
        r.vx *= 0.992
        r.vy *= 0.992
        r.gather = lerp(r.gather, 0.35, 0.015)
        if (r.life > 400) r.mode = 'gather'
      } else {
        r.vx += Math.sin(r.wobble) * 12 * dt * 0.001 * speedScale
        r.vy += Math.cos(r.wobble * 1.3) * 9 * dt * 0.001 - (reducedMotion ? 0 : 14 * dt * 0.001)
        r.vx += evo.chaosBias * 22 * dt * 0.001
        r.vx *= 0.998
        r.vy *= 0.998
        r.gather = lerp(r.gather, 0.12 + bass * 0.2 + evo.wildness * 0.15, 0.01)
        r.vx += dx * inv * r.gather * dt * 0.04
        r.vy += dy * inv * r.gather * dt * 0.04
      }

      const s = dt * 0.001 * speedScale
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

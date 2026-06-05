const MAX_PARTICLES = 400

type Shock    = { x: number; y: number; t: number; life: number; strength: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; col: string }
type Punch    = { t: number; life: number; strength: number }

export default class EffectsManager {
  private shocks: Shock[] = []
  private particles: Particle[] = []
  private punches: Punch[] = []
  private w = 0
  private h = 0
  private lastNow = 0
  private particleScale = 1
  private lowPower = false
  private heavyAllowed = true

  constructor(w = 0, h = 0) {
    this.w = w
    this.h = h
  }

  setSize(w: number, h: number) {
    this.w = w
    this.h = h
  }

  setPolicy(particleScale = 1, lowPower = false) {
    this.particleScale = Math.max(0, Math.min(1, particleScale))
    this.lowPower = lowPower
    this.heavyAllowed = this.particleScale > 0 && !this.lowPower
    const max = this.maxParticles()
    if (this.particles.length > max) this.particles.length = max
  }

  private maxParticles() {
    if (!this.heavyAllowed) return 0
    return this.lowPower ? Math.min(80, MAX_PARTICLES) : MAX_PARTICLES
  }

  triggerShockwave(x: number, y: number, strength = 1) {
    if (!this.heavyAllowed) return
    if (this.shocks.length > 2) return
    this.shocks.push({ x, y, t: 0, life: 640, strength: strength * Math.max(0.35, this.particleScale) })
  }

  triggerParticleBurst(x: number, y: number, count = 24, strength = 1, col = '255,255,255') {
    if (!this.heavyAllowed || this.particleScale <= 0) return
    const max = this.maxParticles()
    if (this.particles.length >= max) return
    const add = Math.min(Math.floor(count * this.particleScale), max - this.particles.length)
    if (add <= 0) return
    const scaledStrength = strength * Math.max(0.25, this.particleScale)
    for (let i = 0; i < add; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (0.6 + Math.random() * 1.6) * 200 * scaledStrength
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 600 + Math.random() * 400,
        size: 1 + Math.random() * 3,
        col: `rgba(${col},`,
      })
    }
  }

  triggerRainSurge(count = 60, strength = 1, col = '200,220,255') {
    if (!this.heavyAllowed || this.particleScale <= 0) return
    const max = this.maxParticles()
    if (this.particles.length >= max) return
    const scale = this.lowPower ? this.particleScale * 0.5 : this.particleScale
    const add = Math.min(Math.floor(count * scale), max - this.particles.length)
    if (add <= 0) return
    const scaledStrength = strength * Math.max(0.25, scale)
    for (let i = 0; i < add; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * -this.h * 0.6,
        vx: (Math.random() - 0.5) * 40,
        vy: 200 + Math.random() * 400 * scaledStrength,
        life: 0,
        maxLife: 800 + Math.random() * 600,
        size: 1 + Math.random() * 2,
        col: `rgba(${col},`,
      })
    }
  }

  triggerScreenPunch(strength = 1) {
    if (!this.heavyAllowed) return
    if (this.punches.length > 1) return
    this.punches.push({ t: 0, life: 220, strength: strength * Math.max(0.35, this.particleScale) })
  }

  getShake() {
    if (!this.heavyAllowed) return 0
    let s = 0
    for (const p of this.punches) {
      s = Math.max(s, p.strength * Math.max(0, 1 - p.t / p.life))
    }
    return s
  }

  update(ctx: CanvasRenderingContext2D, _now: number, _dpr = 1) {
    const dt = this.lastNow ? Math.min(_now - this.lastNow, 50) : 16
    this.lastNow = _now

    let write = 0
    for (let i = 0; i < this.shocks.length; i++) {
      const shock = this.shocks[i]
      shock.t += dt
      if (shock.t < shock.life) {
        if (write !== i) this.shocks[write] = shock
        write++
      }
    }
    this.shocks.length = write

    write = 0
    for (let i = 0; i < this.punches.length; i++) {
      const punch = this.punches[i]
      punch.t += dt
      if (punch.t < punch.life) {
        if (write !== i) this.punches[write] = punch
        write++
      }
    }
    this.punches.length = write

    const drag = Math.pow(0.995, dt / 16)
    write = 0
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      p.life += dt
      if (p.life >= p.maxLife) continue
      const s = dt * 0.001
      p.x += p.vx * s
      p.y += p.vy * s
      p.vx *= drag
      p.vy *= drag
      if (write !== i) this.particles[write] = p
      write++
    }
    this.particles.length = write

    if (!this.heavyAllowed) return

    for (const s of this.shocks) {
      const prog = Math.min(1, s.t / s.life)
      const maxR = Math.hypot(this.w, this.h) * 0.9
      const r = prog * maxR * (0.4 + s.strength * 0.9)
      const alpha = Math.max(0, 0.6 * (1 - prog))
      const g = ctx.createRadialGradient(s.x, s.y, r * 0.02, s.x, s.y, r)
      g.addColorStop(0, `rgba(255,240,200,${alpha * 0.2})`)
      g.addColorStop(1, 'rgba(20,20,30,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife)
      ctx.fillStyle = p.col + `${alpha})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    let punchAlpha = 0
    for (const p of this.punches) {
      punchAlpha = Math.max(punchAlpha, p.strength * (1 - Math.min(1, p.t / p.life)) * 0.5)
    }
    if (punchAlpha > 0) {
      ctx.fillStyle = `rgba(255,240,220,${punchAlpha})`
      ctx.fillRect(0, 0, this.w, this.h)
    }
  }
}

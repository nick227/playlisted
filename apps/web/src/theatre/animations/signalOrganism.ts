import { AnimationContext, IAnimation } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'
import { frameHold, stepped } from '../stopMotion'
import { OrganismStateMachine } from './signalOrganism/state'
import {
  buildCells, layoutCells, updateCells, drawVeins, drawCells,
  drawTendrils, triggerDivision, strongestCell, cellCenter,
} from './signalOrganism/cells'
import { drawRings, drawEchoRings, pushEchoRing } from './signalOrganism/rings'
import { FlyingRingField } from './signalOrganism/flyingRings'
import type { EchoRing } from './signalOrganism/types'
import { clamp } from './signalOrganism/types'

export function signalOrganismFactory(): IAnimation {
  class SignalOrganism extends CanvasAnimation {
    private machine = new OrganismStateMachine()
    private cells = buildCells(800, 600)
    private echoes: EchoRing[] = []
    private flyingRings = new FlyingRingField()
    private lastGlowKey = ''
    private glowGrad: CanvasGradient | null = null
    private lastW = 0
    private lastH = 0

    constructor() {
      super({ defaultOpacity: 0.98, defaultZIndex: 101, defaultBlendMode: 'normal', useEffects: true })
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w !== this.lastW || h !== this.lastH) {
        layoutCells(this.cells, w, h)
        this.lastW = w
        this.lastH = h
      }

      const { bass: rawBass, mids: rawMids, highs: rawHighs } = this.readBands(context)
      const features = context.shared?.features
      const sensitivity = context.options?.sensitivity ?? 1
      const intensity = context.options?.intensity ?? 1
      const bass = rawBass * sensitivity * intensity
      const mids = rawMids * sensitivity * intensity * 0.85
      const highs = rawHighs * sensitivity * intensity * 0.65
      const env = features?.env || features?.rms || 0
      const now = context.shared?.time?.elapsed ?? performance.now()
      const dt = context.shared?.time?.delta ?? 16
      const reducedMotion = context.shared?.reducedMotion ?? false

      const triggers = context.shared?.getTriggers?.('vivid') ?? {
        bassHit: false, midsHit: false, highsHit: false, beat: false, chaosHit: false,
        energy: clamp(env * 1.4, 0, 1), brightness: features?.centroid ?? 0.5,
      }
      const energy = clamp(triggers.energy, 0, 1)

      this.machine.update(now, triggers, energy, env, reducedMotion)
      const phaseMix = this.machine.phaseMix()
      const metabolic = now < this.machine.metabolicUntil
      const synapse = now < this.machine.synapseUntil
      const hyper = this.machine.isHyper(now)

      if (triggers.beat) {
        triggerDivision(this.cells)
        pushEchoRing(this.echoes, triggers.energy)
      }
      if (triggers.chaosHit && triggers.energy > 0.55) {
        const hot = strongestCell(this.cells)
        hot.heat = 1
      }

      updateCells(this.cells, bass, mids, phaseMix * (hyper ? 1.25 : 1), metabolic, triggers.chaosHit, now)

      this.ctx.fillStyle = '#040608'
      this.ctx.fillRect(0, 0, w, h)

      const cx = w * 0.5
      const cy = h * 0.46

      if (!reducedMotion) {
        this.flyingRings.reactToAudio(now, triggers, cx, cy, w, h, energy, hyper)
      }
      const minSide = Math.min(w, h)
      const time = now / 1000
      const pScale = this.particleScale(context)

      if (!reducedMotion) {
        this.flyingRings.update(dt, now, cx, cy, w, h, energy, phaseMix, bass, reducedMotion, pScale)
      }

      drawVeins(this.ctx, this.cells, this.machine.veinPulse, mids, phaseMix)
      drawCells(this.ctx, this.cells, mids, bass, phaseMix)

      if (this.effects) {
        if (triggers.midsHit) {
          const sc = strongestCell(this.cells)
          const p = cellCenter(sc)
          this.effects.triggerParticleBurst(p.x, p.y, Math.floor(8 + energy * 20), energy, '120,220,160')
        }
        if (triggers.chaosHit && energy > 0.55) {
          this.effects.triggerShockwave(w * 0.85, h * 0.18, energy * 1.1)
          this.effects.triggerShockwave(cx, cy, energy * 0.9)
        }
        if (triggers.beat) this.effects.triggerScreenPunch(Math.min(0.75, energy * 0.85))
        if (triggers.highsHit) {
          this.effects.triggerParticleBurst(cx + minSide * 0.2, cy, Math.floor(6 + energy * 18), energy, '200,220,255')
        }
        if (now < this.machine.wakeFlashUntil) {
          this.effects.triggerShockwave(cx, cy, 0.6)
        }
      }

      drawTendrils(this.ctx, this.cells, cx, cy, synapse, mids, phaseMix)

      if (!reducedMotion && pScale > 0) {
        this.ctx.globalCompositeOperation = 'lighter'
        this.flyingRings.draw(this.ctx, now, this.allowsHeavyParticles(context))
        this.ctx.globalCompositeOperation = 'source-over'
      }

      this.ctx.globalCompositeOperation = 'lighter'
      drawRings(
        this.ctx, cx, cy, minSide, bass, mids, highs, time,
        phaseMix * (hyper ? 1.15 : 1), this.machine.ringShatterUntil, now, triggers.beat,
      )
      drawEchoRings(this.ctx, cx, cy, minSide, this.echoes, dt)
      this.ctx.globalCompositeOperation = 'source-over'

      this.drawGear(now, w, h, bass, mids, highs, phaseMix, metabolic)

      const pulseFactor = 1 + Math.max(bass, env) * (3.2 + phaseMix * 0.8)
      const pulseTime = frameHold(now, 100)
      const pulse = 1 + stepped(Math.sin(pulseTime / 900) * 0.5 + 0.5, 4) * (0.14 + phaseMix * 0.08)
      const baseR = minSide * 0.13
      const r = baseR * pulseFactor * pulse

      const shakeAllowed = this.allowsShake(context)
      const shake = shakeAllowed && this.effects ? this.effects.getShake() : 0
      if (shake > 0) {
        this.ctx.save()
        this.ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 8 * shake)
      }

      const warmth = Math.min(50, bass * 100 + (1 - triggers.brightness) * 20)
      const glowKey = `${cx}|${cy}|${r.toFixed(1)}|${warmth.toFixed(0)}`
      if (glowKey !== this.lastGlowKey || !this.glowGrad) {
        this.glowGrad = this.ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r)
        this.glowGrad.addColorStop(0, `rgba(${210 + warmth},${175 - warmth * 0.3},110,${0.42 + bass * 0.75})`)
        this.glowGrad.addColorStop(0.45, `rgba(${90 + warmth * 0.5},120,${200 - warmth * 0.5},${0.2 + bass * 0.5})`)
        this.glowGrad.addColorStop(1, 'rgba(12,14,24,0)')
        this.lastGlowKey = glowKey
      }
      this.ctx.beginPath()
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2)
      this.ctx.fillStyle = this.glowGrad
      this.ctx.fill()

      if (this.allowsHeavyParticles(context)) {
        const count = Math.floor((20 + phaseMix * 18) * pScale)
        if (count > 0) {
          const phaseA = now / 2200
          const phaseB = now / 180
          const orbitA = Math.min(0.9, 0.1 + bass + highs * 0.5)
          this.ctx.fillStyle = `rgba(200,225,255,${orbitA})`
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + phaseA
            const pr = r + 14 + Math.sin(phaseB + i) * 12 + (bass + mids * 0.6) * 280 * phaseMix
            const px = cx + Math.cos(a) * pr
            const py = cy + Math.sin(a) * pr
            const size = 2 + bass * 14 + highs * 8
            this.ctx.beginPath()
            this.ctx.arc(px, py, size, 0, Math.PI * 2)
            this.ctx.fill()
          }
        }
      }

      if (shake > 0) this.ctx.restore()
      this.effects?.update(this.ctx, now, this.pixelRatio)
    }

    private drawGear(
      now: number, w: number, h: number,
      bass: number, mids: number, highs: number,
      phaseMix: number, metabolic: boolean,
    ) {
      const gearCx = w * 0.88
      const gearCy = h * 0.16
      const stepTime = frameHold(now, 120)
      const gearPhase = stepped(Math.sin(stepTime / 700) * 0.5 + 0.5, 5)
      const gearR = 28 + (bass * 180 + mids * 70) * phaseMix
      const ringAlpha = clamp(0.15 + highs * 0.9, 0.1, 0.85)
      const skip = metabolic ? Math.floor(gearPhase * 3) * 2 : 0

      this.ctx.save()
      this.ctx.translate(gearCx, gearCy)
      this.ctx.rotate(now / 600 * (mids * 2.5 + 0.35) + gearPhase * 0.45)
      this.ctx.strokeStyle = `rgba(200,185,155,${ringAlpha})`
      this.ctx.lineWidth = 1.4 + bass * 3
      for (let g = 0; g < 6; g++) {
        this.ctx.beginPath()
        this.ctx.arc(0, 0, gearR + g * 8 + skip, 0, Math.PI * 2)
        this.ctx.stroke()
        this.ctx.rotate(Math.PI / 6)
      }
      this.ctx.restore()
    }
  }

  return new SignalOrganism()
}

export default signalOrganismFactory

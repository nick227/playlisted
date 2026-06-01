import { AnimationContext, IAnimation } from '../IAnimation'
import CanvasAnimation from '../CanvasAnimation'
import { ScriptRunner } from '../stopMotionScript'
import flowerScript from '../scripts/stopMotionFlowerStorm.script'

const flowerPoses = [
  { petalSpread: 0.18, petalLift: 0.1,  centerScale: 0.85 },
  { petalSpread: 0.22, petalLift: 0.14, centerScale: 0.95 },
  { petalSpread: 0.28, petalLift: 0.18, centerScale: 1.05 },
  { petalSpread: 0.34, petalLift: 0.24, centerScale: 1.08 },
  { petalSpread: 0.40, petalLift: 0.28, centerScale: 1.1  },
  { petalSpread: 0.46, petalLift: 0.34, centerScale: 1.03 },
  { petalSpread: 0.38, petalLift: 0.22, centerScale: 0.98 },
  { petalSpread: 0.30, petalLift: 0.16, centerScale: 0.92 },
]

const stemBends = [-0.12, -0.08, -0.04, 0, 0.05, 0.12, 0.08, 0.03]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function randomSeed(x: number) {
  const s = Math.sin(x) * 10000
  return s - Math.floor(s)
}

export function stopMotionFlowerStormFactory(): IAnimation {
  class FlowerStorm extends CanvasAnimation {
    private runner = new ScriptRunner(flowerScript)
    private skyShift = 0
    private effectsSeed = Math.floor(Math.random() * 10000)

    constructor() {
      super({ defaultOpacity: 0.98, defaultZIndex: 102, defaultBlendMode: 'normal', useEffects: true })
    }

    restartStory() {
      this.runner.restart()
    }

    setScriptOverrides(overrides: Partial<Pick<import('../stopMotionScript').Script, 'poseHoldMs' | 'stemHoldMs'>>) {
      this.runner.setOverrides(overrides)
    }

    getDebugState() {
      return {
        script: 'stopMotionFlowerStorm',
        runner: this.runner.getState(),
      }
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      const now = context.shared?.time?.elapsed ?? performance.now()
      const reducedMotion = context.shared?.reducedMotion || false
      const features = context.shared?.features
      const triggers = context.shared?.getTriggers?.('chaos') || {
        bassHit: false, midsHit: false, highsHit: false,
        beat: false, chaosHit: false, energy: 0, brightness: 0.5,
      }
      const bands = this.readBands(context)
      const bass   = clamp(bands.bass, 0, 1)
      const mids   = clamp(bands.mids, 0, 1)
      const highs  = clamp(bands.highs, 0, 1)
      const env    = clamp(features?.env || features?.rms || 0, 0, 1)
      const heavyParticles = this.allowsHeavyParticles(context)
      const pScale = this.particleScale(context)
      const energy = clamp(triggers.energy || env * 1.2, 0, 1)
      const chaos  = triggers.chaosHit && energy > 0.65

      const run = this.runner.update(now, features, triggers, reducedMotion)
      const pose       = flowerPoses[run.poseIndex % flowerPoses.length]
      const bloomLevel = run.progress
      // stormPulse is specific to the stormStrain state — computed here, not in the generic runner
      const stormPulse = run.state === 'stormStrain' ? Math.abs(Math.sin(now / 120)) : 0
      const cloudDark  = clamp((highs * 0.4 + mids * 0.2 + energy * 0.6) * 0.8 + bloomLevel * 0.15, 0, 1)
      this.skyShift    = lerp(this.skyShift, stormPulse * 0.6, reducedMotion ? 0.05 : 0.18)

      // background sky
      const skyTop    = `rgba(${28 + stormPulse * 30}, ${34 + cloudDark * 70}, ${58 + cloudDark * 90}, 1)`
      const skyBottom = `rgba(${38 + stormPulse * 22}, ${52 + cloudDark * 68}, ${82 + cloudDark * 95}, 1)`
      const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, skyTop)
      skyGrad.addColorStop(1, skyBottom)
      this.ctx.fillStyle = skyGrad
      this.ctx.fillRect(0, 0, w, h)

      // cloud wash
      const cloudAlpha = 0.2 + cloudDark * 0.4
      this.ctx.fillStyle = `rgba(200,210,235,${cloudAlpha})`
      for (let i = 0; i < 5; i++) {
        const x = (i * 0.26 + (now / 9000) * (i % 2 ? -1 : 1)) * w
        const y = h * 0.16 + (i % 2) * 20
        this.drawCloud(x % w, y, w * 0.36, h * 0.16, 0.28)
      }

      // horizon band
      this.ctx.fillStyle = `rgba(20, 30, 40, ${0.26 + cloudDark * 0.24})`
      this.ctx.fillRect(0, h * 0.64, w, h * 0.18)

      // stem + leaves
      const stemBaseX = w * 0.52
      const stemBaseY = h * 0.64
      const stemTopY  = h * 0.38
      const stemCurve = (stemBends[run.stemIndex % stemBends.length] ?? 0) * (1 + mids * 0.8)
      this.ctx.save()
      this.ctx.strokeStyle = '#cad4fb'
      this.ctx.lineWidth = 20
      this.ctx.lineCap = 'round'
      this.ctx.beginPath()
      this.ctx.moveTo(stemBaseX, stemBaseY)
      this.ctx.bezierCurveTo(
        stemBaseX + stemCurve * w * 0.4,  stemBaseY - h * 0.22,
        stemBaseX - stemCurve * w * 0.22, stemTopY  + h * 0.08,
        stemBaseX, stemTopY,
      )
      this.ctx.stroke()
      this.ctx.restore()

      const leafCount = reducedMotion ? 2 : 3
      for (let i = 0; i < leafCount; i++) {
        const y = stemBaseY - (i + 1) * h * 0.14
        const direction = i % 2 === 0 ? 1 : -1
        this.drawLeaf(stemBaseX + direction * w * 0.04, y, direction * 0.16, mids * 0.9)
      }

      // flower center + petals
      const centerX    = stemBaseX
      const centerY    = stemTopY - h * 0.04
      const radius     = h * 0.13 * (0.8 + bloomLevel * 0.4)
      const petalCount = 8
      const petalSpread = pose.petalSpread + bloomLevel * 0.14
      const petalLift   = pose.petalLift   + env * 0.12
      const petalScale  = pose.centerScale * (0.9 + bloomLevel * 0.18)
      const jitter = reducedMotion ? 0 : (
        Math.sin(now / 370 + run.poseIndex) * 0.03 +
        Math.sin(now / 570 + run.poseIndex * 1.4) * 0.03
      )

      for (let i = 0; i < petalCount; i++) {
        const progress = i / petalCount
        const angle = progress * Math.PI * 2 + (run.state === 'stormStrain' ? stormPulse * 0.35 : 0)
        const spread = petalSpread + Math.sin(i * 1.7 + now / 800) * 0.01
        const px = centerX + Math.cos(angle) * radius * spread
        const py = centerY + Math.sin(angle) * radius * spread * (1 - petalLift * 0.2)
        this.ctx.save()
        this.ctx.translate(px, py)
        this.ctx.rotate(angle + jitter)
        this.ctx.scale(1 + petalLift * 0.2, 1 - petalLift * 0.16)
        this.ctx.fillStyle = `rgba(${240 - i * 4}, ${140 + i * 8}, ${220 - i * 6}, ${0.92 - bloomLevel * 0.15})`
        this.ctx.beginPath()
        this.ctx.ellipse(0, -radius * 0.26, radius * 0.24, radius * 0.52, 0, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.restore()
      }

      // center disk
      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, radius * petalScale, 0, Math.PI * 2)
      const centerGrad = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * petalScale)
      centerGrad.addColorStop(0, '#ffeb9e')
      centerGrad.addColorStop(1, '#b45a93')
      this.ctx.fillStyle = centerGrad
      this.ctx.fill()
      this.ctx.restore()

      // falling petal debris
      const debrisCount = heavyParticles
        ? Math.floor((reducedMotion ? 12 : 24) * pScale)
        : Math.floor(reducedMotion ? 4 : 8)
      for (let i = 0; i < debrisCount; i++) {
        const seedValue = randomSeed(run.noiseSeed + i * 17 + this.effectsSeed)
        const x = (seedValue * 1.4 % 1) * w
        const y = ((seedValue * 3.2 + now / 950) % 1) * h
        const alpha = 0.08 + highs * 0.32 + (run.state === 'collapse' ? 0.2 : 0)
        this.ctx.fillStyle = `rgba(255, ${190 + seedValue * 40}, ${210 + seedValue * 25}, ${alpha})`
        this.ctx.beginPath()
        this.ctx.ellipse(x, y, 3 + seedValue * 4, 1.5 + seedValue * 1.8, seedValue * Math.PI, 0, Math.PI * 2)
        this.ctx.fill()
      }

      // rain layer
      const rainScale = context.shared?.lowPower ? Math.min(0.35, pScale) : pScale
      const rainAmount = Math.floor((reducedMotion ? highs * 12 : highs * 28 + mids * 14) * rainScale)
      for (let i = 0; i < rainAmount; i++) {
        const offset = i * 19 + Math.floor(run.noiseSeed * 7)
        const rx = ((offset * 37) % 100) / 100 * w
        const ry = ((offset * 53 + now / 5) % h)
        this.ctx.strokeStyle = `rgba(210, 230, 255, ${0.08 + highs * 0.32})`
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        this.ctx.moveTo(rx, ry)
        this.ctx.lineTo(rx + 3, ry + 16 + highs * 12)
        this.ctx.stroke()
      }

      // state accents: lightning during storm/collapse
      if ((run.state === 'stormStrain' || run.state === 'collapse') && heavyParticles) {
        if (!reducedMotion && !context.shared?.lowPower && Math.random() < 0.05) {
          const lx = centerX + (Math.random() - 0.5) * w * 0.5
          const ly = h * 0.1 + Math.random() * h * 0.2
          this.drawLightning(lx, ly, 1 + Math.random() * 0.8, 1.2)
        }
      }

      // micro-effects triggers
      const punchStrength = run.state === 'stormStrain' ? energy * 0.7
        : run.state === 'collapse' ? 0.9
        : energy * 0.2
      if (this.effects) {
        if (chaos && !reducedMotion && heavyParticles) {
          this.effects.triggerRainSurge(18 + Math.floor(highs * 36), 0.9, '220,245,255')
          this.effects.triggerShockwave(centerX, centerY, 0.7 + (chaos ? 0.6 : 0))
          this.effects.triggerScreenPunch(punchStrength)
        }
        if (triggers.beat && run.state === 'fullBloom' && heavyParticles) {
          this.effects.triggerParticleBurst(centerX, centerY, 10 + Math.floor(bass * 18), 0.8, '255,240,220')
        }
        this.effects.update(this.ctx, now, this.pixelRatio)
      }
    }

    private drawCloud(x: number, y: number, width: number, height: number, alpha: number) {
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.globalAlpha = alpha
      this.ctx.fillStyle = '#e8edff'
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, width * 0.4, height * 0.36, 0, 0, Math.PI * 2)
      this.ctx.ellipse(width * 0.22, -height * 0.04, width * 0.38, height * 0.28, 0, 0, Math.PI * 2)
      this.ctx.ellipse(width * 0.48,  height * 0.02, width * 0.32, height * 0.2,  0, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    }

    private drawLeaf(x: number, y: number, direction: number, sway: number) {
      this.ctx.save()
      this.ctx.translate(x, y)
      this.ctx.rotate(direction * (0.3 + sway * 0.3))
      this.ctx.fillStyle = '#96c59a'
      this.ctx.beginPath()
      this.ctx.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    }

    private drawLightning(x: number, y: number, length: number, alpha: number) {
      const segments = 5
      let cx = x, cy = y
      this.ctx.strokeStyle = `rgba(255,255,240,${alpha})`
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.moveTo(cx, cy)
      for (let i = 0; i < segments; i++) {
        cx += (Math.random() - 0.5) * 18
        cy += length * 30 + Math.random() * 18
        this.ctx.lineTo(cx, cy)
      }
      this.ctx.stroke()
    }
  }

  return new FlowerStorm()
}

export default stopMotionFlowerStormFactory

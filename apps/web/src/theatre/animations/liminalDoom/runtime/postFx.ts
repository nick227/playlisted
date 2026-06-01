import type { AudioReact, RoomPhase } from '../core/types'
import { clamp, lerp } from '../core/math'
import { voidBloomPalette } from '../core/palette'

type Ctx = CanvasRenderingContext2D

// ── Individual effect helpers (stateless) ─────────────────────────────────────

/** Fast, cheap screen flash — fills the entire canvas at low opacity. */
function applyFlash(ctx: Ctx, w: number, h: number, color: string, alpha: number) {
  if (alpha <= 0.005) return
  ctx.save()
  ctx.globalAlpha = clamp(alpha, 0, 1)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

/** Radial bloom from a center point — screen-blended warm glow. */
function applyRadialBloom(ctx: Ctx, w: number, h: number, level: number, color: string) {
  if (level <= 0.01) return
  const cx = w * 0.5
  const cy = h * 0.5
  const r = Math.max(w, h) * (0.4 + level * 0.4)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, color.replace(')', `,${(0.18 + level * 0.3).toFixed(2)})`).replace('rgba(', 'rgba(').replace('rgb(', 'rgba('))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.globalAlpha = clamp(level * 0.85, 0, 1)
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

/** Vignette darkening toward edges. */
function applyVignette(ctx: Ctx, w: number, h: number, strength: number) {
  if (strength <= 0.01) return
  const cx = w * 0.5
  const cy = h * 0.5
  const r = Math.max(w, h) * 0.8
  const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${(clamp(strength, 0, 1) * 0.75).toFixed(2)})`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// ── VoidBloom collapse sequence ───────────────────────────────────────────────
// t: 0→1 across the voidBloom phase duration

function applyVoidBloomFrame(ctx: Ctx, w: number, h: number, t: number) {
  // Act 1 (0–0.35): white flash + radial overdraw
  if (t < 0.35) {
    const sub = t / 0.35
    applyFlash(ctx, w, h, voidBloomPalette.flash, easeOut(sub) * 0.75)
    applyRadialBloom(ctx, w, h, sub * 0.6, 'rgb(180,100,220)')
    return
  }

  // Act 2 (0.35–0.7): smear scan lines, color drift
  if (t < 0.7) {
    const sub = (t - 0.35) / 0.35
    applyFlash(ctx, w, h, voidBloomPalette.smear, sub * 0.5)
    // Horizontal smear bands
    ctx.save()
    ctx.globalAlpha = sub * 0.4
    const bandH = h / 12
    for (let i = 0; i < 12; i++) {
      const odd = i % 2
      ctx.fillStyle = odd ? 'rgba(200,80,200,0.3)' : 'rgba(20,200,180,0.2)'
      ctx.fillRect(0, i * bandH + Math.sin(sub * Math.PI + i) * 3, w, bandH + 1)
    }
    ctx.restore()
    applyVignette(ctx, w, h, sub * 0.6)
    return
  }

  // Act 3 (0.7–1.0): collapse to black, brief invert flash on edge
  const sub = (t - 0.7) / 0.3
  if (sub < 0.15) {
    applyFlash(ctx, w, h, voidBloomPalette.invert, (1 - sub / 0.15) * 0.35)
  }
  applyFlash(ctx, w, h, voidBloomPalette.collapse, easeIn(sub) * 0.95)
}

function easeIn(t: number): number { return t * t * t }
function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3) }

// ── PostFx controller ─────────────────────────────────────────────────────────

export class PostFxController {
  private shakeX = 0
  private shakeY = 0
  private bloomLevel = 0
  private punchAlpha = 0
  private punchColor = 'rgba(255,240,200,1)'
  private vignetteLevel = 0.35

  /** Call once per frame before draw — updates decay state. */
  tick(audio: AudioReact, phase: RoomPhase, reducedMotion: boolean, dtMs: number) {
    // Bloom builds from bass/beat, decays
    const targetBloom = audio.bass * 0.6 + (audio.beat > 0.5 ? 0.4 : 0) + audio.chaos * 0.3
    this.bloomLevel = lerp(this.bloomLevel, targetBloom, 0.08)

    // Vignette tightens during inhabited/threshold
    const targetVig = phase === 'inhabited' || phase === 'threshold' ? 0.55 : 0.3
    this.vignetteLevel = lerp(this.vignetteLevel, targetVig, 0.04)

    // Shake decay
    if (!reducedMotion) {
      const decay = Math.pow(0.82, dtMs / 16)
      this.shakeX *= decay
      this.shakeY *= decay
    } else {
      this.shakeX = 0
      this.shakeY = 0
    }

    // Punch alpha fade
    this.punchAlpha = Math.max(0, this.punchAlpha - dtMs / 140)
  }

  /** Trigger a beat-driven screen punch flash. */
  triggerBeatPunch(bassLevel: number) {
    this.punchAlpha = clamp(bassLevel * 0.45, 0, 0.45)
    this.punchColor = 'rgba(220,180,80,1)'
  }

  /** Trigger a chaos-hit shake. Larger = more shake. */
  triggerShake(amount: number) {
    const a = clamp(amount, 0, 1)
    this.shakeX = (Math.random() - 0.5) * a * 18
    this.shakeY = (Math.random() - 0.5) * a * 10
  }

  /** Returns shake offset to apply as ctx.translate before drawing. */
  getShakeOffset(): { x: number; y: number } {
    return { x: this.shakeX, y: this.shakeY }
  }

  /** Apply post-render overlay effects. Call AFTER the scene renderer. */
  applyOverlays(ctx: Ctx, w: number, h: number, reducedMotion: boolean) {
    // Beat punch flash
    if (this.punchAlpha > 0.01) {
      applyFlash(ctx, w, h, this.punchColor, this.punchAlpha)
    }

    // Ambient bloom
    if (!reducedMotion && this.bloomLevel > 0.05) {
      applyRadialBloom(ctx, w, h, this.bloomLevel, 'rgb(160,80,60)')
    }

    // Vignette always on
    applyVignette(ctx, w, h, this.vignetteLevel)
  }

  /** Apply the voidBloom collapse sequence on top of the scene. t: 0→1. */
  applyVoidBloom(ctx: Ctx, w: number, h: number, t: number) {
    applyVoidBloomFrame(ctx, w, h, t)
  }

  /** Scene-ambient tint overlay — warm wash for band stage, cool for bar, etc. */
  applySceneAmbient(ctx: Ctx, w: number, h: number, color: string, intensity: number) {
    if (intensity <= 0.01) return
    ctx.save()
    ctx.globalAlpha = clamp(intensity * 0.22, 0, 0.22)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}

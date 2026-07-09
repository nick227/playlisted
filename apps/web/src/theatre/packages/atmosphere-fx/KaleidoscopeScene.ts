import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, fxAmountOr, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

export const KALEIDOSCOPE_SIZE_TUNING = 80; // 0-100 tuning constant

/**
 * Infinite procedural Kaleidoscope effect wired to audio notes and moods.
 */
export class AtmosphereKaleidoscopeScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private lastT = 0;
  private phaseX = Math.random() * 1000;
  private phaseY = Math.random() * 1000;
  
  private currentSegments = 8;
  private holdSec = 0;

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.08, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastT > 0 ? Math.min(0.05, Math.max(0.008, t - this.lastT)) : 1 / 60;
    this.lastT = t;

    const pal = this.palette.tick(delta, punch);
    const tone = moodTone(pal.mood, hi);
    
    // Snap structure on big hits or over time
    this.holdSec += delta;
    if (this.holdSec > 4 || triggers.chaosHit || (punch > 0.8 && this.holdSec > 1)) {
        this.holdSec = 0;
        // 6, 8, 10, 12, 14, or 16 segments based on energy
        this.currentSegments = 6 + Math.floor(Math.random() * 3 + hi * 3) * 2;
    }

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;

    this.ctx.clearRect(0, 0, w, h);
    
    // Ambient background wash
    const wash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    wash.addColorStop(0, hsla(pal.a, tone.s, tone.l - 15, (0.05 + e * 0.1) * g));
    wash.addColorStop(1, "hsla(0,0%,0%,1)");
    this.ctx.fillStyle = wash;
    this.ctx.fillRect(0, 0, w, h);
    
    this.ctx.globalCompositeOperation = "lighter";
    
    const effectScale = Math.max(0, Math.min(100, fxAmountOr(context, KALEIDOSCOPE_SIZE_TUNING))) / 100;
    const angleStep = (Math.PI * 2) / this.currentSegments;
    
    // Base radius scales with bass, punch and the tuning constant
    const baseRadius = Math.min(w, h) * 0.45 * (0.6 + b * 0.5 + punch * 0.2) * effectScale;
    
    this.ctx.setTransform(1, 0, 0, 1, cx, cy);
    this.ctx.rotate(t * 0.05 + b * 0.1); // Slow global rotation + bass kick
    
    // Draw multiple fractal-like layers
    const layers = 5;
    for (let l = 0; l < layers; l++) {
        const layerRadius = baseRadius * (1 - l * 0.15) * (1 + hi * 0.15 * (l % 2 === 0 ? 1 : -1));
        const thickness = 1.5 + e * 6 + punch * (4 - l);
        
        const rHue = pal.accent + l * 55 + t * 20;
        const lum = (0.15 + punch * 0.4 + hi * 0.3 + b * 0.2) * g;
        this.ctx.strokeStyle = hsla(rHue, tone.s + 20, tone.l + (l * 3), lum);
        this.ctx.lineWidth = Math.max(0.5, thickness);
        
        for (let s = 0; s < this.currentSegments; s++) {
            this.ctx.save();
            this.ctx.rotate(s * angleStep);
            
            // Mirror every other segment for perfect kaleidoscope reflection
            if (s % 2 !== 0) {
                this.ctx.scale(1, -1);
            }
            
            this.ctx.beginPath();
            
            // Robust infinite procedural generator using Bezier curves
            const startX = layerRadius * 0.1 * Math.cos(t + this.phaseX);
            const startY = layerRadius * 0.1 * Math.sin(t + this.phaseY);
            this.ctx.moveTo(startX, startY);
            
            const ctrl1x = layerRadius * 0.4 * Math.sin(t * (0.7 + l * 0.1) + this.phaseX + b * 2);
            const ctrl1y = layerRadius * 0.6 * Math.cos(t * (0.5 + l * 0.15) + m * 3);
            
            const ctrl2x = layerRadius * 0.8 * Math.cos(t * (0.6 + l * 0.1) + this.phaseY + hi * 2);
            const ctrl2y = layerRadius * 0.9 * Math.sin(t * (0.8 + l * 0.2) + punch * 2);
            
            const endX = layerRadius * Math.cos(t * 0.3 + this.phaseX * (l + 1));
            const endY = layerRadius * Math.sin(t * 0.4 + this.phaseY * (l + 1));
            
            this.ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, endX, endY);
            
            // Intricate secondary webbing when mids/highs are active
            if (m > 0.15 || hi > 0.2) {
               const cx3 = layerRadius * 0.7 * Math.sin(t * 1.3 + l + punch);
               const cy3 = layerRadius * 0.5 * Math.cos(t * 1.5 + l + punch);
               this.ctx.quadraticCurveTo(cx3, cy3, startX, startY);
            }
            
            this.ctx.stroke();
            
            // Outer glowing nodes
            if (hi > 0.25 || punch > 0.4) {
                const nx = layerRadius * Math.cos(Math.PI * 0.5 + t * 2 + this.phaseX);
                const ny = layerRadius * Math.sin(Math.PI * 0.5 + t * 2 + this.phaseY) * 0.6;
                this.ctx.fillStyle = hsla(pal.b + l * 30, 100, 75, lum * 1.2);
                this.ctx.beginPath();
                this.ctx.arc(nx, ny, 1 + hi * 3 + punch * 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
    }
    
    // Central dynamic glowing core
    if (e > 0.05) {
        const coreRad = baseRadius * 0.15 * (1 + punch * 1.5 + b);
        const coreGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreRad);
        coreGrad.addColorStop(0, hsla(pal.c, 100, 85, (0.4 + punch * 0.6) * g));
        coreGrad.addColorStop(1, "hsla(0,0%,0%,0)");
        this.ctx.fillStyle = coreGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, coreRad, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    // Reset transform for next frame
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
  }
}

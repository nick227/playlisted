import type { DrawFractalInput } from "./radialTypes";
import { strokeColor, strokeW } from "./radialTypes";

/** Rhodonea / rose curves — classic infinite petal math. */
export function drawRoseCurve(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const k = 2 + Math.floor(recipe.branches * 0.7) + (recipe.depth % 2);
  const petals = Math.floor(48 + recipe.density * 60);
  const rad = maxR * recipe.scale * (0.75 + bass * 0.35 + (beat ? 0.1 : 0));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= petals; i++) {
    const a = (i / petals) * Math.PI * 2 * (k % 2 === 0 ? 1 : 0.5) + recipe.twist + t * 0.25 * recipe.spin;
    const r = rad * Math.cos(k * a) * (0.85 + mid * 0.25 + Math.sin(t + a) * 0.05);
    const x = cx + Math.cos(a) * Math.abs(r);
    const y = cy + Math.sin(a) * Math.abs(r);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = strokeColor(recipe, t * 22, high, (0.32 + env * 0.25 + punch * 0.12) * g);
  ctx.lineWidth = strokeW(recipe, 3, high * 2 + punch);
  ctx.stroke();

  // Inner echo
  ctx.beginPath();
  for (let i = 0; i <= petals; i++) {
    const a = (i / petals) * Math.PI * 2 * (k % 2 === 0 ? 1 : 0.5) + recipe.twist + Math.PI / k + t * 0.2;
    const r = rad * 0.55 * Math.cos(k * a + mid);
    const x = cx + Math.cos(a) * Math.abs(r);
    const y = cy + Math.sin(a) * Math.abs(r);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = strokeColor(recipe, 80 + t * 18, high, (0.22 + env * 0.2) * g);
  ctx.lineWidth = strokeW(recipe, 2, high);
  ctx.stroke();
}

/** Lissajous figure-8 / knot trails. */
export function drawLissajous(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const a = 2 + (recipe.branches % 4);
  const b = 3 + (recipe.depth % 3);
  const steps = Math.floor(60 + recipe.density * 80);
  const amp = maxR * recipe.scale * (0.7 + bass * 0.3 + (beat ? 0.08 : 0));
  const phase = recipe.twist + t * 0.4 * recipe.spin + mid;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * Math.PI * 2;
    const x = cx + Math.sin(a * u + phase) * amp;
    const y = cy + Math.sin(b * u) * amp * (0.75 + high * 0.2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = strokeColor(recipe, t * 28, high, (0.3 + env * 0.28 + punch * 0.1) * g);
  ctx.lineWidth = strokeW(recipe, 3.2, high * 2 + punch);
  ctx.stroke();
}

/** Logarithmic vortex arms. */
export function drawVortex(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const arms = Math.max(2, Math.min(8, recipe.branches));
  const steps = Math.floor(28 + recipe.density * 36);
  ctx.lineCap = "round";
  for (let arm = 0; arm < arms; arm++) {
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const u = i / (steps - 1);
      const a = recipe.twist + (arm / arms) * Math.PI * 2 + u * (2.8 + mid) + t * 0.35 * recipe.spin;
      const rad = maxR * recipe.scale * u * (0.85 + bass * 0.3 + (beat ? 0.08 : 0));
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = strokeColor(recipe, arm * 35 + t * 20, high, (0.3 + env * 0.25 + punch * 0.1) * g);
    ctx.lineWidth = strokeW(recipe, 2.5 + (1 - arm / arms) * 2, high * 2);
    ctx.stroke();
  }
}

/** Interlocking star lattice. */
export function drawStarLattice(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const points = 5 + (recipe.branches % 4);
  const rings = Math.max(2, Math.min(5, recipe.depth));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let r = 1; r <= rings; r++) {
    const u = r / rings;
    const outer = maxR * recipe.scale * u * (0.7 + bass * 0.35 + (beat ? 0.08 : 0));
    const inner = outer * (0.35 + recipe.soft * 0.25 + mid * 0.15);
    const rot = recipe.twist + t * 0.2 * recipe.spin * (r % 2 === 0 ? 1 : -1) + r * 0.2;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i / (points * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? outer : inner;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeColor(recipe, r * 40 + t * 15, high, (0.3 + env * 0.22 + punch * 0.1) * g);
    ctx.lineWidth = strokeW(recipe, 2.8, high * 2);
    ctx.stroke();
  }
}

/** Radial burst rays from center. */
export function drawBurstRays(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const rays = Math.floor(8 + recipe.density * 16 + recipe.branches);
  const len = maxR * recipe.scale * (0.75 + bass * 0.4 + (beat ? 0.12 : 0));
  ctx.lineCap = "round";
  for (let i = 0; i < rays; i++) {
    const a = recipe.twist + (i / rays) * Math.PI * 2 + t * 0.15 * recipe.spin + Math.sin(t + i) * mid * 0.15;
    const wobble = 0.7 + (i % 3) * 0.15 + high * 0.2;
    ctx.strokeStyle = strokeColor(recipe, i * 18 + t * 25, high, (0.28 + env * 0.25 + punch * 0.12) * g);
    ctx.lineWidth = strokeW(recipe, 2 + (i % 4 === 0 ? 2.5 : 0), high * 2 + punch);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * len * 0.08, cy + Math.sin(a) * len * 0.08);
    ctx.lineTo(cx + Math.cos(a) * len * wobble, cy + Math.sin(a) * len * wobble);
    ctx.stroke();
  }
}

/** Cross-weave grid warped into a circle. */
export function drawWeave(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const lines = Math.floor(5 + recipe.density * 7);
  const rad = maxR * recipe.scale * (0.7 + bass * 0.3 + (beat ? 0.08 : 0));
  const warp = 0.15 + mid * 0.35 + recipe.soft * 0.2;
  ctx.lineCap = "round";
  for (let axis = 0; axis < 2; axis++) {
    for (let i = 0; i < lines; i++) {
      const u = (i + 0.5) / lines;
      const offset = (u - 0.5) * 2 * rad;
      ctx.beginPath();
      const steps = 24;
      for (let s = 0; s <= steps; s++) {
        const v = (s / steps) * 2 - 1;
        let x: number;
        let y: number;
        if (axis === 0) {
          x = cx + offset + Math.sin(v * Math.PI + t * recipe.spin + i) * rad * warp;
          y = cy + v * rad;
        } else {
          x = cx + v * rad;
          y = cy + offset + Math.cos(v * Math.PI + t * recipe.spin + i) * rad * warp;
        }
        // Soft circular mask
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > rad * rad) continue;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = strokeColor(recipe, axis * 60 + i * 12 + t * 20, high, (0.26 + env * 0.22 + punch * 0.1) * g);
      ctx.lineWidth = strokeW(recipe, 2.4, high * 1.5);
      ctx.stroke();
    }
  }
}

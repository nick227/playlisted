import type { DrawFractalInput } from "./radialTypes";
import { strokeColor, strokeW } from "./radialTypes";

/** Julia-like orbit trails. */
export function drawJuliaOrbit(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const orbits = Math.floor(5 + recipe.density * 12);
  const steps = Math.floor(24 + recipe.depth * 14);
  const cxJ = -0.4 + Math.sin(t * 0.15 * recipe.spin + recipe.twist) * 0.25 + mid * 0.15;
  const cyJ = 0.55 + Math.cos(t * 0.11 * recipe.spin) * 0.2 + bass * 0.12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let o = 0; o < orbits; o++) {
    let zx = Math.cos((o / orbits) * Math.PI * 2 + recipe.twist) * (0.2 + high * 0.3);
    let zy = Math.sin((o / orbits) * Math.PI * 2 + recipe.twist) * (0.2 + mid * 0.25);
    ctx.beginPath();
    let started = false;
    for (let s = 0; s < steps; s++) {
      const zx2 = zx * zx - zy * zy + cxJ;
      const zy2 = 2 * zx * zy + cyJ;
      zx = zx2;
      zy = zy2;
      if (zx * zx + zy * zy > 4) break;
      const x = cx + zx * maxR * recipe.scale * (0.85 + env * 0.3 + (beat ? 0.08 : 0));
      const y = cy + zy * maxR * recipe.scale * (0.85 + punch * 0.15);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    if (!started) continue;
    ctx.strokeStyle = strokeColor(recipe, o * 12 + t * 20, high, (0.28 + env * 0.28 + punch * 0.15) * g);
    ctx.lineWidth = strokeW(recipe, 2.5, high * 2 + punch);
    ctx.stroke();
  }
}

export function drawSpiralTree(input: DrawFractalInput, depth: number, x: number, y: number, ang: number, len: number) {
  const { ctx, recipe, g, t, bass, mid, high, env, beat } = input;
  if (depth <= 0 || len < 6) return;
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  ctx.strokeStyle = strokeColor(recipe, depth * 28 + t * 15, high, (0.32 + env * 0.22) * g);
  ctx.lineWidth = strokeW(recipe, 1.5 + depth * 1.4, bass * 2);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const spread = 0.35 + mid * 0.5 + recipe.soft * 0.35;
  const shrink = 0.62 + high * 0.08;
  const kick = beat ? 0.12 : 0;
  drawSpiralTree(input, depth - 1, x2, y2, ang - spread + Math.sin(t + depth) * 0.08, len * shrink);
  drawSpiralTree(input, depth - 1, x2, y2, ang + spread + Math.cos(t * 1.2) * 0.08, len * shrink);
  if (depth > 2 && recipe.branches > 5) {
    drawSpiralTree(input, depth - 2, x2, y2, ang + kick, len * shrink * 0.85);
  }
}

export function drawIfsDust(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const n = Math.floor(100 + recipe.density * 200);
  let x = 0;
  let y = 0;
  let px = cx;
  let py = cy;
  const transforms = recipe.branches;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const pick = Math.floor((i * 17 + (t * 3) | 0) % transforms);
    const a = recipe.twist + pick * ((Math.PI * 2) / transforms) + t * 0.05 * recipe.spin;
    const s = 0.4 + mid * 0.12 + (pick % 3) * 0.06;
    const nx = s * (x * Math.cos(a) - y * Math.sin(a)) + Math.cos(a * 2 + t * 0.2) * 0.35;
    const ny = s * (x * Math.sin(a) + y * Math.cos(a)) + Math.sin(a * 2 + t * 0.2) * 0.35 + bass * 0.05;
    x = nx;
    y = ny;
    if (i < 20) {
      px = cx + x * maxR * recipe.scale;
      py = cy + y * maxR * recipe.scale;
      continue;
    }
    const qx = cx + x * maxR * recipe.scale * (0.9 + env * 0.25 + (beat ? 0.1 : 0));
    const qy = cy + y * maxR * recipe.scale * (0.9 + punch * 0.15);
    if (i % 3 === 0) {
      ctx.strokeStyle = strokeColor(recipe, pick * 40 + high * 50, high, (0.24 + env * 0.2) * g);
      ctx.lineWidth = strokeW(recipe, 2.2, high * 1.5);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(qx, qy);
      ctx.stroke();
    }
    px = qx;
    py = qy;
  }
}

export function drawMandalaNest(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const rings = Math.max(2, recipe.depth);
  for (let r = 1; r <= rings; r++) {
    const u = r / rings;
    const rad = maxR * recipe.scale * u * (0.75 + bass * 0.35 + (beat ? 0.08 : 0));
    const petals = recipe.branches + r;
    ctx.beginPath();
    for (let i = 0; i <= petals * 3; i++) {
      const a = (i / (petals * 3)) * Math.PI * 2 + recipe.twist + t * (0.2 + mid * 0.5) * recipe.spin;
      const wobble = 1 + Math.sin(a * petals + t * 2) * (0.1 + high * 0.12) * (1 - u * 0.35);
      const x = cx + Math.cos(a) * rad * wobble;
      const y = cy + Math.sin(a) * rad * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeColor(recipe, r * 32 + t * 18, high, (0.3 + env * 0.25 + punch * 0.12) * g);
    ctx.lineWidth = strokeW(recipe, 2.5 + (1 - u) * 3, high * 2);
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

export function drawPhyllotaxis(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const n = Math.floor(40 + recipe.density * 100);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const a = i * golden + recipe.twist + t * (0.15 + mid * 0.4) * recipe.spin;
    const rad = Math.sqrt(i / n) * maxR * recipe.scale * (0.8 + bass * 0.35 + (beat ? 0.1 : 0));
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    const size = strokeW(recipe, 2.5 + (1 - i / n) * 3, high * 2 + punch);
    ctx.fillStyle = strokeColor(recipe, i * 4 + t * 25, high, (0.28 + env * 0.22) * g);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function kochEdge(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  depth: number, hueOff: number, input: DrawFractalInput,
) {
  const { recipe, g, high } = input;
  if (depth <= 0) {
    ctx.strokeStyle = strokeColor(recipe, hueOff, high, 0.38 * g);
    ctx.lineWidth = Math.max(2.5, 3 * recipe.weight + high);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const xA = x1 + dx / 3;
  const yA = y1 + dy / 3;
  const xB = x1 + (dx * 2) / 3;
  const yB = y1 + (dy * 2) / 3;
  const peak = 0.22 + recipe.soft * 0.18;
  const xM = (x1 + x2) / 2 - dy * peak;
  const yM = (y1 + y2) / 2 + dx * peak;
  kochEdge(ctx, x1, y1, xA, yA, depth - 1, hueOff, input);
  kochEdge(ctx, xA, yA, xM, yM, depth - 1, hueOff + 12, input);
  kochEdge(ctx, xM, yM, xB, yB, depth - 1, hueOff + 24, input);
  kochEdge(ctx, xB, yB, x2, y2, depth - 1, hueOff + 36, input);
}

export function drawKochBurst(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, t, bass, mid, env, beat } = input;
  const arms = recipe.branches;
  const rad = maxR * recipe.scale * (0.7 + bass * 0.4 + (beat ? 0.1 : 0));
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + recipe.twist + t * (0.1 + mid * 0.3) * recipe.spin;
    kochEdge(
      ctx, cx, cy,
      cx + Math.cos(a) * rad,
      cy + Math.sin(a) * rad,
      Math.min(3, recipe.depth),
      i * 20 + t * 10,
      { ...input, g: input.g * (0.85 + env * 0.4) },
    );
  }
}

export function drawApollonian(
  input: DrawFractalInput,
  x: number, y: number, rad: number, depth: number,
) {
  const { ctx, recipe, g, t, high, env, punch } = input;
  if (depth <= 0 || rad < 8) return;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.strokeStyle = strokeColor(recipe, depth * 40 + t * 20, high, (0.28 + env * 0.2 + punch * 0.1) * g);
  ctx.lineWidth = strokeW(recipe, 2.5, high * 2);
  ctx.stroke();
  const child = rad * (0.4 + recipe.soft * 0.12);
  const orbit = rad - child;
  const kids = Math.min(recipe.branches, 6);
  for (let i = 0; i < kids; i++) {
    const a = (i / kids) * Math.PI * 2 + recipe.twist + t * 0.2 * recipe.spin;
    drawApollonian(input, x + Math.cos(a) * orbit, y + Math.sin(a) * orbit, child, depth - 1);
  }
}

export function drawFlowField(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const strands = Math.floor(6 + recipe.density * 14);
  const steps = Math.floor(18 + recipe.depth * 10);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let s = 0; s < strands; s++) {
    const a0 = (s / strands) * Math.PI * 2 + recipe.twist;
    let x = cx + Math.cos(a0) * maxR * 0.05;
    let y = cy + Math.sin(a0) * maxR * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < steps; i++) {
      const dx = x - cx;
      const dy = y - cy;
      const ang =
        Math.atan2(dy, dx)
        + Math.sin(dx * 0.01 + t * recipe.spin) * (0.4 + mid)
        + Math.cos(dy * 0.01 - t) * (0.3 + high * 0.5);
      const step = maxR * recipe.scale * (0.025 + bass * 0.012 + (beat ? 0.006 : 0));
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = strokeColor(recipe, s * 14 + t * 30, high, (0.28 + env * 0.25 + punch * 0.12) * g);
    ctx.lineWidth = strokeW(recipe, 2.8, high * 2.5 + punch);
    ctx.stroke();
  }
}

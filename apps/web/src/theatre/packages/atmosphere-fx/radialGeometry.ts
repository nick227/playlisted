/** Fractal pattern generators for Atmosphere Multi-Shape (Radial). */

export type FractalKind =
  | "juliaOrbit"
  | "spiralTree"
  | "ifsDust"
  | "mandalaNest"
  | "phyllotaxis"
  | "kochBurst"
  | "apollonian"
  | "flowField";

export type FractalRecipe = {
  kind: FractalKind;
  depth: number;
  branches: number;
  twist: number;
  scale: number;
  density: number;
  hueSeed: number;
  soft: number;
};

export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pickFractalRecipe(rng: Rng): FractalRecipe {
  const kinds: FractalKind[] = [
    "juliaOrbit", "spiralTree", "ifsDust", "mandalaNest",
    "phyllotaxis", "kochBurst", "apollonian", "flowField",
  ];
  return {
    kind: kinds[Math.floor(rng() * kinds.length)]!,
    depth: 3 + Math.floor(rng() * 4),
    branches: 3 + Math.floor(rng() * 6),
    twist: rng() * Math.PI * 2,
    scale: 0.55 + rng() * 0.55,
    density: 0.5 + rng() * 1.2,
    hueSeed: rng() * 360,
    soft: rng(),
  };
}

export type FxMode = "none" | "wash" | "pop" | "scramble";

export function pickFxMode(rng: Rng): FxMode {
  const roll = rng();
  if (roll < 0.4) return "none";
  if (roll < 0.62) return "wash";
  if (roll < 0.82) return "pop";
  return "scramble";
}

export type DrawFractalInput = {
  ctx: CanvasRenderingContext2D;
  recipe: FractalRecipe;
  cx: number;
  cy: number;
  /** Max radius that should fill when sizePct=100 (half diagonal). */
  maxR: number;
  g: number;
  t: number;
  bass: number;
  mid: number;
  high: number;
  env: number;
  punch: number;
  beat: boolean;
  morph: number;
};

function hsla(h: number, s: number, l: number, a: number) {
  return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
}

/** Julia-like orbit trails — beautiful infinite-feeling curves. */
function drawJuliaOrbit(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const orbits = Math.floor(18 + recipe.density * 28);
  const steps = Math.floor(40 + recipe.depth * 18);
  const cxJ = -0.4 + Math.sin(t * 0.15 + recipe.twist) * 0.25 + mid * 0.15;
  const cyJ = 0.55 + Math.cos(t * 0.11) * 0.2 + bass * 0.12;
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
    ctx.strokeStyle = hsla(recipe.hueSeed + o * 7 + t * 20, 75, 55 + high * 20, (0.12 + env * 0.2 + punch * 0.1) * g);
    ctx.lineWidth = 1 + high * 1.5;
    ctx.stroke();
  }
}

/** Recursive spiral tree — organic fractal branching. */
function drawSpiralTree(input: DrawFractalInput, depth: number, x: number, y: number, ang: number, len: number) {
  const { ctx, recipe, g, t, bass, mid, high, env, punch, beat } = input;
  if (depth <= 0 || len < 2) return;
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  ctx.strokeStyle = hsla(recipe.hueSeed + depth * 28 + t * 15, 70, 40 + depth * 25, (0.14 + env * 0.18) * g);
  ctx.lineWidth = Math.max(0.6, depth * 0.7 + bass);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const spread = 0.35 + mid * 0.5 + recipe.soft * 0.3;
  const shrink = 0.62 + high * 0.08;
  const kick = beat ? 0.12 : 0;
  drawSpiralTree(input, depth - 1, x2, y2, ang - spread + Math.sin(t + depth) * 0.1, len * shrink);
  drawSpiralTree(input, depth - 1, x2, y2, ang + spread + Math.cos(t * 1.2) * 0.1, len * shrink);
  if (depth > 2 && recipe.branches > 4) {
    drawSpiralTree(input, depth - 2, x2, y2, ang + kick, len * shrink * 0.85);
  }
}

/** IFS dust — infinite attractor points (chaos game). */
function drawIfsDust(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const n = Math.floor(900 + recipe.density * 1400);
  let x = 0;
  let y = 0;
  const transforms = recipe.branches;
  for (let i = 0; i < n; i++) {
    const pick = Math.floor((i * 17 + (t * 3) | 0) % transforms);
    const a = recipe.twist + pick * ((Math.PI * 2) / transforms);
    const s = 0.42 + mid * 0.1 + (pick % 3) * 0.05;
    const nx = s * (x * Math.cos(a) - y * Math.sin(a)) + Math.cos(a * 2 + t * 0.2) * 0.35;
    const ny = s * (x * Math.sin(a) + y * Math.cos(a)) + Math.sin(a * 2 + t * 0.2) * 0.35 + bass * 0.05;
    x = nx;
    y = ny;
    if (i < 40) continue;
    const px = cx + x * maxR * recipe.scale * (0.9 + env * 0.25 + (beat ? 0.1 : 0));
    const py = cy + y * maxR * recipe.scale * (0.9 + punch * 0.15);
    ctx.fillStyle = hsla(recipe.hueSeed + pick * 40 + high * 60, 80, 55 + high * 25, (0.08 + env * 0.12) * g);
    ctx.fillRect(px, py, 1.2 + high, 1.2 + high);
  }
}

/** Nested mandala rings with fractal subdivision. */
function drawMandalaNest(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const rings = recipe.depth + 2;
  for (let r = 1; r <= rings; r++) {
    const u = r / rings;
    const rad = maxR * recipe.scale * u * (0.75 + bass * 0.35 + (beat ? 0.08 : 0));
    const petals = recipe.branches + r * 2;
    ctx.beginPath();
    for (let i = 0; i <= petals * 4; i++) {
      const a = (i / (petals * 4)) * Math.PI * 2 + recipe.twist + t * (0.2 + mid * 0.5);
      const wobble = 1 + Math.sin(a * petals + t * 2) * (0.08 + high * 0.12) * (1 - u * 0.4);
      const x = cx + Math.cos(a) * rad * wobble;
      const y = cy + Math.sin(a) * rad * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = hsla(recipe.hueSeed + r * 32 + t * 18, 75, 50 + mid * 20, (0.14 + env * 0.2 + punch * 0.08) * g);
    ctx.lineWidth = 1 + (1 - u) * 2 + high;
    ctx.stroke();
  }
}

/** Phyllotaxis spiral — sunflower / galaxy fractal packing. */
function drawPhyllotaxis(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const n = Math.floor(180 + recipe.density * 320);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const a = i * golden + recipe.twist + t * (0.15 + mid * 0.4);
    const rad = Math.sqrt(i / n) * maxR * recipe.scale * (0.8 + bass * 0.35 + (beat ? 0.1 : 0));
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    const size = (1.2 + high * 2 + (1 - i / n) * 2) * (0.8 + punch * 0.3);
    ctx.fillStyle = hsla(recipe.hueSeed + i * 2.5 + t * 25, 80, 50 + high * 25, (0.1 + env * 0.15) * g);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Koch-like burst from center. */
function kochEdge(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  depth: number, hue: number, g: number, high: number,
) {
  if (depth <= 0) {
    ctx.strokeStyle = hsla(hue, 75, 55 + high * 20, 0.2 * g);
    ctx.lineWidth = 1;
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
  const xM = (x1 + x2) / 2 - dy * 0.28;
  const yM = (y1 + y2) / 2 + dx * 0.28;
  kochEdge(ctx, x1, y1, xA, yA, depth - 1, hue, g, high);
  kochEdge(ctx, xA, yA, xM, yM, depth - 1, hue + 12, g, high);
  kochEdge(ctx, xM, yM, xB, yB, depth - 1, hue + 24, g, high);
  kochEdge(ctx, xB, yB, x2, y2, depth - 1, hue + 36, g, high);
}

function drawKochBurst(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, beat } = input;
  const arms = recipe.branches;
  const rad = maxR * recipe.scale * (0.7 + bass * 0.4 + (beat ? 0.1 : 0));
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + recipe.twist + t * (0.1 + mid * 0.3);
    const x2 = cx + Math.cos(a) * rad;
    const y2 = cy + Math.sin(a) * rad;
    kochEdge(ctx, cx, cy, x2, y2, Math.min(4, recipe.depth), recipe.hueSeed + i * 20 + t * 10, g * (0.7 + env), high);
  }
}

/** Apollonian-ish circle packing recursion. */
function drawApollonian(
  input: DrawFractalInput,
  x: number, y: number, rad: number, depth: number,
) {
  const { ctx, recipe, g, t, mid, high, env, punch } = input;
  if (depth <= 0 || rad < 2) return;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.strokeStyle = hsla(recipe.hueSeed + depth * 40 + t * 20, 70, 45 + mid * 20, (0.12 + env * 0.15 + punch * 0.08) * g);
  ctx.lineWidth = 1 + high;
  ctx.stroke();
  const child = rad * (0.42 + recipe.soft * 0.1);
  const orbit = rad - child;
  for (let i = 0; i < recipe.branches; i++) {
    const a = (i / recipe.branches) * Math.PI * 2 + recipe.twist + t * 0.2;
    drawApollonian(input, x + Math.cos(a) * orbit, y + Math.sin(a) * orbit, child, depth - 1);
  }
}

/** Flow-field filaments — soft infinite noise streams. */
function drawFlowField(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const strands = Math.floor(24 + recipe.density * 40);
  const steps = Math.floor(28 + recipe.depth * 10);
  for (let s = 0; s < strands; s++) {
    const a0 = (s / strands) * Math.PI * 2 + recipe.twist;
    let x = cx + Math.cos(a0) * maxR * 0.05;
    let y = cy + Math.sin(a0) * maxR * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < steps; i++) {
      const dx = x - cx;
      const dy = y - cy;
      const ang = Math.atan2(dy, dx) + Math.sin(dx * 0.01 + t) * (0.4 + mid) + Math.cos(dy * 0.01 - t) * (0.3 + high * 0.5);
      const step = maxR * recipe.scale * (0.02 + bass * 0.01 + (beat ? 0.005 : 0));
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hsla(recipe.hueSeed + s * 9 + t * 30, 75, 50 + high * 20, (0.1 + env * 0.18 + punch * 0.1) * g);
    ctx.lineWidth = 1 + high * 1.5;
    ctx.stroke();
  }
}

export function drawFractalPattern(input: DrawFractalInput) {
  const { recipe, cx, cy, maxR } = input;
  switch (recipe.kind) {
    case "juliaOrbit":
      drawJuliaOrbit(input);
      break;
    case "spiralTree":
      drawSpiralTree(input, recipe.depth + 1, cx, cy, -Math.PI / 2 + recipe.twist, maxR * recipe.scale * 0.35);
      drawSpiralTree(input, recipe.depth, cx, cy, Math.PI / 2 + recipe.twist, maxR * recipe.scale * 0.28);
      break;
    case "ifsDust":
      drawIfsDust(input);
      break;
    case "mandalaNest":
      drawMandalaNest(input);
      break;
    case "phyllotaxis":
      drawPhyllotaxis(input);
      break;
    case "kochBurst":
      drawKochBurst(input);
      break;
    case "apollonian":
      drawApollonian(input, cx, cy, maxR * recipe.scale * 0.55, recipe.depth);
      break;
    case "flowField":
    default:
      drawFlowField(input);
      break;
  }
}

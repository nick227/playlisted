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
  /** Line weight multiplier — thicker = more distinct. */
  weight: number;
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
    depth: 2 + Math.floor(rng() * 3),
    branches: 3 + Math.floor(rng() * 4),
    twist: rng() * Math.PI * 2,
    scale: 0.6 + rng() * 0.5,
    density: 0.35 + rng() * 0.55,
    hueSeed: rng() * 360,
    soft: rng(),
    // Mix of bold strokes and occasional heavy beams
    weight: rng() < 0.35 ? 2.4 + rng() * 2.2 : 1.2 + rng() * 1.1,
  };
}

export type FxMode = "none" | "wash" | "pop" | "scramble";

export function pickFxMode(rng: Rng): FxMode {
  const roll = rng();
  if (roll < 0.35) return "none";
  if (roll < 0.58) return "wash";
  if (roll < 0.8) return "pop";
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

function strokeW(recipe: FractalRecipe, base: number, audio = 0) {
  return Math.max(2, (base + audio) * recipe.weight);
}

/** Julia-like orbit trails — fewer, thicker curves. */
function drawJuliaOrbit(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const orbits = Math.floor(6 + recipe.density * 10);
  const steps = Math.floor(28 + recipe.depth * 12);
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
    ctx.strokeStyle = hsla(recipe.hueSeed + o * 12 + t * 20, 80, 58 + high * 18, (0.28 + env * 0.28 + punch * 0.15) * g);
    ctx.lineWidth = strokeW(recipe, 2.5, high * 2 + punch);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

/** Recursive spiral tree — bold branches, shallow depth. */
function drawSpiralTree(input: DrawFractalInput, depth: number, x: number, y: number, ang: number, len: number) {
  const { ctx, recipe, g, t, bass, mid, high, env, beat } = input;
  if (depth <= 0 || len < 6) return;
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  ctx.strokeStyle = hsla(recipe.hueSeed + depth * 28 + t * 15, 75, 48 + mid * 22, (0.32 + env * 0.22) * g);
  ctx.lineWidth = strokeW(recipe, 1.5 + depth * 1.4, bass * 2);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const spread = 0.4 + mid * 0.45 + recipe.soft * 0.25;
  const shrink = 0.64 + high * 0.06;
  const kick = beat ? 0.12 : 0;
  drawSpiralTree(input, depth - 1, x2, y2, ang - spread + Math.sin(t + depth) * 0.08, len * shrink);
  drawSpiralTree(input, depth - 1, x2, y2, ang + spread + Math.cos(t * 1.2) * 0.08, len * shrink);
  if (depth > 2 && recipe.branches > 5) {
    drawSpiralTree(input, depth - 2, x2, y2, ang + kick, len * shrink * 0.85);
  }
}

/** IFS attractor — short thick segments instead of dust. */
function drawIfsDust(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const n = Math.floor(120 + recipe.density * 180);
  let x = 0;
  let y = 0;
  let px = cx;
  let py = cy;
  const transforms = recipe.branches;
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const pick = Math.floor((i * 17 + (t * 3) | 0) % transforms);
    const a = recipe.twist + pick * ((Math.PI * 2) / transforms);
    const s = 0.42 + mid * 0.1 + (pick % 3) * 0.05;
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
      ctx.strokeStyle = hsla(recipe.hueSeed + pick * 40 + high * 50, 85, 58 + high * 18, (0.22 + env * 0.2) * g);
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

/** Nested mandala rings — few bold rings. */
function drawMandalaNest(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const rings = Math.max(2, recipe.depth);
  for (let r = 1; r <= rings; r++) {
    const u = r / rings;
    const rad = maxR * recipe.scale * u * (0.75 + bass * 0.35 + (beat ? 0.08 : 0));
    const petals = recipe.branches + r;
    ctx.beginPath();
    for (let i = 0; i <= petals * 3; i++) {
      const a = (i / (petals * 3)) * Math.PI * 2 + recipe.twist + t * (0.2 + mid * 0.5);
      const wobble = 1 + Math.sin(a * petals + t * 2) * (0.1 + high * 0.12) * (1 - u * 0.35);
      const x = cx + Math.cos(a) * rad * wobble;
      const y = cy + Math.sin(a) * rad * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = hsla(recipe.hueSeed + r * 32 + t * 18, 80, 55 + mid * 18, (0.3 + env * 0.25 + punch * 0.12) * g);
    ctx.lineWidth = strokeW(recipe, 2.5 + (1 - u) * 3, high * 2);
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

/** Phyllotaxis — larger nodes, fewer points. */
function drawPhyllotaxis(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const n = Math.floor(50 + recipe.density * 90);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const a = i * golden + recipe.twist + t * (0.15 + mid * 0.4);
    const rad = Math.sqrt(i / n) * maxR * recipe.scale * (0.8 + bass * 0.35 + (beat ? 0.1 : 0));
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    const size = strokeW(recipe, 2.5 + (1 - i / n) * 3, high * 2 + punch);
    ctx.fillStyle = hsla(recipe.hueSeed + i * 4 + t * 25, 85, 55 + high * 20, (0.28 + env * 0.22) * g);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Koch-like burst — thick segments, shallow recursion. */
function kochEdge(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  depth: number, hue: number, g: number, high: number, weight: number,
) {
  if (depth <= 0) {
    ctx.strokeStyle = hsla(hue, 80, 58 + high * 18, 0.38 * g);
    ctx.lineWidth = Math.max(2.5, 3 * weight + high);
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
  const xM = (x1 + x2) / 2 - dy * 0.28;
  const yM = (y1 + y2) / 2 + dx * 0.28;
  kochEdge(ctx, x1, y1, xA, yA, depth - 1, hue, g, high, weight);
  kochEdge(ctx, xA, yA, xM, yM, depth - 1, hue + 12, g, high, weight);
  kochEdge(ctx, xM, yM, xB, yB, depth - 1, hue + 24, g, high, weight);
  kochEdge(ctx, xB, yB, x2, y2, depth - 1, hue + 36, g, high, weight);
}

function drawKochBurst(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, beat } = input;
  const arms = recipe.branches;
  const rad = maxR * recipe.scale * (0.7 + bass * 0.4 + (beat ? 0.1 : 0));
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + recipe.twist + t * (0.1 + mid * 0.3);
    const x2 = cx + Math.cos(a) * rad;
    const y2 = cy + Math.sin(a) * rad;
    kochEdge(
      ctx, cx, cy, x2, y2,
      Math.min(3, recipe.depth),
      recipe.hueSeed + i * 20 + t * 10,
      g * (0.85 + env * 0.4),
      high,
      recipe.weight,
    );
  }
}

/** Apollonian-ish circle packing — bold rings. */
function drawApollonian(
  input: DrawFractalInput,
  x: number, y: number, rad: number, depth: number,
) {
  const { ctx, recipe, g, t, mid, high, env, punch } = input;
  if (depth <= 0 || rad < 8) return;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.strokeStyle = hsla(recipe.hueSeed + depth * 40 + t * 20, 75, 50 + mid * 18, (0.28 + env * 0.2 + punch * 0.1) * g);
  ctx.lineWidth = strokeW(recipe, 2.5, high * 2);
  ctx.stroke();
  const child = rad * (0.42 + recipe.soft * 0.1);
  const orbit = rad - child;
  const kids = Math.min(recipe.branches, 5);
  for (let i = 0; i < kids; i++) {
    const a = (i / kids) * Math.PI * 2 + recipe.twist + t * 0.2;
    drawApollonian(input, x + Math.cos(a) * orbit, y + Math.sin(a) * orbit, child, depth - 1);
  }
}

/** Flow-field filaments — fewer thick streams. */
function drawFlowField(input: DrawFractalInput) {
  const { ctx, recipe, cx, cy, maxR, g, t, bass, mid, high, env, punch, beat } = input;
  const strands = Math.floor(8 + recipe.density * 12);
  const steps = Math.floor(20 + recipe.depth * 8);
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
      const ang = Math.atan2(dy, dx) + Math.sin(dx * 0.01 + t) * (0.4 + mid) + Math.cos(dy * 0.01 - t) * (0.3 + high * 0.5);
      const step = maxR * recipe.scale * (0.025 + bass * 0.012 + (beat ? 0.006 : 0));
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hsla(recipe.hueSeed + s * 14 + t * 30, 80, 55 + high * 18, (0.28 + env * 0.25 + punch * 0.12) * g);
    ctx.lineWidth = strokeW(recipe, 2.8, high * 2.5 + punch);
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
      drawSpiralTree(input, recipe.depth + 1, cx, cy, -Math.PI / 2 + recipe.twist, maxR * recipe.scale * 0.38);
      drawSpiralTree(input, recipe.depth, cx, cy, Math.PI / 2 + recipe.twist, maxR * recipe.scale * 0.3);
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

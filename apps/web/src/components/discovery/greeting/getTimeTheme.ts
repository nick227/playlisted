type Hsl = readonly [h: number, s: number, l: number];

type ThemeAnchor = {
  hour: number;
  skyFrom: Hsl;
  skyVia: Hsl;
  skyTo: Hsl;
  glow: Hsl;
  glowOpacity: number;
  glowX: number;
  glowY: number;
  textMutedOpacity: number;
  starOpacity: number;
};

export type TimeTheme = {
  skyGradient: string;
  glowColor: string;
  glowOpacity: number;
  glowX: number;
  glowY: number;
  sunX: number;
  sunY: number;
  sunScale: number;
  sunOpacity: number;
  moonX: number;
  moonY: number;
  moonOpacity: number;
  starOpacity: number;
  textMutedOpacity: number;
  greeting: string;
};

const ANCHORS: ThemeAnchor[] = [
  {
    hour: 0,
    skyFrom: [240, 42, 7],
    skyVia: [258, 48, 11],
    skyTo: [235, 38, 6],
    glow: [220, 35, 82],
    glowOpacity: 0.14,
    glowX: 14,
    glowY: 16,
    textMutedOpacity: 0.52,
    starOpacity: 1,
  },
  {
    hour: 6,
    skyFrom: [32, 72, 58],
    skyVia: [280, 52, 24],
    skyTo: [248, 45, 12],
    glow: [42, 92, 68],
    glowOpacity: 0.28,
    glowX: 12,
    glowY: 72,
    textMutedOpacity: 0.58,
    starOpacity: 0,
  },
  {
    hour: 12,
    skyFrom: [220, 55, 42],
    skyVia: [265, 58, 28],
    skyTo: [248, 48, 14],
    glow: [48, 95, 72],
    glowOpacity: 0.32,
    glowX: 84,
    glowY: 14,
    textMutedOpacity: 0.64,
    starOpacity: 0,
  },
  {
    hour: 18,
    skyFrom: [12, 68, 48],
    skyVia: [310, 55, 22],
    skyTo: [260, 48, 10],
    glow: [28, 88, 58],
    glowOpacity: 0.26,
    glowX: 90,
    glowY: 68,
    textMutedOpacity: 0.56,
    starOpacity: 0,
  },
  {
    hour: 21,
    skyFrom: [245, 44, 9],
    skyVia: [262, 50, 13],
    skyTo: [238, 40, 7],
    glow: [215, 32, 80],
    glowOpacity: 0.15,
    glowX: 14,
    glowY: 18,
    textMutedOpacity: 0.53,
    starOpacity: 0.85,
  },
  {
    hour: 24,
    skyFrom: [240, 42, 7],
    skyVia: [258, 48, 11],
    skyTo: [235, 38, 6],
    glow: [220, 35, 82],
    glowOpacity: 0.14,
    glowX: 14,
    glowY: 16,
    textMutedOpacity: 0.52,
    starOpacity: 1,
  },
];

const SUN_PATH = {
  p0: { x: 10, y: 78 },
  p1: { x: 28, y: 22 },
  p2: { x: 78, y: 8 },
  p3: { x: 94, y: 82 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHue(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (a + diff * t + 360) % 360;
}

function lerpHsl(a: Hsl, b: Hsl, t: number): Hsl {
  return [lerpHue(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function hsl([h, s, l]: Hsl): string {
  return `hsl(${h} ${s}% ${l}%)`;
}

function cubicBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function blendAnchors(a: ThemeAnchor, b: ThemeAnchor, t: number): ThemeAnchor {
  return {
    hour: lerp(a.hour, b.hour, t),
    skyFrom: lerpHsl(a.skyFrom, b.skyFrom, t),
    skyVia: lerpHsl(a.skyVia, b.skyVia, t),
    skyTo: lerpHsl(a.skyTo, b.skyTo, t),
    glow: lerpHsl(a.glow, b.glow, t),
    glowOpacity: lerp(a.glowOpacity, b.glowOpacity, t),
    glowX: lerp(a.glowX, b.glowX, t),
    glowY: lerp(a.glowY, b.glowY, t),
    textMutedOpacity: lerp(a.textMutedOpacity, b.textMutedOpacity, t),
    starOpacity: lerp(a.starOpacity, b.starOpacity, t),
  };
}

function interpolateAnchors(hour: number): ThemeAnchor {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < ANCHORS.length - 1; i += 1) {
    const a = ANCHORS[i];
    const b = ANCHORS[i + 1];
    if (h >= a.hour && h < b.hour) {
      const t = (h - a.hour) / (b.hour - a.hour);
      return blendAnchors(a, b, t);
    }
  }
  return ANCHORS[0];
}

function getSunState(hour: number): { x: number; y: number; scale: number; opacity: number } {
  if (hour < 5 || hour >= 20.5) {
    return { x: 0, y: 0, scale: 1, opacity: 0 };
  }

  let opacity = 1;
  if (hour < 6) opacity = clamp((hour - 5) / 1, 0, 1);
  if (hour >= 19.5) opacity = clamp((20.5 - hour) / 1, 0, 1);

  const t = clamp((hour - 6) / 14, 0, 1);
  const { x, y } = cubicBezier(t, SUN_PATH.p0, SUN_PATH.p1, SUN_PATH.p2, SUN_PATH.p3);
  const scale = lerp(0.88, 1.08, Math.sin(t * Math.PI));

  return { x, y, scale, opacity };
}

function getMoonState(hour: number): { x: number; y: number; opacity: number } {
  const x = 14;
  const y = 16;

  if (hour >= 20.5 || hour < 5.5) {
    let opacity = 1;
    if (hour >= 20.5 && hour < 21.5) opacity = clamp(hour - 20.5, 0, 1);
    if (hour >= 4.5 && hour < 5.5) opacity = clamp(5.5 - hour, 0, 1);
    return { x, y, opacity };
  }

  return { x, y, opacity: 0 };
}

export function getGreeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function getTimeTheme(date = new Date()): TimeTheme {
  const hour = date.getHours() + date.getMinutes() / 60;
  const anchor = interpolateAnchors(hour);
  const sun = getSunState(hour);
  const moon = getMoonState(hour);

  return {
    skyGradient: `linear-gradient(135deg, ${hsl(anchor.skyFrom)} 0%, ${hsl(anchor.skyVia)} 55%, ${hsl(anchor.skyTo)} 100%)`,
    glowColor: hsl(anchor.glow),
    glowOpacity: anchor.glowOpacity,
    glowX: anchor.glowX,
    glowY: anchor.glowY,
    sunX: sun.x,
    sunY: sun.y,
    sunScale: sun.scale,
    sunOpacity: sun.opacity,
    moonX: moon.x,
    moonY: moon.y,
    moonOpacity: moon.opacity,
    starOpacity: anchor.starOpacity * moon.opacity,
    textMutedOpacity: anchor.textMutedOpacity,
    greeting: getGreeting(date.getHours()),
  };
}

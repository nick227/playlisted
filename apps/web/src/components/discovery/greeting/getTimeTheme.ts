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

type SkyPalette = {
  hue: number;
  viaOffset: number;
  toOffset: number;
  glowOffset: number;
  saturationBoost: number;
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

const SKY_PALETTES: readonly SkyPalette[] = [
  { hue: 188, viaOffset: 58, toOffset: 134, glowOffset: -30, saturationBoost: 6 },
  { hue: 216, viaOffset: 42, toOffset: 108, glowOffset: 172, saturationBoost: 4 },
  { hue: 268, viaOffset: 36, toOffset: 96, glowOffset: -52, saturationBoost: 7 },
  { hue: 305, viaOffset: 44, toOffset: 122, glowOffset: 66, saturationBoost: 8 },
  { hue: 350, viaOffset: 32, toOffset: 92, glowOffset: 44, saturationBoost: 5 },
  { hue: 30, viaOffset: -52, toOffset: 168, glowOffset: 28, saturationBoost: 6 },
  { hue: 148, viaOffset: 48, toOffset: 118, glowOffset: -70, saturationBoost: 5 },
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
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function hsla([h, s, l]: Hsl, alpha: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${alpha})`;
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function randomBetween(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

function randomizeSkyHsl(
  base: Hsl,
  hue: number,
  rng: () => number,
  options: {
    hueBlend: number;
    saturationBoost: number;
    lightnessJitter: number;
  },
): Hsl {
  return [
    lerpHue(base[0], normalizeHue(hue), options.hueBlend),
    clamp(base[1] + options.saturationBoost + randomBetween(rng, -5, 5), 30, 92),
    clamp(
      base[2] + randomBetween(rng, -options.lightnessJitter, options.lightnessJitter),
      5,
      76,
    ),
  ];
}

function getRandomizedSky(
  anchor: ThemeAnchor,
  rng: () => number,
): Pick<ThemeAnchor, "skyFrom" | "skyVia" | "skyTo" | "glow"> {
  const palette = SKY_PALETTES[Math.floor(rng() * SKY_PALETTES.length)] ?? SKY_PALETTES[0];
  const hue = normalizeHue(palette.hue + randomBetween(rng, -18, 18));
  const lightnessJitter = anchor.skyFrom[2] < 18 ? 2 : 5;

  return {
    skyFrom: randomizeSkyHsl(anchor.skyFrom, hue, rng, {
      hueBlend: 0.52,
      saturationBoost: palette.saturationBoost,
      lightnessJitter,
    }),
    skyVia: randomizeSkyHsl(anchor.skyVia, hue + palette.viaOffset, rng, {
      hueBlend: 0.68,
      saturationBoost: palette.saturationBoost + 4,
      lightnessJitter,
    }),
    skyTo: randomizeSkyHsl(anchor.skyTo, hue + palette.toOffset, rng, {
      hueBlend: 0.58,
      saturationBoost: palette.saturationBoost,
      lightnessJitter: Math.max(1, lightnessJitter - 1),
    }),
    glow: randomizeSkyHsl(anchor.glow, hue + palette.glowOffset, rng, {
      hueBlend: 0.7,
      saturationBoost: palette.saturationBoost + 8,
      lightnessJitter: lightnessJitter + 3,
    }),
  };
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

export function getTimeTheme(
  date = new Date(),
  rng: () => number = Math.random,
): TimeTheme {
  const hour = date.getHours() + date.getMinutes() / 60;
  const anchor = interpolateAnchors(hour);
  const sky = getRandomizedSky(anchor, rng);
  const sun = getSunState(hour);
  const moon = getMoonState(hour);
  const glowHalo: Hsl = [
    normalizeHue(sky.glow[0] + randomBetween(rng, -18, 18)),
    clamp(sky.glow[1] - 8, 35, 92),
    clamp(sky.glow[2] - 14, 8, 72),
  ];

  return {
    skyGradient: [
      `radial-gradient(circle at ${anchor.glowX}% ${anchor.glowY}%, ` +
        `${hsla(sky.glow, 0.28)} 0%, ${hsla(sky.glow, 0)} 34%)`,
      `radial-gradient(circle at ${100 - anchor.glowX}% ${100 - anchor.glowY}%, ` +
        `${hsla(sky.skyVia, 0.2)} 0%, ${hsla(sky.skyVia, 0)} 42%)`,
      `linear-gradient(135deg, ${hsl(sky.skyFrom)} 0%, ${hsl(sky.skyVia)} 55%, ${hsl(sky.skyTo)} 100%)`,
    ].join(", "),
    glowColor:
      `radial-gradient(circle, ${hsla(sky.glow, 0.95)} 0%, ` +
      `${hsla(glowHalo, 0.45)} 48%, ${hsla(glowHalo, 0)} 72%)`,
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

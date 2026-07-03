export type SubtitlePosition = "top" | "middle" | "bottom";

export type SubtitleStylePreset = {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  color: string;
  backgroundColor: string;
  textShadow?: string;
  borderRadius?: string;
  letterSpacing?: string;
  backgroundImage?: string;
};

export const DEFAULT_SUBTITLE_POSITION: SubtitlePosition = "bottom";
export const DEFAULT_SUBTITLE_STYLE_ID = "classic";

export const SUBTITLE_STYLE_PRESETS: SubtitleStylePreset[] = [
  {
    id: "classic",
    name: "Classic",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "1rem",
    fontWeight: 800,
    color: "#ffffff",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    textShadow: "0 2px 10px rgba(0, 0, 0, 0.75)",
    borderRadius: "0.5rem",
  },
  {
    id: "cinema",
    name: "Cinema",
    fontFamily: '"Georgia", "Times New Roman", serif',
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "#f5f0e6",
    backgroundColor: "rgba(8, 8, 8, 0.88)",
    letterSpacing: "0.04em",
    borderRadius: "0.25rem",
  },
  {
    id: "neon",
    name: "Neon",
    fontFamily: '"Courier New", monospace',
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#5eead4",
    backgroundColor: "rgba(15, 10, 35, 0.9)",
    textShadow: "0 0 12px rgba(94, 234, 212, 0.55)",
    borderRadius: "0.35rem",
  },
  {
    id: "karaoke",
    name: "Karaoke",
    fontFamily: '"Arial Black", "Arial", sans-serif',
    fontSize: "1.1rem",
    fontWeight: 900,
    color: "#fde047",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    textShadow: "0 2px 0 rgba(0, 0, 0, 0.9)",
    borderRadius: "0.4rem",
  },
  {
    id: "minimal",
    name: "Minimal",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.92)",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: "0.35rem",
  },
  {
    id: "bubble",
    name: "Bubble",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#111827",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: "999px",
  },
  {
    id: "retro",
    name: "Retro",
    fontFamily: '"Trebuchet MS", sans-serif',
    fontSize: "1rem",
    fontWeight: 800,
    color: "#fdba74",
    backgroundColor: "rgba(67, 20, 7, 0.88)",
    textShadow: "2px 2px 0 rgba(0, 0, 0, 0.65)",
    borderRadius: "0.2rem",
  },
  {
    id: "outline",
    name: "Outline",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "1rem",
    fontWeight: 800,
    color: "#ffffff",
    backgroundColor: "transparent",
    textShadow:
      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.8)",
    borderRadius: "0",
  },
  {
    id: "pop",
    name: "Pop",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "1rem",
    fontWeight: 800,
    color: "#ffffff",
    backgroundColor: "rgba(236, 72, 153, 0.92)",
    borderRadius: "0.65rem",
  },
  {
    id: "glow",
    name: "Glow",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#86efac",
    backgroundColor: "rgba(3, 20, 12, 0.82)",
    textShadow: "0 0 16px rgba(134, 239, 172, 0.7)",
    borderRadius: "0.45rem",
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    fontFamily: '"Impact", "Arial Black", sans-serif',
    fontSize: "1.05rem",
    fontWeight: 400,
    color: "#ff71ce",
    backgroundColor: "rgba(45, 12, 72, 0.92)",
    backgroundImage: "linear-gradient(135deg, rgba(45, 12, 72, 0.95), rgba(12, 28, 68, 0.95))",
    textShadow: "2px 2px 0 #01cdfe, -2px -2px 0 #b967ff, 0 0 18px rgba(255, 113, 206, 0.55)",
    letterSpacing: "0.14em",
    borderRadius: "0",
  },
  {
    id: "glitch",
    name: "Glitch",
    fontFamily: '"Courier New", monospace',
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "#f8fafc",
    backgroundColor: "rgba(2, 6, 23, 0.94)",
    textShadow:
      "3px 0 #ef4444, -3px 0 #22d3ee, 1px 1px 0 #a855f7, 0 0 12px rgba(239, 68, 68, 0.4), 0 0 12px rgba(34, 211, 238, 0.35)",
    letterSpacing: "0.08em",
    borderRadius: "0.1rem",
  },
  {
    id: "broadcast",
    name: "Broadcast",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "1rem",
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    letterSpacing: "0.03em",
    borderRadius: "0.2rem",
  },
  {
    id: "documentary",
    name: "Documentary",
    fontFamily: '"Georgia", "Times New Roman", serif',
    fontSize: "1rem",
    fontWeight: 500,
    color: "#e7e2d9",
    backgroundColor: "rgba(24, 20, 18, 0.88)",
    letterSpacing: "0.02em",
    borderRadius: "0.15rem",
  },
  {
    id: "studio",
    name: "Studio",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#f8fafc",
    backgroundColor: "rgba(28, 28, 30, 0.86)",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.45)",
    borderRadius: "0.4rem",
  },
  {
    id: "closed-caption",
    name: "Closed Caption",
    fontFamily: '"Arial", "Helvetica Neue", sans-serif',
    fontSize: "1rem",
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: "0.15rem",
  },
  {
    id: "frost",
    name: "Frost",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    textShadow: "0 1px 8px rgba(0, 0, 0, 0.55)",
    borderRadius: "0.45rem",
  },
  {
    id: "slate",
    name: "Slate",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#f1f5f9",
    backgroundColor: "rgba(51, 65, 85, 0.92)",
    borderRadius: "0.35rem",
  },
  {
    id: "editorial",
    name: "Editorial",
    fontFamily: '"Georgia", "Times New Roman", serif',
    fontSize: "0.98rem",
    fontWeight: 600,
    color: "#1c1917",
    backgroundColor: "rgba(250, 250, 249, 0.94)",
    textShadow: "0 1px 0 rgba(255, 255, 255, 0.6)",
    borderRadius: "0.25rem",
  },
  {
    id: "prestige",
    name: "Prestige",
    fontFamily: '"Georgia", "Times New Roman", serif',
    fontSize: "1rem",
    fontWeight: 600,
    color: "#e8d5a3",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    letterSpacing: "0.03em",
    borderRadius: "0.2rem",
  },
  {
    id: "corporate",
    name: "Corporate",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "rgba(30, 58, 95, 0.93)",
    borderRadius: "0.3rem",
  },
  {
    id: "stream",
    name: "Stream",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 800,
    color: "#ffffff",
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    borderRadius: "0.2rem",
  },
  {
    id: "lecture",
    name: "Lecture",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.92rem",
    fontWeight: 500,
    color: "#f8fafc",
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    letterSpacing: "0.015em",
    borderRadius: "0.35rem",
  },
  {
    id: "legal",
    name: "Legal",
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#e2e8f0",
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    letterSpacing: "0.04em",
    borderRadius: "0.1rem",
  },
  {
    id: "conference",
    name: "Conference",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#0f172a",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: "0.35rem",
  },
  {
    id: "night-mode",
    name: "Night Mode",
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: "0.92rem",
    fontWeight: 500,
    color: "#cbd5e1",
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    borderRadius: "0.4rem",
  },
];

export function getSubtitleStylePreset(id: string): SubtitleStylePreset {
  return SUBTITLE_STYLE_PRESETS.find((preset) => preset.id === id) ?? SUBTITLE_STYLE_PRESETS[0];
}

export function normalizeSubtitlePosition(value: unknown): SubtitlePosition {
  return value === "top" || value === "middle" || value === "bottom" ? value : DEFAULT_SUBTITLE_POSITION;
}

export function normalizeSubtitleStyleId(value: unknown): string {
  return typeof value === "string" && SUBTITLE_STYLE_PRESETS.some((preset) => preset.id === value)
    ? value
    : DEFAULT_SUBTITLE_STYLE_ID;
}

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
];

export function getSubtitleStylePreset(id: string): SubtitleStylePreset {
  return SUBTITLE_STYLE_PRESETS.find((preset) => preset.id === id) ?? SUBTITLE_STYLE_PRESETS[0];
}

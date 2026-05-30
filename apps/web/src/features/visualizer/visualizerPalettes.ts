import type { VisualizerPalette } from "./visualizerTypes";

export const VISUALIZER_PALETTES: VisualizerPalette[] = [
  {
    id: "midnight-radio",
    name: "Midnight Radio",
    background: "#070b12",
    base: "#7c4dff",
    accent: "#63d7ff",
    glow: "#9f7cff",
    secondary: "#f2d16b",
  },
  {
    id: "indie-paper",
    name: "Indie Paper",
    background: "#11100d",
    base: "#f4efe4",
    accent: "#df6f4d",
    glow: "#f0c66d",
    secondary: "#94b8a7",
  },
  {
    id: "neon-booth",
    name: "Neon Booth",
    background: "#08070d",
    base: "#ff3d8b",
    accent: "#1effd6",
    glow: "#8b5cff",
    secondary: "#ffe66d",
  },
  {
    id: "warm-tape",
    name: "Warm Tape",
    background: "#100c0a",
    base: "#ffb86b",
    accent: "#ff6b6b",
    glow: "#ffd59c",
    secondary: "#7bdcb5",
  },
  {
    id: "cloud-fm",
    name: "Cloud FM",
    background: "#071017",
    base: "#9ad7ff",
    accent: "#d7f7ff",
    glow: "#79a8ff",
    secondary: "#f6a6ff",
  },
  {
    id: "editorial-minimal",
    name: "Editorial Minimal",
    background: "#0c1016",
    base: "#d9dee8",
    accent: "#7c4dff",
    glow: "#ffffff",
    secondary: "#929dad",
  },
];

export const DEFAULT_VISUALIZER_PALETTE_ID = "midnight-radio";

export function getVisualizerPalette(id: string): VisualizerPalette {
  return VISUALIZER_PALETTES.find((palette) => palette.id === id) ?? VISUALIZER_PALETTES[0];
}

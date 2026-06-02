import type { VisualizerMode } from "./visualizerTypes";

export const VISUALIZER_MODES: Array<{ id: VisualizerMode; name: string }> = [
  { id: "ambient-bars", name: "Bars" },
  { id: "radial-pulse", name: "Radial" },
  { id: "soft-blob", name: "Blob" },
  { id: "wave-ribbon", name: "Wave" },
];

export function isVisualizerMode(value: unknown): value is VisualizerMode {
  return typeof value === "string" && VISUALIZER_MODES.some((mode) => mode.id === value);
}

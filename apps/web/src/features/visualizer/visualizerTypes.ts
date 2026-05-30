export type VisualizerMotion = "off" | "low" | "normal" | "high";

export type VisualizerDisabledReason = "user" | "reduced-motion" | "performance" | "error";

export type VisualizerSurface = "default" | "soft" | "hidden" | "editor" | "immersive";

export type VisualizerSettings = {
  enabled: boolean;
  paletteId: string;
  intensity: number;
  backgroundOpacity: number;
  glow: number;
  motion: VisualizerMotion;
  disabledReason?: VisualizerDisabledReason;
  showDevControls?: boolean;
};

export type VisualizerPalette = {
  id: string;
  name: string;
  background: string;
  base: string;
  accent: string;
  glow: string;
  secondary?: string;
};

export type VisualizerSeed = {
  value: number;
  barSpacing: number;
  curveDensity: number;
  rotationOffset: number;
  pulseSoftness: number;
  accentEmphasis: number;
  drift: number;
};

export type VisualizerPlaybackState = "idle" | "loading" | "playing" | "paused" | "error";

export type VisualizerFrame = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  settings: VisualizerSettings;
  palette: VisualizerPalette;
  seed: VisualizerSeed;
  playbackState: VisualizerPlaybackState;
  time: number;
  delta: number;
  surface: VisualizerSurface;
};

export type VisualizerRenderer = {
  mount: (canvas: HTMLCanvasElement) => void;
  resize: (width: number, height: number, dpr: number) => void;
  getContext: () => CanvasRenderingContext2D | null;
  render: (frame: VisualizerFrame) => void;
  destroy: () => void;
};

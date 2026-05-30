import { DEFAULT_VISUALIZER_PALETTE_ID, VISUALIZER_PALETTES } from "./visualizerPalettes";
import { isVisualizerMode } from "./visualizerModes";
import type {
  VisualizerDisabledReason,
  VisualizerMotion,
  VisualizerSettings,
} from "./visualizerTypes";

export const VISUALIZER_STORAGE_KEY = "playlisted.visualizer.settings";

const MOTIONS: VisualizerMotion[] = ["off", "low", "normal", "high"];
const DISABLED_REASONS: VisualizerDisabledReason[] = ["user", "reduced-motion", "performance", "error"];

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
  enabled: true,
  mode: "ambient-bars",
  paletteId: DEFAULT_VISUALIZER_PALETTE_ID,
  intensity: 0.7,
  backgroundOpacity: 0.55,
  glow: 0.55,
  motion: "normal",
};

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function isMotion(value: unknown): value is VisualizerMotion {
  return typeof value === "string" && MOTIONS.includes(value as VisualizerMotion);
}

function isDisabledReason(value: unknown): value is VisualizerDisabledReason {
  return typeof value === "string" && DISABLED_REASONS.includes(value as VisualizerDisabledReason);
}

function isPaletteId(value: unknown): value is string {
  return typeof value === "string" && VISUALIZER_PALETTES.some((palette) => palette.id === value);
}

export function defaultVisualizerSettings(prefersReducedMotion = false): VisualizerSettings {
  if (!prefersReducedMotion) return DEFAULT_VISUALIZER_SETTINGS;
  return {
    ...DEFAULT_VISUALIZER_SETTINGS,
    enabled: false,
    motion: "low",
    disabledReason: "reduced-motion",
  };
}

export function sanitizeVisualizerSettings(
  value: unknown,
  prefersReducedMotion = false,
): VisualizerSettings {
  const defaults = defaultVisualizerSettings(prefersReducedMotion);
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Partial<VisualizerSettings>;
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : defaults.enabled;
  const disabledReason = enabled
    ? undefined
    : isDisabledReason(raw.disabledReason)
      ? raw.disabledReason
      : defaults.disabledReason;

  return {
    enabled,
    mode: isVisualizerMode(raw.mode) ? raw.mode : defaults.mode,
    paletteId: isPaletteId(raw.paletteId) ? raw.paletteId : defaults.paletteId,
    intensity: clamp(raw.intensity, defaults.intensity, 0, 1.5),
    backgroundOpacity: clamp(raw.backgroundOpacity, defaults.backgroundOpacity, 0, 1),
    glow: clamp(raw.glow, defaults.glow, 0, 1.5),
    motion: isMotion(raw.motion) ? raw.motion : defaults.motion,
    disabledReason,
    showDevControls: raw.showDevControls === true,
  };
}

export function readVisualizerSettings(
  storage: Pick<Storage, "getItem"> | undefined,
  prefersReducedMotion = false,
): VisualizerSettings {
  if (!storage) return defaultVisualizerSettings(prefersReducedMotion);
  try {
    const raw = storage.getItem(VISUALIZER_STORAGE_KEY);
    if (!raw) return defaultVisualizerSettings(prefersReducedMotion);
    return sanitizeVisualizerSettings(JSON.parse(raw), prefersReducedMotion);
  } catch {
    return defaultVisualizerSettings(prefersReducedMotion);
  }
}

export function writeVisualizerSettings(
  storage: Pick<Storage, "setItem"> | undefined,
  settings: VisualizerSettings,
): void {
  if (!storage) return;
  // performance and error disables are session-only — don't carry them across reloads.
  const sessionDisable =
    settings.disabledReason === "performance" || settings.disabledReason === "error";
  const toWrite: VisualizerSettings = sessionDisable
    ? { ...settings, enabled: true, disabledReason: undefined }
    : settings;
  try {
    storage.setItem(VISUALIZER_STORAGE_KEY, JSON.stringify(toWrite));
  } catch {
    // localStorage may be unavailable or full. Visualizer settings are optional.
  }
}

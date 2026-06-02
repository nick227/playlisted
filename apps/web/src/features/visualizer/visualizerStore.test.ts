import { describe, expect, it } from "vitest";

import {
  DEFAULT_VISUALIZER_SETTINGS,
  VISUALIZER_STORAGE_KEY,
  readVisualizerSettings,
  sanitizeVisualizerSettings,
  writeVisualizerSettings,
} from "./visualizerStore";

function memoryStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("visualizerStore", () => {
  it("returns defaults with empty storage", () => {
    expect(readVisualizerSettings(memoryStorage())).toEqual(DEFAULT_VISUALIZER_SETTINGS);
  });

  it("defaults reduced-motion users to disabled", () => {
    expect(readVisualizerSettings(memoryStorage(), true)).toMatchObject({
      enabled: false,
      motion: "low",
      disabledReason: "reduced-motion",
    });
  });

  it("clamps invalid stored values", () => {
    const settings = sanitizeVisualizerSettings({
      enabled: false,
      mode: "nope",
      paletteId: "missing",
      intensity: 99,
      backgroundOpacity: -10,
      glow: Number.NaN,
      motion: "too-much",
      disabledReason: "performance",
    });

    expect(settings).toMatchObject({
      enabled: false,
      mode: DEFAULT_VISUALIZER_SETTINGS.mode,
      paletteId: DEFAULT_VISUALIZER_SETTINGS.paletteId,
      intensity: 1.5,
      backgroundOpacity: 0,
      glow: DEFAULT_VISUALIZER_SETTINGS.glow,
      motion: DEFAULT_VISUALIZER_SETTINGS.motion,
      disabledReason: "performance",
    });
  });

  it("persists enabled changes", () => {
    const storage = memoryStorage();
    writeVisualizerSettings(storage, {
      ...DEFAULT_VISUALIZER_SETTINGS,
      enabled: false,
      disabledReason: "user",
    });

    expect(JSON.parse(storage.getItem(VISUALIZER_STORAGE_KEY) ?? "{}")).toMatchObject({
      enabled: false,
      disabledReason: "user",
    });
  });
});

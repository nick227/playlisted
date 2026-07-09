import { useSyncExternalStore } from "react";

import { DEFAULT_ATMOSPHERE_FX_PRESET_ID, isPublishedAtmosphereFxPreset } from "./catalog";
import type { AtmosphereFxGlobalMode } from "./types";

const STORAGE_KEY = "playlisted.atmosphereFx.settings";

export type AtmosphereFxSettings = {
  mode: AtmosphereFxGlobalMode;
  presetId: string;
};

const DEFAULT_SETTINGS: AtmosphereFxSettings = {
  mode: "off",
  presetId: DEFAULT_ATMOSPHERE_FX_PRESET_ID,
};

let settings: AtmosphereFxSettings = readStoredSettings();
const listeners = new Set<() => void>();

function isGlobalMode(value: unknown): value is AtmosphereFxGlobalMode {
  return value === "off" || value === "subtle" || value === "normal" || value === "strong";
}

function readStoredSettings(): AtmosphereFxSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AtmosphereFxSettings>;
    const mode = isGlobalMode(parsed.mode) ? parsed.mode : DEFAULT_SETTINGS.mode;
    const presetId =
      typeof parsed.presetId === "string" && isPublishedAtmosphereFxPreset(parsed.presetId)
        ? parsed.presetId
        : DEFAULT_SETTINGS.presetId;
    return { mode, presetId };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function persist(next: AtmosphereFxSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Preference is optional; keep in-memory state.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeAtmosphereFxSettings(listener: () => void) {
  return subscribe(listener);
}

function getSnapshot() {
  return settings;
}

export function getAtmosphereFxSettings(): AtmosphereFxSettings {
  return settings;
}

export function setAtmosphereFxSettings(patch: Partial<AtmosphereFxSettings>) {
  const next: AtmosphereFxSettings = {
    mode: isGlobalMode(patch.mode) ? patch.mode : settings.mode,
    presetId:
      typeof patch.presetId === "string" && isPublishedAtmosphereFxPreset(patch.presetId)
        ? patch.presetId
        : settings.presetId,
  };
  if (next.mode === settings.mode && next.presetId === settings.presetId) return;
  settings = next;
  persist(next);
  emit();
}

export function setAtmosphereFxMode(mode: AtmosphereFxGlobalMode) {
  setAtmosphereFxSettings({ mode });
}

export function setAtmosphereFxPresetId(presetId: string) {
  setAtmosphereFxSettings({ presetId });
}

export function useAtmosphereFxSettings() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS);
  return {
    settings: current,
    setAtmosphereFxSettings,
    setAtmosphereFxMode,
    setAtmosphereFxPresetId,
  };
}

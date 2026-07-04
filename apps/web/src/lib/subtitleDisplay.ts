import { useSyncExternalStore } from "react";

const STORAGE_KEY = "playlisted:subtitles-enabled";

let enabled = readStoredEnabled();
const listeners = new Set<() => void>();

function readStoredEnabled() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return enabled;
}

export function setSubtitlesEnabled(next: boolean) {
  if (enabled === next) return;
  enabled = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Subtitle preference is optional; keep the in-memory toggle working.
    }
  }
  emit();
}

export function toggleSubtitlesEnabled() {
  setSubtitlesEnabled(!enabled);
}

export function useSubtitleDisplay() {
  const subtitlesEnabled = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return {
    subtitlesEnabled,
    setSubtitlesEnabled,
    toggleSubtitlesEnabled,
  };
}

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "playlisted:subtitles-enabled";

let enabled = readStoredEnabled();
const listeners = new Set<() => void>();

function readStoredEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "0";
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
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
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

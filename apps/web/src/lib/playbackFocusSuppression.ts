import { useEffect, useSyncExternalStore } from "react";

let suppressCount = 0;
const listeners = new Set<() => void>();

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
  return suppressCount > 0;
}

export function suppressPlaybackFocus() {
  suppressCount += 1;
  emit();
  return () => {
    suppressCount = Math.max(0, suppressCount - 1);
    emit();
  };
}

export function isPlaybackFocusSuppressed() {
  return suppressCount > 0;
}

export function usePlaybackFocusSuppressed() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useSuppressPlaybackFocus(active = true) {
  useEffect(() => {
    if (!active) return;
    return suppressPlaybackFocus();
  }, [active]);
}

import { useSyncExternalStore } from "react";

import { THEATRE_SHELVED } from "../shelf";

const STORAGE_KEY = "playlisted.atmosphereFx.visible";

let visible = readStoredVisible();
const listeners = new Set<() => void>();

function readStoredVisible(): boolean {
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
  return !THEATRE_SHELVED && visible;
}

export function subscribeAtmosphereFxVisibility(listener: () => void) {
  return subscribe(listener);
}

export function getAtmosphereFxVisibility(): boolean {
  return getSnapshot();
}

export function setAtmosphereFxVisible(next: boolean) {
  if (visible === next) return;
  visible = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Preference is optional; keep the in-memory toggle working.
    }
  }
  emit();
}

export function toggleAtmosphereFxVisible() {
  setAtmosphereFxVisible(!visible);
}

export function useAtmosphereFxVisibility() {
  const atmosphereFxVisible = useSyncExternalStore(subscribe, getSnapshot, () => !THEATRE_SHELVED);
  return {
    visible: atmosphereFxVisible,
    setAtmosphereFxVisible,
    toggleAtmosphereFxVisible,
  };
}

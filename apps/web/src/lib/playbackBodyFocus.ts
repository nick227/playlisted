import { useEffect, useSyncExternalStore } from "react";

export const PLAYBACK_BODY_FOCUS_RETURN_EVENT = "playback-body-focus:return";

let bodyFocusHidden = false;
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
  return bodyFocusHidden;
}

export function setPlaybackBodyFocusHidden(next: boolean) {
  if (bodyFocusHidden === next) return;
  bodyFocusHidden = next;
  emit();
}

export function usePlaybackBodyFocusHidden() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useSyncPlaybackBodyFocusHidden(active: boolean) {
  useEffect(() => {
    setPlaybackBodyFocusHidden(active);
    return () => setPlaybackBodyFocusHidden(false);
  }, [active]);
}

export function requestPlaybackBodyFocusReturn() {
  window.dispatchEvent(new CustomEvent(PLAYBACK_BODY_FOCUS_RETURN_EVENT));
}

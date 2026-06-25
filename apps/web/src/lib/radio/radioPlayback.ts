export const LISTENER_ID_KEY = "playlisted.radio.listenerId";
export const RADIO_TRANSITION_RETRY_MS = 1000;
export const RADIO_TRANSITION_MAX_RETRIES = 8;

export function getListenerId() {
  const existing = window.localStorage.getItem(LISTENER_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(LISTENER_ID_KEY, next);
  return next;
}

export function getAnonName(listenerId: string) {
  return `anon-${listenerId.slice(0, 4)}`;
}

export function getAudioHref(audioUrl: string) {
  return new URL(audioUrl, window.location.origin).href;
}

export function getRadioSeekTime(
  elapsedSeconds: number | null | undefined,
  durationSeconds: number | null | undefined,
) {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds ?? 0) : 0;
  if (!Number.isFinite(durationSeconds) || !durationSeconds || durationSeconds <= 0) return elapsed;
  return Math.min(elapsed, Math.max(0, durationSeconds - 0.25));
}

export function isRadioElapsedAtEnd(
  elapsedSeconds: number | null | undefined,
  durationSeconds: number | null | undefined,
) {
  return (
    Number.isFinite(elapsedSeconds) &&
    Number.isFinite(durationSeconds) &&
    durationSeconds != null &&
    durationSeconds > 0 &&
    (elapsedSeconds ?? 0) >= durationSeconds - 0.1
  );
}

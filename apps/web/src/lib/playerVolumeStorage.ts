const VOLUME_KEY = "musicpop:player-volume";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function readPlayerVolume(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (!raw) return 1;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 1;
    return clamp01(parsed);
  } catch {
    return 1;
  }
}

export function writePlayerVolume(volume: number) {
  try {
    localStorage.setItem(VOLUME_KEY, String(clamp01(volume)));
  } catch {
    // Volume persistence is optional.
  }
}

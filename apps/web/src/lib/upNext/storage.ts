const AUTOPLAY_KEY = "playlisted-autoplay";

export function readAutoplayEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(AUTOPLAY_KEY);
  if (raw === "0" || raw === "false") return false;
  return true;
}

export function writeAutoplayEnabled(enabled: boolean) {
  localStorage.setItem(AUTOPLAY_KEY, enabled ? "1" : "0");
}

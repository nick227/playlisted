export function isPlaybackFocusBodyFadeDisabled(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return false;
}

export function isPlaybackFocusBodyFadeSuppressed(options: {
  pathname: string;
  subtitlesEnabled: boolean;
  theatreFxEnabled: boolean;
}): boolean {
  if (isPlaybackFocusBodyFadeDisabled(options.pathname)) return true;
  return !options.subtitlesEnabled && !options.theatreFxEnabled;
}

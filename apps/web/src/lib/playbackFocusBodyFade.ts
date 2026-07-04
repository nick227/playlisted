export function isPlaybackFocusBodyFadeDisabled(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname === "/studio" || pathname.startsWith("/studio/")) return true;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return true;
  if (pathname === "/charts" || pathname.startsWith("/charts/")) return true;
  if (pathname === "/library" || pathname.startsWith("/library/")) return true;
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

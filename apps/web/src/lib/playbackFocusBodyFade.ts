export function isPlaybackFocusBodyFadeDisabled(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname === "/favorites" || pathname === "/favorites/") return true;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  if (pathname === "/search" || pathname.startsWith("/search/")) return true;
  if (pathname === "/@" || pathname.startsWith("/@/")) return true;
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

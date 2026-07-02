export function isPlaybackFocusBodyFadeDisabled(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return false;
}

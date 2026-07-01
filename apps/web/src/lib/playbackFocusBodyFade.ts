const COLLECTION_EDIT_PATH = /^\/studio\/collections\/[^/]+\/edit$/;

export function isPlaybackFocusBodyFadeDisabled(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (COLLECTION_EDIT_PATH.test(pathname)) return true;
  return false;
}

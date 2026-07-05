import type { AuthUser } from "@playlisted/client-sdk";

export function isPlaybackFocusBodyFadeDisabled(pathname: string, user?: AuthUser | null): boolean {
  if (pathname === "/studio/collections" || pathname.startsWith("/studio/collections/")) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname === "/favorites" || pathname === "/favorites/") return true;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  if (pathname === "/search" || pathname.startsWith("/search/")) return true;
  // block if is owner of profile page, 
  if (user && (pathname === `/@${user.username}` || pathname.startsWith(`/@${user.username}/`))) return true;
  return false;
}

export function isPlaybackFocusBodyFadeSuppressed(options: {
  pathname: string;
  subtitlesEnabled: boolean;
  theatreFxEnabled: boolean;
  user?: AuthUser | null;
}): boolean {
  if (isPlaybackFocusBodyFadeDisabled(options.pathname, options.user)) return true;
  return !options.subtitlesEnabled && !options.theatreFxEnabled;
}

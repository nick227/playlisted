import type { AuthUser } from "@playlisted/client-sdk";

export type PlaybackFocusBodyFadeConfig = {
  disabled: boolean;
  delayMs?: number;
};

export function getPlaybackFocusBodyFadeConfig(pathname: string, user?: AuthUser | null): PlaybackFocusBodyFadeConfig {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return { disabled: true };
  if (pathname === "/login" || pathname === "/register") return { disabled: false, delayMs: 6330000 };
  if (pathname === "/library") return { disabled: false, delayMs: 15000 };
  if (pathname === "/favorites" || pathname === "/favorites/") return { disabled: false, delayMs: 10000 };
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return { disabled: true };
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return { disabled: true };
  if (pathname === "/search" || pathname.startsWith("/search/")) return { disabled: false, delayMs: 15000 };
  // block if is owner of profile page, 
  if (user && (pathname === `/@${user.username}` || pathname.startsWith(`/@${user.username}/`))) return { disabled: true };
  return { disabled: false };
}

export function isPlaybackFocusBodyFadeDisabled(pathname: string, user?: AuthUser | null): boolean {
  return getPlaybackFocusBodyFadeConfig(pathname, user).disabled;
}

export function getPlaybackFocusBodyFadeSuppressed(options: {
  pathname: string;
  subtitlesEnabled: boolean;
  theatreFxEnabled: boolean;
  user?: AuthUser | null;
}): PlaybackFocusBodyFadeConfig {
  const config = getPlaybackFocusBodyFadeConfig(options.pathname, options.user);
  if (config.disabled) return config;
  if (!options.subtitlesEnabled && !options.theatreFxEnabled) return { disabled: true, delayMs: config.delayMs };
  return config;
}

export function isPlaybackFocusBodyFadeSuppressed(options: {
  pathname: string;
  subtitlesEnabled: boolean;
  theatreFxEnabled: boolean;
  user?: AuthUser | null;
}): boolean {
  return getPlaybackFocusBodyFadeSuppressed(options).disabled;
}

import type { AuthUser, components } from "@playlisted/client-sdk";

type HomepageItem = components["schemas"]["HomepageItem"];

export const SETTINGS_PATH = "/settings";
export const STUDIO_PATH = "/studio";
export const ADMIN_PATH = "/admin";

export function panelPathForRole(role: AuthUser["role"]): string | null {
  if (role === "ADMIN" || role === "EDITOR") return ADMIN_PATH;
  return SETTINGS_PATH;
}

export function playlistIdPath(id: string): string {
  return `/playlists/${encodeURIComponent(id)}`;
}

export function playlistPath(playlist: {
  id: string;
  href?: string | null;
  slug?: string | null;
  username?: string | null;
}): string {
  if (playlist.href) return playlist.href;
  if (playlist.username && playlist.slug) {
    return `/@/${encodeURIComponent(playlist.username)}/${encodeURIComponent(playlist.slug)}`;
  }
  return playlistIdPath(playlist.id);
}

export function recordingSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "song";
}

export function recordingHash(title: string): string {
  return `#${encodeURIComponent(recordingSlug(title))}`;
}

export function playlistRecordingPath(
  playlist: {
    id: string;
    href?: string | null;
    slug?: string | null;
    username?: string | null;
  },
  recording: { title: string },
): string {
  return `${playlistPath(playlist)}${recordingHash(recording.title)}`;
}

export function memberPath(userId: string): string {
  return `/members/${userId}`;
}

export function profilePath(username: string): string {
  const clean = username.replace(/^@/, "");
  return `/@/${encodeURIComponent(clean)}`;
}

export function currentUserProfilePath(user: Pick<AuthUser, "username"> | null | undefined): string {
  return user?.username ? profilePath(user.username) : "/login";
}

export function studioCollectionEditPath(playlistId: string): string {
  return `/studio/collections/${playlistId}/edit`;
}

export function resolveItemPath(item: HomepageItem): string {
  if (item.targetType === "PLAYLIST") return item.href;
  if (item.targetType === "USER") {
    const match = item.href.match(/^\/@\/?([^/]+)/);
    if (match?.[1]) return profilePath(decodeURIComponent(match[1]));
    const username = item.subtitle?.replace(/^@/, "") ?? item.id;
    return profilePath(username);
  }
  return item.href;
}

export function coverFallback(seed: string): string {
  const hues = ["240", "280", "320", "200", "160"];
  const hue = hues[seed.charCodeAt(0) % hues.length];
  return `linear-gradient(135deg, hsl(${hue} 60% 35%), hsl(${hue} 40% 22%))`;
}

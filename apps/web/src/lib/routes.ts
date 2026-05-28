import type { AuthUser, components } from "@playlisted/client-sdk";

type HomepageItem = components["schemas"]["HomepageItem"];

export const STUDIO_PATH = "/studio";
export const ADMIN_PATH = "/admin";

export function panelPathForRole(role: AuthUser["role"]): string | null {
  if (role === "ADMIN" || role === "EDITOR") return ADMIN_PATH;
  if (role === "CREATOR") return STUDIO_PATH;
  return null;
}

export function playlistPath(id: string): string {
  return `/playlists/${id}`;
}

export function memberPath(userId: string): string {
  return `/members/${userId}`;
}

export function profilePath(username: string): string {
  return `/@${username}`;
}

export function studioCollectionEditPath(playlistId: string): string {
  return `/studio/collections/${playlistId}/edit`;
}

export function resolveItemPath(item: HomepageItem): string {
  if (item.targetType === "PLAYLIST") return playlistPath(item.id);
  if (item.targetType === "USER") {
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

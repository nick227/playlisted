export const SITE_NAME = "Playlisted";

export const DEFAULT_SHARE_DESCRIPTION =
  "Music charts and curated playlists for independent artists.";

export const OG_IMAGE_PATHS = {
  default: "/og/playlisted-default.jpg",
  artist: "/og/playlisted-artist-default.jpg",
  playlist: "/og/playlisted-playlist-default.jpg",
  song: "/og/playlisted-song-default.jpg",
} as const;

export function resolveClientOgImage(path: string = OG_IMAGE_PATHS.default): string {
  if (typeof window === "undefined") return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export const DEFAULT_OG_IMAGE = OG_IMAGE_PATHS.default;

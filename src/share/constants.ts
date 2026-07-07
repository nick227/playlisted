export const SITE_NAME = "Playlisted" as const;

export const PUBLIC_ORIGIN = (
  process.env.PUBLIC_SITE_URL ?? "https://playlisted.com"
).replace(/\/$/, "");

export const OG_IMAGE_PATHS = {
  default: "/og/playlisted-default.jpg",
  artist: "/og/playlisted-artist-default.jpg",
  playlist: "/og/playlisted-playlist-default.jpg",
  song: "/og/playlisted-song-default.jpg",
} as const;

export const DEFAULT_SHARE_DESCRIPTION =
  "Music charts and curated playlists for independent artists.";

export const SHARE_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=86400";

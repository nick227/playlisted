import { profilePath } from "@/lib/routes";

export const LIBRARY_PATH = "/library";
export const SONGS_PATH = "/songs";
export const GENRES_PATH = "/genres";
export const ARTISTS_PATH = "/artists";
export const PLAYLISTS_PATH = "/playlists";
export const FAVORITES_PATH = "/favorites";

/** Shared max-width for browse breadcrumbs and collection content. */
export const BROWSE_LAYOUT_CLASS = "mx-auto max-w-4xl";

/** Artist profile breadcrumbs align with the wider profile layout below. */
export const ARTIST_PROFILE_LAYOUT_CLASS = "mx-auto max-w-7xl";

export interface BrowseCrumb {
  label: string;
  to?: string;
}

export function genrePath(slug: string): string {
  return `${GENRES_PATH}/${encodeURIComponent(slug)}`;
}

export function artistPath(username: string): string {
  return profilePath(username);
}

export function libraryCrumb(): BrowseCrumb {
  return { label: "Library", to: LIBRARY_PATH };
}

export function songsBrowseCrumbs(): BrowseCrumb[] {
  return [libraryCrumb(), { label: "Songs" }];
}

export function genresBrowseCrumbs(): BrowseCrumb[] {
  return [libraryCrumb(), { label: "Genres" }];
}

export function genreDetailCrumbs(name: string): BrowseCrumb[] {
  return [...genresBrowseCrumbs(), { label: name }];
}

export function artistsBrowseCrumbs(): BrowseCrumb[] {
  return [libraryCrumb(), { label: "Artists" }];
}

export function artistDetailCrumbs(displayName: string): BrowseCrumb[] {
  return [...artistsBrowseCrumbs(), { label: displayName }];
}

export function playlistsBrowseCrumbs(): BrowseCrumb[] {
  return [libraryCrumb(), { label: "Playlists" }];
}

export function playlistBrowseCrumbs(
  owner: { displayName: string; username: string },
  playlistTitle: string,
): BrowseCrumb[] {
  return [
    libraryCrumb(),
    { label: "Artists", to: ARTISTS_PATH },
    { label: owner.displayName, to: artistPath(owner.username) },
    { label: playlistTitle },
  ];
}

export function parseTrackHash(hash: string): string | null {
  const prefix = "#track-";
  if (!hash.startsWith(prefix)) return null;
  const id = hash.slice(prefix.length).trim();
  return id || null;
}

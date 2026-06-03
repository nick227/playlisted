import type { LibraryArtist, LibraryGenre, LibrarySong, PlaylistSummary } from "@playlisted/client-sdk";

import { playlistGenreTags } from "@/components/studio/studioCollectionUtils";

export const EMPTY_LIBRARY_GENRES: LibraryGenre[] = [];
export const EMPTY_LIBRARY_ARTISTS: LibraryArtist[] = [];
export const EMPTY_LIBRARY_SONGS: LibrarySong[] = [];
export const EMPTY_PLAYLISTS: PlaylistSummary[] = [];

export type SongSortKey = "title" | "plays" | "favorites";
export type SortDirection = "asc" | "desc";

export function filterArtistsByGenre(artists: LibraryArtist[], genreSlug: string | null): LibraryArtist[] {
  if (!genreSlug) return artists;
  return artists.filter((artist) => artist.genres.some((genre) => genre.slug === genreSlug));
}

export function filterPlaylistsByGenre(playlists: PlaylistSummary[], genreSlug: string | null): PlaylistSummary[] {
  if (!genreSlug) return playlists;
  return playlists.filter((playlist) =>
    playlistGenreTags(playlist.tags).some((tag) => tag.slug === genreSlug),
  );
}

export function filterSongsByArtist(songs: LibrarySong[], artistId: string | null): LibrarySong[] {
  if (!artistId) return songs;
  return songs.filter((song) => song.uploaderId === artistId);
}

export function sortLibrarySongs(
  songs: LibrarySong[],
  sortKey: SongSortKey,
  direction: SortDirection,
): LibrarySong[] {
  if (sortKey === "title") return songs;

  const factor = direction === "asc" ? 1 : -1;
  return [...songs].sort((a, b) => {
    const aValue = sortKey === "plays" ? a.playCount : a.favoriteCount;
    const bValue = sortKey === "plays" ? b.playCount : b.favoriteCount;
    if (aValue === bValue) return a.title.localeCompare(b.title);
    return (aValue - bValue) * factor;
  });
}

export function topArtistsBySongCount(artists: LibraryArtist[], count: number): LibraryArtist[] {
  return [...artists].sort((a, b) => b.songCount - a.songCount).slice(0, count);
}

export function matchArtistsByQuery(artists: LibraryArtist[], query: string): LibraryArtist[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return artists
    .filter(
      (artist) =>
        artist.displayName.toLowerCase().includes(term) ||
        artist.username.toLowerCase().includes(term),
    )
    .slice(0, 8);
}

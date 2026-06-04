import type { LibraryArtist, LibraryGenre, LibrarySong, PlaylistSummary } from "@playlisted/client-sdk";

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

export function filterSongsByArtist(songs: LibrarySong[], artistId: string | null): LibrarySong[] {
  if (!artistId) return songs;
  return songs.filter((song) => song.uploaderId === artistId);
}

function sortGenres(genres: LibraryGenre[]): LibraryGenre[] {
  return genres.sort((a, b) => a.name.localeCompare(b.name));
}

function bumpGenre(
  genres: Map<string, LibraryGenre>,
  genre: { id: string; name: string; slug: string },
) {
  const existing = genres.get(genre.id);
  genres.set(genre.id, {
    id: genre.id,
    name: genre.name,
    slug: genre.slug,
    songCount: (existing?.songCount ?? 0) + 1,
  });
}

export function genresFromSongs(songs: LibrarySong[]): LibraryGenre[] {
  const genres = new Map<string, LibraryGenre>();
  for (const song of songs) {
    for (const genre of song.genres) {
      bumpGenre(genres, genre);
    }
  }
  return sortGenres(Array.from(genres.values()));
}

export function genresFromArtists(artists: LibraryArtist[]): LibraryGenre[] {
  const genres = new Map<string, LibraryGenre>();
  for (const artist of artists) {
    for (const genre of artist.genres) {
      bumpGenre(genres, genre);
    }
  }
  return sortGenres(Array.from(genres.values()));
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

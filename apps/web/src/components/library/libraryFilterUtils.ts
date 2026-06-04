import type { LibraryArtist, LibraryGenre, LibrarySong, PlaylistSummary } from "@playlisted/client-sdk";

export const EMPTY_LIBRARY_GENRES: LibraryGenre[] = [];
export const EMPTY_LIBRARY_ARTISTS: LibraryArtist[] = [];
export const EMPTY_LIBRARY_SONGS: LibrarySong[] = [];
export const EMPTY_PLAYLISTS: PlaylistSummary[] = [];

export type SongSortKey = "title" | "plays" | "favorites";
export type ArtistSortKey = "name" | "recordings";
export type PlaylistSortKey = "title" | "tracks";
export type SortDirection = "asc" | "desc";

export function filterArtistsByGenre(artists: LibraryArtist[], genreSlug: string | null): LibraryArtist[] {
  if (!genreSlug) return artists;
  return artists.filter((artist) => artist.genres.some((genre) => genre.slug === genreSlug));
}

export function filterArtistsByQuery(artists: LibraryArtist[], query: string): LibraryArtist[] {
  const term = query.trim().toLowerCase();
  if (!term) return artists;
  return artists.filter(
    (artist) =>
      artist.displayName.toLowerCase().includes(term) ||
      artist.username.toLowerCase().includes(term),
  );
}

export function filterSongsByArtist(songs: LibrarySong[], artistId: string | null): LibrarySong[] {
  if (!artistId) return songs;
  return songs.filter((song) => song.uploaderId === artistId);
}

export function filterPlaylistsByQuery(playlists: PlaylistSummary[], query: string): PlaylistSummary[] {
  const term = query.trim().toLowerCase();
  if (!term) return playlists;
  return playlists.filter(
    (playlist) =>
      playlist.title.toLowerCase().includes(term) ||
      playlist.slug.toLowerCase().includes(term) ||
      playlist.owner.displayName.toLowerCase().includes(term) ||
      playlist.owner.username.toLowerCase().includes(term),
  );
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

export function sortLibraryPlaylists(
  playlists: PlaylistSummary[],
  sortKey: PlaylistSortKey,
  direction: SortDirection,
): PlaylistSummary[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...playlists].sort((a, b) => {
    if (sortKey === "tracks") {
      if (a.itemCount !== b.itemCount) return (a.itemCount - b.itemCount) * factor;
    } else if (a.title.localeCompare(b.title) !== 0) {
      return a.title.localeCompare(b.title) * factor;
    }
    return a.owner.displayName.localeCompare(b.owner.displayName) * factor;
  });
}

export function sortLibraryArtists(
  artists: LibraryArtist[],
  sortKey: ArtistSortKey,
  direction: SortDirection,
): LibraryArtist[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...artists].sort((a, b) => {
    if (sortKey === "recordings") {
      if (a.songCount !== b.songCount) return (a.songCount - b.songCount) * factor;
    } else if (a.displayName.localeCompare(b.displayName) !== 0) {
      return a.displayName.localeCompare(b.displayName) * factor;
    }
    return a.username.localeCompare(b.username) * factor;
  });
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

export function topPlaylistsByItemCount(playlists: PlaylistSummary[], count: number): PlaylistSummary[] {
  return [...playlists].sort((a, b) => b.itemCount - a.itemCount).slice(0, count);
}

export function matchPlaylistsByQuery(playlists: PlaylistSummary[], query: string): PlaylistSummary[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return playlists
    .filter(
      (playlist) =>
        playlist.title.toLowerCase().includes(term) ||
        playlist.slug.toLowerCase().includes(term) ||
        playlist.owner.displayName.toLowerCase().includes(term) ||
        playlist.owner.username.toLowerCase().includes(term),
    )
    .slice(0, 8);
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

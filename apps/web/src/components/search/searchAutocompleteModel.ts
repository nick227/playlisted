import type { LibraryGenre, LibrarySong, PlaylistSummary, SearchResponse, UserSummary } from "@playlisted/client-sdk";

import { formatDuration } from "@/lib/format";
import { normalizeSearchResponse } from "@/lib/searchResults";
import { libraryGenrePath, libraryRecordingPath } from "@/lib/libraryPaths";
import { playlistPath, profilePath } from "@/lib/routes";

export const SEARCH_DEBOUNCE_MS = 250;
export const SUGGESTION_PAGE_SIZE = 5;

export type SearchSuggestionKind = "song" | "playlist" | "artist" | "genre" | "recent" | "view-all";

export interface SearchSuggestionOption {
  id: string;
  kind: SearchSuggestionKind;
  label: string;
  meta?: string;
  href: string;
  imageUrl?: string | null;
}

export interface SearchSuggestionGroup {
  label: string;
  options: SearchSuggestionOption[];
}

function songOption(song: LibrarySong): SearchSuggestionOption {
  const duration = song.durationSeconds != null ? formatDuration(song.durationSeconds) : null;
  const metaParts = [song.uploader.displayName, song.playlist.title, duration].filter(Boolean);
  return {
    id: `song-${song.id}`,
    kind: "song",
    label: song.title,
    meta: metaParts.join(" · "),
    href: libraryRecordingPath(song),
    imageUrl: song.artworkUrl,
  };
}

function playlistOption(playlist: PlaylistSummary): SearchSuggestionOption {
  return {
    id: `playlist-${playlist.id}`,
    kind: "playlist",
    label: playlist.title,
    meta: `${playlist.owner.displayName} · ${playlist.itemCount} tracks`,
    href: playlistPath(playlist),
    imageUrl: playlist.coverArtUrl,
  };
}

function artistOption(artist: UserSummary): SearchSuggestionOption {
  return {
    id: `artist-${artist.id}`,
    kind: "artist",
    label: artist.displayName,
    meta: `@${artist.username}`,
    href: profilePath(artist.username),
    imageUrl: artist.avatarUrl,
  };
}

function genreOption(genre: LibraryGenre): SearchSuggestionOption {
  const trackLabel = genre.songCount === 1 ? "track" : "tracks";
  return {
    id: `genre-${genre.id}`,
    kind: "genre",
    label: genre.name,
    meta: `${genre.songCount.toLocaleString()} ${trackLabel}`,
    href: libraryGenrePath(genre.slug),
  };
}

function cap<T>(items: T[]): T[] {
  return items.slice(0, SUGGESTION_PAGE_SIZE);
}

export function buildRecentGroups(recentSearches: string[]): SearchSuggestionGroup[] {
  if (recentSearches.length === 0) return [];
  return [
    {
      label: "Recent searches",
      options: recentSearches.map((term, index) => ({
        id: `recent-${index}-${term}`,
        kind: "recent",
        label: term,
        href: `/search?q=${encodeURIComponent(term)}`,
      })),
    },
  ];
}

export function buildResultGroups(query: string, raw: SearchResponse): SearchSuggestionGroup[] {
  const data = normalizeSearchResponse(raw);
  const groups: SearchSuggestionGroup[] = [];
  const songs = cap(data.songs);
  const artists = cap(data.artists);
  const playlists = cap(data.playlists);
  const genres = cap(data.genres);

  if (songs.length > 0) {
    groups.push({
      label: "Songs",
      options: songs.map(songOption),
    });
  }
  if (artists.length > 0) {
    groups.push({
      label: "Artists",
      options: artists.map(artistOption),
    });
  }
  if (playlists.length > 0) {
    groups.push({
      label: "Playlists",
      options: playlists.map(playlistOption),
    });
  }
  if (genres.length > 0) {
    groups.push({
      label: "Genres",
      options: genres.map(genreOption),
    });
  }

  const trimmed = query.trim();
  if (!trimmed) return groups;

  groups.push({
    label: "",
    options: [
      {
        id: "view-all",
        kind: "view-all",
        label: `View all results for "${trimmed}"`,
        href: `/search?q=${encodeURIComponent(trimmed)}`,
      },
    ],
  });

  return groups;
}

export function flattenGroups(groups: SearchSuggestionGroup[]): SearchSuggestionOption[] {
  return groups.flatMap((group) => group.options);
}

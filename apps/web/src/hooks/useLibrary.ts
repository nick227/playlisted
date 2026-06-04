import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useLibraryGenres() {
  return useQuery({
    queryKey: ["library", "genres"],
    queryFn: () => api.library.genres(),
    staleTime: 5 * 60_000,
  });
}

export function useLibraryPlaylistGenres() {
  return useQuery({
    queryKey: ["library", "playlist-genres"],
    queryFn: () => api.library.playlistGenres(),
    staleTime: 5 * 60_000,
  });
}

export function useAuthoringGenres() {
  return useQuery({
    queryKey: ["tags", "genres"],
    queryFn: () => api.tags.genres(),
    staleTime: 5 * 60_000,
  });
}

export function useLibrarySongs(genreSlug?: string | null, enabled = true) {
  const genre = genreSlug?.trim() || undefined;
  return useQuery({
    queryKey: ["library", "songs", genre ?? "all"],
    queryFn: () =>
      api.library.songs({
        pageSize: 200,
        ...(genre ? { genre } : {}),
      }),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useLibraryArtists() {
  return useQuery({
    queryKey: ["library", "artists"],
    queryFn: () => api.library.artists(),
    staleTime: 5 * 60_000,
  });
}

export function useLibraryPlaylists(genreSlug?: string | null) {
  const genre = genreSlug?.trim() || undefined;
  return useQuery({
    queryKey: ["library", "playlists", genre ?? "all"],
    queryFn: () => api.playlists.list({ pageSize: 50, ...(genre ? { genre } : {}) }),
    staleTime: 2 * 60_000,
  });
}

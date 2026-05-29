import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useLibraryGenres() {
  return useQuery({
    queryKey: ["library", "genres"],
    queryFn: () => api.library.genres(),
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

export function useLibraryPlaylists() {
  return useQuery({
    queryKey: ["library", "playlists"],
    queryFn: () => api.playlists.list({ pageSize: 50 }),
    staleTime: 2 * 60_000,
  });
}

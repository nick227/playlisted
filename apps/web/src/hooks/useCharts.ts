import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  ChartRange,
  RandomPlaylistsResponse,
  TopArtistsResponse,
  TopPlaylistsResponse,
  TopSongsResponse,
} from "@playlisted/client-sdk";

export function useTopSongs(range: ChartRange = "7d", limit = 10, genre?: string, enabled = true) {
  return useQuery<TopSongsResponse>({
    queryKey: ["charts", "top-songs", range, limit, genre ?? null],
    queryFn: () => api.charts.topSongs({ range, limit, genre }),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useTopPlaylists(range: ChartRange = "7d", limit = 10, enabled = true) {
  return useQuery<TopPlaylistsResponse>({
    queryKey: ["charts", "top-playlists", range, limit],
    queryFn: () => api.charts.topPlaylists({ range, limit }),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useUserRandomPlaylists(limit = 10, enabled = true) {
  return useQuery<RandomPlaylistsResponse>({
    queryKey: ["playlists", "user-random", limit],
    queryFn: () => api.playlists.userRandom({ limit }),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useTopArtists(range: ChartRange = "7d", limit = 10, enabled = true) {
  return useQuery<TopArtistsResponse>({
    queryKey: ["charts", "top-artists", range, limit],
    queryFn: () => api.charts.topArtists({ range, limit }),
    enabled,
    staleTime: 2 * 60_000,
  });
}

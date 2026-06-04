import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  ChartRange,
  RandomPlaylistsResponse,
  TopArtistsResponse,
  TopPlaylistsResponse,
  TopSongsResponse,
} from "@playlisted/client-sdk";

export function useTopSongs(range: ChartRange = "7d", limit = 10, genre?: string) {
  return useQuery<TopSongsResponse>({
    queryKey: ["charts", "top-songs", range, limit, genre ?? null],
    queryFn: () => api.charts.topSongs({ range, limit, genre }),
  });
}

export function useTopPlaylists(range: ChartRange = "7d", limit = 10) {
  return useQuery<TopPlaylistsResponse>({
    queryKey: ["charts", "top-playlists", range, limit],
    queryFn: () => api.charts.topPlaylists({ range, limit }),
  });
}

export function useUserRandomPlaylists(limit = 10) {
  return useQuery<RandomPlaylistsResponse>({
    queryKey: ["playlists", "user-random", limit],
    queryFn: () => api.playlists.userRandom({ limit }),
  });
}

export function useTopArtists(range: ChartRange = "7d", limit = 10) {
  return useQuery<TopArtistsResponse>({
    queryKey: ["charts", "top-artists", range, limit],
    queryFn: () => api.charts.topArtists({ range, limit }),
  });
}

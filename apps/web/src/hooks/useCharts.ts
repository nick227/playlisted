import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ChartRange } from "@playlisted/client-sdk";

export function useTopSongs(range: ChartRange = "7d", limit = 10) {
  return useQuery({
    queryKey: ["charts", "top-songs", range, limit],
    queryFn: () => api.charts.topSongs({ range, limit }),
  });
}

export function useTopPlaylists(range: ChartRange = "7d", limit = 10) {
  return useQuery({
    queryKey: ["charts", "top-playlists", range, limit],
    queryFn: () => api.charts.topPlaylists({ range, limit }),
  });
}

export function useTopArtists(range: ChartRange = "7d", limit = 10) {
  return useQuery({
    queryKey: ["charts", "top-artists", range, limit],
    queryFn: () => api.charts.topArtists({ range, limit }),
  });
}

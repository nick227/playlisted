import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePlaylist(playlistId: string | undefined) {
  return useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: () => api.playlists.getById(playlistId!),
    enabled: Boolean(playlistId),
  });
}

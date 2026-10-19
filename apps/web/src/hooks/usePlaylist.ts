import { useQuery } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function usePlaylistQueryOptions(playlistId: string | undefined) {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);

  return {
    queryKey: ["playlist", playlistId, accessToken ? "auth" : "guest"],
    queryFn: () => client.playlists.getById(playlistId!),
    enabled: Boolean(playlistId),
  };
}

export function usePlaylist(playlistId: string | undefined) {
  return useQuery(usePlaylistQueryOptions(playlistId));
}

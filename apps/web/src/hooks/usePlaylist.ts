import { useQuery } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function usePlaylist(playlistId: string | undefined) {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);

  return useQuery({
    queryKey: ["playlist", playlistId, accessToken ? "auth" : "guest"],
    queryFn: () => client.playlists.getById(playlistId!),
    enabled: Boolean(playlistId),
  });
}

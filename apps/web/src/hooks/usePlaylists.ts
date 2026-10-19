import { useQuery } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function usePlaylistsQueryOptions(pageSize = 20, ownerId?: string, enabled = true) {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);

  return {
    queryKey: ["playlists", pageSize, ownerId ?? null, accessToken ? "auth" : "guest"],
    queryFn: () => client.playlists.list({ page: 1, pageSize, ...(ownerId ? { ownerId } : {}) }),
    enabled: enabled && pageSize > 0,
  };
}

export function usePlaylists(pageSize = 20, ownerId?: string, enabled = true) {
  return useQuery(usePlaylistsQueryOptions(pageSize, ownerId, enabled));
}

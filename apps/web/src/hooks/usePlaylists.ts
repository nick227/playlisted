import { useQuery } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function usePlaylists(pageSize = 20, ownerId?: string) {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);

  return useQuery({
    queryKey: ["playlists", pageSize, ownerId ?? null, accessToken ? "auth" : "guest"],
    queryFn: () => client.playlists.list({ page: 1, pageSize, ...(ownerId ? { ownerId } : {}) }),
  });
}

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePlaylists(pageSize = 20, ownerId?: string) {
  return useQuery({
    queryKey: ["playlists", pageSize, ownerId ?? null],
    queryFn: () => api.playlists.list({ page: 1, pageSize, ...(ownerId ? { ownerId } : {}) }),
  });
}

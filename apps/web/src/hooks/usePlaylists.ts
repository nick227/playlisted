import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePlaylists(pageSize = 20) {
  return useQuery({
    queryKey: ["playlists", pageSize],
    queryFn: () => api.playlists.list({ page: 1, pageSize }),
  });
}

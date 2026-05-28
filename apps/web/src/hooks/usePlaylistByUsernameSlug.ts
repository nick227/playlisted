import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePlaylistByUsernameSlug(username: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["playlist", "canonical", username ?? null, slug ?? null],
    queryFn: () => api.users.getPlaylistByUsernameAndSlug(username!, slug!),
    enabled: Boolean(username && slug),
  });
}


import { useQuery } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function usePlaylistByUsernameSlug(username: string | undefined, slug: string | undefined) {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);

  return useQuery({
    queryKey: ["playlist", "canonical", username ?? null, slug ?? null, accessToken ? "auth" : "guest"],
    queryFn: () => client.users.getPlaylistByUsernameAndSlug(username!, slug!),
    enabled: Boolean(username && slug),
  });
}


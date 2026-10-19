import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function playlistByUsernameSlugQueryOptions(
  accessToken: string | null,
  username: string | undefined,
  slug: string | undefined,
) {
  const client = authedApi(accessToken);

  return {
    queryKey: ["playlist", "canonical", username ?? null, slug ?? null, accessToken ? "auth" : "guest"],
    queryFn: () => client.users.getPlaylistByUsernameAndSlug(username!, slug!),
    enabled: Boolean(username && slug),
  };
}

export function usePlaylistByUsernameSlugQueryOptions(username: string | undefined, slug: string | undefined) {
  const { accessToken } = useAuth();
  return playlistByUsernameSlugQueryOptions(accessToken, username, slug);
}

export function usePlaylistByUsernameSlug(username: string | undefined, slug: string | undefined) {
  return useQuery({
    ...usePlaylistByUsernameSlugQueryOptions(username, slug),
    placeholderData: keepPreviousData,
  });
}

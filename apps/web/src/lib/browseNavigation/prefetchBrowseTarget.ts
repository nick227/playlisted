import type { QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { authedApi } from "@/lib/authedApi";

import type { BrowseNeighbor } from "./types";

export async function prefetchBrowseTarget(
  queryClient: QueryClient,
  neighbor: BrowseNeighbor,
  accessToken: string | null,
): Promise<void> {
  if (neighbor.kind === "playlist" && neighbor.username && neighbor.slug) {
    const client = authedApi(accessToken);
    await queryClient.prefetchQuery({
      queryKey: [
        "playlist",
        "canonical",
        neighbor.username,
        neighbor.slug,
        accessToken ? "auth" : "guest",
      ],
      queryFn: () => client.users.getPlaylistByUsernameAndSlug(neighbor.username, neighbor.slug),
    });
    return;
  }

  if (neighbor.kind === "artist") {
    await queryClient.prefetchQuery({
      queryKey: ["user", "username", neighbor.username],
      queryFn: () => api.users.getByUsername(neighbor.username),
    });
  }
}

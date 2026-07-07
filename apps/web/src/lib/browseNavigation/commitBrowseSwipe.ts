import type { QueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";

import { authedApi } from "@/lib/authedApi";
import { api } from "@/lib/api";
import type { BeginSegmentOptions } from "@/lib/upNext/types";
import type { PlaybackContext, QueueTrack } from "@/providers/AudioPlayerProvider";

import { loadBrowseNeighborPlayback } from "./loadBrowseNeighborPlayback";
import { neighborAt } from "./neighborAt";
import { parseBrowseRoute } from "./parseBrowseRoute";
import { prefetchBrowseTarget } from "./prefetchBrowseTarget";
import { resolveArtistBrowseSequence } from "./resolveArtistNeighbors";
import { resolvePlaylistBrowseSequence } from "./resolvePlaylistNeighbors";
import type { BrowseNeighborsResult, SwipeDirection } from "./types";
import { BROWSE_SWIPE_NAVIGATION_STATE } from "./types";

type SetQueueFn = (
  tracks: QueueTrack[],
  startIndex?: number,
  context?: PlaybackContext,
  options?: BeginSegmentOptions,
) => void;

export async function resolveBrowseNeighborsForRoute(
  pathname: string,
  accessToken: string | null,
  queryClient: QueryClient,
): Promise<BrowseNeighborsResult | null> {
  const route = parseBrowseRoute(pathname);
  if (!route) return null;

  if (route.kind === "playlist") {
    const client = authedApi(accessToken);
    const playlist = await queryClient.fetchQuery({
      queryKey: ["playlist", "canonical", route.username, route.slug, accessToken ? "auth" : "guest"],
      queryFn: () => client.users.getPlaylistByUsernameAndSlug(route.username, route.slug),
    });
    return resolvePlaylistBrowseSequence(playlist);
  }

  const user = await queryClient.fetchQuery({
    queryKey: ["user", "username", route.username],
    queryFn: () => api.users.getByUsername(route.username),
  });
  return resolveArtistBrowseSequence(user.id);
}

export async function commitBrowseSwipe({
  direction,
  neighbors,
  accessToken,
  queryClient,
  navigate,
  setQueue,
  advancePlayback,
  preserveTheatreFocus = false,
}: {
  direction: SwipeDirection;
  neighbors: BrowseNeighborsResult;
  accessToken: string | null;
  queryClient: QueryClient;
  navigate: NavigateFunction;
  setQueue: SetQueueFn;
  advancePlayback: boolean;
  preserveTheatreFocus?: boolean;
}): Promise<"ok" | "end" | "empty"> {
  const target = neighborAt(neighbors, direction);
  if (!target) return "end";

  await prefetchBrowseTarget(queryClient, target, accessToken);

  if (advancePlayback) {
    const playback = await loadBrowseNeighborPlayback(target, accessToken);
    if (!playback || playback.tracks.length === 0) return "empty";
    setQueue(playback.tracks, 0, playback.context, playback.options);
  }

  navigate(target.href, {
    state: {
      intent: BROWSE_SWIPE_NAVIGATION_STATE,
      preserveTheatreFocus,
    },
  });

  return "ok";
}

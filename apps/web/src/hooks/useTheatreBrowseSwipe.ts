import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { parseBrowseRoute } from "@/lib/browseNavigation/parseBrowseRoute";
import {
  commitBrowseSwipe,
  resolveBrowseNeighborsForRoute,
} from "@/lib/browseNavigation/commitBrowseSwipe";
import { isPlaybackFocusInteractiveTarget } from "@/lib/playbackFocus/interactiveTarget";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { useHorizontalBrowseSwipeGesture } from "./useHorizontalBrowseSwipeGesture";

type UseTheatreBrowseSwipeOptions = {
  enabled: boolean;
  pathname: string;
  onReveal: () => void;
  onEdge: (message: string) => void;
};

export function useTheatreBrowseSwipe({
  enabled,
  pathname,
  onReveal,
  onEdge,
}: UseTheatreBrowseSwipeOptions) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { setQueue } = useAudioPlayer();

  const onCommit = useCallback(
    async (direction: "next" | "prev") => {
      const neighbors = await resolveBrowseNeighborsForRoute(pathname, accessToken, queryClient);
      if (!neighbors) return;

      const result = await commitBrowseSwipe({
        direction,
        neighbors,
        accessToken,
        queryClient,
        navigate,
        setQueue,
        advancePlayback: true,
        preserveTheatreFocus: true,
      });

      if (result === "end") {
        const route = parseBrowseRoute(pathname);
        onEdge(`No more ${route?.kind === "artist" ? "artists" : "playlists"}`);
      } else if (result === "empty") {
        onEdge("Nothing to play");
      }
    },
    [accessToken, navigate, onEdge, pathname, queryClient, setQueue],
  );

  return useHorizontalBrowseSwipeGesture({
    enabled,
    onCommit,
    onTap: onReveal,
    isExcludedTarget: isPlaybackFocusInteractiveTarget,
  });
}

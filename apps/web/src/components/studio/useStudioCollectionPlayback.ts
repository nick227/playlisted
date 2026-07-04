import type { PlaylistDetail } from "@playlisted/client-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { usePlaylist } from "@/hooks/usePlaylist";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

import type { StudioCollectionListItem } from "./studioCollectionUtils";

export function useStudioCollectionPlayback(playlist: StudioCollectionListItem) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const pendingPlayRef = useRef(false);
  const { data: detail } = usePlaylist(shouldFetch ? playlist.id : undefined);
  const { setQueue, togglePlay, playbackContext, state } = useAudioPlayer();

  const isActive = playbackContext.playlistId === playlist.id;
  const isPlaying = isActive && state === "playing";
  const isPaused = isActive && state === "paused";
  const canPlay = playlist.itemCount > 0;

  const startPlaying = useCallback(
    (pl: PlaylistDetail) => {
      if (!pl.recordings.length) return;
      const queue: QueueTrack[] = pl.recordings.map((recording) => ({
        ...recording,
        playlistTitle: pl.title,
        ownerName: pl.owner.displayName,
        artistImageUrl: pl.owner.avatarUrl,
      }));
      setQueue(
        queue,
        0,
        {
          playlistId: playlist.id,
          playlistOwnerUsername: playlist.owner.username,
          playlistSlug: playlist.slug,
          sourceContext: "studio-collections",
        },
        { segmentLabel: pl.title },
      );
    },
    [playlist.id, playlist.owner.username, playlist.slug, setQueue],
  );

  useEffect(() => {
    if (pendingPlayRef.current && detail?.recordings?.length) {
      pendingPlayRef.current = false;
      startPlaying(detail);
    }
  }, [detail, startPlaying]);

  const prefetch = useCallback(() => {
    if (canPlay && !shouldFetch) setShouldFetch(true);
  }, [canPlay, shouldFetch]);

  const handlePlay = useCallback(() => {
    if (!canPlay) return;
    if (isActive) {
      togglePlay();
      return;
    }
    if (!detail?.recordings?.length) {
      setShouldFetch(true);
      pendingPlayRef.current = true;
      return;
    }
    startPlaying(detail);
  }, [canPlay, isActive, detail, togglePlay, startPlaying]);

  return {
    handlePlay,
    prefetch,
    isActive,
    isPlaying,
    isPaused,
    canPlay,
    playLabel: isPlaying ? "Playing" : isPaused ? "Resume" : "Play",
  };
}

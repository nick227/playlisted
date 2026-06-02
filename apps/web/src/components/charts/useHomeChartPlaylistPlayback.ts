import type { TopPlaylistItem } from "@playlisted/client-sdk";
import { useCallback } from "react";

import { homeChartPlaylistOrigin } from "@/lib/playbackOrigin";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import {
  fetchPlaylistForPlayback,
  playlistRecordingsToQueue,
} from "./chartPlaylistPlayback";

export function useHomeChartPlaylistPlayback() {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, playbackContext, state } = useAudioPlayer();

  const isActive = useCallback(
    (playlistId: string) => playbackContext.playlistId === playlistId,
    [playbackContext.playlistId],
  );

  const isPlaying = useCallback(
    (playlistId: string) => isActive(playlistId) && state === "playing",
    [isActive, state],
  );

  const play = useCallback(
    async (item: TopPlaylistItem) => {
      if (isActive(item.playlistId)) {
        togglePlay();
        return;
      }

      const detail = await fetchPlaylistForPlayback(accessToken, item.playlistId);
      const recordings = detail?.recordings ?? [];
      if (recordings.length === 0) return;

      const tracks = playlistRecordingsToQueue(recordings, {
        playlistTitle: item.title,
        ownerName: item.owner.displayName,
      });

      setQueue(
        tracks,
        0,
        {
          playlistId: item.playlistId,
          playlistOwnerUsername: item.owner.username,
          playlistSlug: item.slug,
          sourceContext: "charts",
        },
        {
          segmentLabel: item.title,
          playbackOrigin: homeChartPlaylistOrigin(item.playlistId),
        },
      );
    },
    [accessToken, isActive, setQueue, togglePlay],
  );

  return { play, isActive, isPlaying };
}

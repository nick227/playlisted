import type { TopArtistItem } from "@playlisted/client-sdk";
import { useCallback } from "react";

import { api } from "@/lib/api";
import { homeChartArtistOrigin } from "@/lib/playbackOrigin";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import {
  fetchPlaylistForPlayback,
  pickArtistProfilePlaylist,
  playlistRecordingsToQueue,
} from "./chartPlaylistPlayback";

export function useHomeChartArtistPlayback() {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, activeOriginKey, state } = useAudioPlayer();

  const isActive = useCallback(
    (userId: string) => activeOriginKey === homeChartArtistOrigin(userId),
    [activeOriginKey],
  );

  const isPlaying = useCallback(
    (userId: string) => isActive(userId) && state === "playing",
    [isActive, state],
  );

  const play = useCallback(
    async (item: TopArtistItem) => {
      const origin = homeChartArtistOrigin(item.userId);
      if (isActive(item.userId)) {
        togglePlay();
        return;
      }

      const user = await api.users.getByUsername(item.username);
      const summary = pickArtistProfilePlaylist(user.publicPlaylists);
      if (!summary) return;

      const detail = await fetchPlaylistForPlayback(accessToken, summary.id);
      const recordings = detail?.recordings ?? [];
      if (recordings.length === 0) return;

      const tracks = playlistRecordingsToQueue(recordings, {
        playlistTitle: summary.title,
        ownerName: item.displayName,
      });

      setQueue(
        tracks,
        0,
        {
          playlistId: summary.id,
          playlistOwnerUsername: item.username,
          playlistSlug: summary.slug,
          sourceContext: "charts",
        },
        {
          segmentLabel: item.displayName,
          playbackOrigin: origin,
        },
      );
    },
    [accessToken, isActive, setQueue, togglePlay],
  );

  return { play, isActive, isPlaying };
}

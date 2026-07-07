import type { PlaylistSummary } from "@playlisted/client-sdk";
import { useCallback } from "react";

import {
  fetchPlaylistForPlayback,
  playlistRecordingsToQueue,
} from "@/components/charts/chartPlaylistPlayback";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

function libraryPlaylistOrigin(playlistId: string) {
  return `library:playlist:${playlistId}`;
}

export function useLibraryPlaylistPlayback() {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, playbackContext, activeOriginKey, state } = useAudioPlayer();

  const isActive = useCallback(
    (playlistId: string) =>
      playbackContext.playlistId === playlistId && activeOriginKey === libraryPlaylistOrigin(playlistId),
    [playbackContext.playlistId, activeOriginKey],
  );

  const isPlaying = useCallback(
    (playlistId: string) => isActive(playlistId) && state === "playing",
    [isActive, state],
  );

  const play = useCallback(
    async (playlist: PlaylistSummary) => {
      const origin = libraryPlaylistOrigin(playlist.id);
      if (isActive(playlist.id)) {
        togglePlay();
        return;
      }

      const detail = await fetchPlaylistForPlayback(accessToken, playlist.id);
      const recordings = detail?.recordings ?? [];
      if (recordings.length === 0) return;

      const tracks = playlistRecordingsToQueue(recordings, {
        playlistTitle: playlist.title,
        ownerName: playlist.owner.displayName,
        artistImageUrl: playlist.owner.avatarUrl,
      });

      setQueue(
        tracks,
        0,
        {
          playlistId: playlist.id,
          playlistOwnerUsername: playlist.owner.username,
          playlistSlug: playlist.slug,
          sourceContext: "library",
        },
        {
          segmentLabel: playlist.title,
          playbackOrigin: origin,
          originScope: "playlist",
        },
      );
    },
    [accessToken, isActive, setQueue, togglePlay],
  );

  return { play, isActive, isPlaying };
}

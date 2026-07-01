import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import { useCallback } from "react";

import { api } from "@/lib/api";
import {
  chartsPageArtistOrigin,
  chartsPagePlaylistOrigin,
  chartsPageSongOrigin,
} from "@/lib/playbackOrigin";
import { chartItemPlaybackContext, topSongToQueueTrack } from "@/lib/queueTrack";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import {
  fetchPlaylistForPlayback,
  pickArtistProfilePlaylist,
  playlistRecordingsToQueue,
} from "./chartPlaylistPlayback";

const SEGMENT_LABEL = "Charts";

export function useChartsPageSongPlayback() {
  const { playTrack, currentTrack, activeOriginKey, togglePlay } = useAudioPlayer();

  const play = useCallback(
    (item: TopSongItem, siblings: TopSongItem[]) => {
      const origin = chartsPageSongOrigin(item.recordingId);
      if (currentTrack?.id === item.recordingId && activeOriginKey === origin) {
        togglePlay();
        return;
      }
      const idx = siblings.findIndex((s) => s.recordingId === item.recordingId);
      if (idx < 0) return;
      const tracks = siblings.map((s) => topSongToQueueTrack(s, SEGMENT_LABEL));
      playTrack(topSongToQueueTrack(item, SEGMENT_LABEL), tracks, chartItemPlaybackContext(item), {
        segmentLabel: SEGMENT_LABEL,
        playbackOrigin: origin,
        originScope: "track",
      });
    },
    [activeOriginKey, currentTrack?.id, playTrack, togglePlay],
  );

  return { play };
}

export function useChartsPagePlaylistPlayback() {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, playbackContext, activeOriginKey, state } = useAudioPlayer();

  const isActive = useCallback(
    (playlistId: string) =>
      playbackContext.playlistId === playlistId &&
      activeOriginKey === chartsPagePlaylistOrigin(playlistId),
    [playbackContext.playlistId, activeOriginKey],
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
          playbackOrigin: chartsPagePlaylistOrigin(item.playlistId),
          originScope: "playlist",
        },
      );
    },
    [accessToken, isActive, setQueue, togglePlay],
  );

  return { play, isActive, isPlaying };
}

export function useChartsPageArtistPlayback() {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, activeOriginKey, state } = useAudioPlayer();

  const isActive = useCallback(
    (userId: string) => activeOriginKey === chartsPageArtistOrigin(userId),
    [activeOriginKey],
  );

  const isPlaying = useCallback(
    (userId: string) => isActive(userId) && state === "playing",
    [isActive, state],
  );

  const play = useCallback(
    async (item: TopArtistItem) => {
      const origin = chartsPageArtistOrigin(item.userId);
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
          originScope: "artist",
        },
      );
    },
    [accessToken, isActive, setQueue, togglePlay],
  );

  return { play, isActive, isPlaying };
}

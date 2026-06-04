import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import { useCallback } from "react";

import {
  fetchPlaylistForPlayback,
  pickArtistProfilePlaylist,
  playlistRecordingsToQueue,
} from "@/components/charts/chartPlaylistPlayback";
import {
  homeBentoArtistOrigin,
  homeBentoPlaylistOrigin,
  homeBentoSongOrigin,
} from "@/lib/playbackOrigin";
import { chartItemPlaybackContext, topSongToQueueTrack } from "@/lib/queueTrack";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

const BENTO_SONG_LABEL = "Home bento — Songs";
const BENTO_PLAYLIST_LABEL = "Home bento — Playlists";
const BENTO_ARTIST_LABEL = "Home bento — Artists";

export function useHomeBentoSongPlayback() {
  const { playTrack, currentTrack, activeOriginKey, togglePlay } = useAudioPlayer();

  function play(item: TopSongItem, siblings: TopSongItem[]) {
    const origin = homeBentoSongOrigin(item.recordingId);
    if (currentTrack?.id === item.recordingId && activeOriginKey === origin) {
      togglePlay();
      return;
    }
    const idx = siblings.findIndex((s) => s.recordingId === item.recordingId);
    if (idx < 0) return;
    const tracks = siblings.map((s) => topSongToQueueTrack(s, BENTO_SONG_LABEL));
    playTrack(topSongToQueueTrack(item, BENTO_SONG_LABEL), tracks, chartItemPlaybackContext(item), {
      segmentLabel: BENTO_SONG_LABEL,
      playbackOrigin: origin,
      originScope: "track",
    });
  }

  return { play };
}

export function useHomeBentoPlaylistPlayback() {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, playbackContext, activeOriginKey, state } = useAudioPlayer();

  const isActive = useCallback(
    (playlistId: string) =>
      playbackContext.playlistId === playlistId &&
      activeOriginKey === homeBentoPlaylistOrigin(playlistId),
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
          sourceContext: "home",
        },
        {
          segmentLabel: BENTO_PLAYLIST_LABEL,
          playbackOrigin: homeBentoPlaylistOrigin(item.playlistId),
          originScope: "playlist",
        },
      );
    },
    [accessToken, isActive, setQueue, togglePlay],
  );

  return { play, isActive, isPlaying };
}

export function useHomeBentoArtistPlayback() {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, activeOriginKey, state } = useAudioPlayer();

  const isActive = useCallback(
    (userId: string) => activeOriginKey === homeBentoArtistOrigin(userId),
    [activeOriginKey],
  );

  const isPlaying = useCallback(
    (userId: string) => isActive(userId) && state === "playing",
    [isActive, state],
  );

  const play = useCallback(
    async (item: TopArtistItem) => {
      const origin = homeBentoArtistOrigin(item.userId);
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
          sourceContext: "home",
        },
        {
          segmentLabel: BENTO_ARTIST_LABEL,
          playbackOrigin: origin,
          originScope: "artist",
        },
      );
    },
    [accessToken, isActive, setQueue, togglePlay],
  );

  return { play, isActive, isPlaying };
}

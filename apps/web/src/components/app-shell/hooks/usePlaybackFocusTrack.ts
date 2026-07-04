import { useEffect, useMemo, useRef } from "react";

import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

import type { PlaybackFocusTrack } from "../PlaybackFocusLayer";

/** Resolves the active playback focus track from site player or radio. */
export function usePlaybackFocusTrack() {
  const {
    currentTrack,
    isPlaying,
    playbackContext,
  } = useAudioPlayer();
  const {
    playing: radioPlaying,
    nowPlaying: radioNowPlaying,
    audioRef: radioAudioRef,
  } = useRadioPlayer();
  const { currentTime: siteCurrentTime } = usePlaybackTransport();
  const currentTimeMsRef = useRef(0);

  useEffect(() => {
    if (radioPlaying && radioNowPlaying) {
      const audio = radioAudioRef.current;
      currentTimeMsRef.current = (audio?.currentTime ?? radioNowPlaying.elapsedSeconds ?? 0) * 1000;
      return;
    }
    currentTimeMsRef.current = siteCurrentTime * 1000;
  }, [radioAudioRef, radioNowPlaying, radioPlaying, siteCurrentTime]);

  const focusTrack = useMemo<PlaybackFocusTrack | null>(() => {
    if (radioPlaying && radioNowPlaying) {
      return {
        id: radioNowPlaying.id,
        title: radioNowPlaying.title,
        artworkUrl: radioNowPlaying.artworkUrl,
        ownerName: radioNowPlaying.uploader.displayName,
        ownerUsername: radioNowPlaying.uploader.username,
        playlistId: radioNowPlaying.playlist.id,
        playlistTitle: radioNowPlaying.playlist.title,
        playlistSlug: radioNowPlaying.playlist.slug,
        sourceLabel: "Radio",
        sourceHref: "/radio",
      };
    }

    if (isPlaying && currentTrack) {
      return {
        id: currentTrack.id,
        title: currentTrack.title,
        artworkUrl: currentTrack.artworkUrl,
        ownerName: currentTrack.ownerName,
        ownerUsername: currentTrack.ownerUsername ?? playbackContext.playlistOwnerUsername,
        playlistId: playbackContext.playlistId ?? currentTrack.publishedPlaylistId ?? null,
        playlistTitle: currentTrack.playlistTitle,
        playlistSlug: currentTrack.playlistSlug ?? playbackContext.playlistSlug,
      };
    }

    return null;
  }, [currentTrack, isPlaying, playbackContext, radioNowPlaying, radioPlaying]);

  const focusTrackKey = `${focusTrack?.sourceLabel ?? "player"}:${focusTrack?.id ?? "none"}`;

  return {
    focusTrack,
    focusTrackKey,
    playFocusActive: Boolean(focusTrack),
    currentTimeMsRef,
    radioPlaying,
    radioNowPlaying,
  };
}

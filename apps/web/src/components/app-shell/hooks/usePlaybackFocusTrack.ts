import { useEffect, useMemo, useRef, useState } from "react";

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

  const [activeSource, setActiveSource] = useState<"radio" | "site" | null>(() => {
    if (radioPlaying) return "radio";
    if (isPlaying) return "site";
    return currentTrack ? "site" : radioNowPlaying ? "radio" : null;
  });

  useEffect(() => {
    if (radioPlaying) setActiveSource("radio");
    else if (isPlaying) setActiveSource("site");
  }, [radioPlaying, isPlaying]);

  useEffect(() => {
    if (activeSource === "radio" && radioNowPlaying) {
      const audio = radioAudioRef.current;
      currentTimeMsRef.current = (audio?.currentTime ?? radioNowPlaying.elapsedSeconds ?? 0) * 1000;
      return;
    }
    currentTimeMsRef.current = siteCurrentTime * 1000;
  }, [activeSource, radioAudioRef, radioNowPlaying, siteCurrentTime]);

  const focusTrack = useMemo<PlaybackFocusTrack | null>(() => {
    const source = activeSource || (currentTrack ? "site" : radioNowPlaying ? "radio" : null);

    if (source === "radio" && radioNowPlaying) {
      return {
        id: radioNowPlaying.id,
        title: radioNowPlaying.title,
        source: "radio",
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

    if (source === "site" && currentTrack) {
      return {
        id: currentTrack.id,
        title: currentTrack.title,
        source: "site",
        artworkUrl: currentTrack.artworkUrl,
        ownerName: currentTrack.ownerName,
        ownerUsername: currentTrack.ownerUsername ?? playbackContext.playlistOwnerUsername,
        playlistId: playbackContext.playlistId ?? currentTrack.publishedPlaylistId ?? null,
        playlistTitle: currentTrack.playlistTitle,
        playlistSlug: currentTrack.playlistSlug ?? playbackContext.playlistSlug,
      };
    }

    return null;
  }, [activeSource, currentTrack, playbackContext, radioNowPlaying]);

  const focusTrackKey = `${focusTrack?.sourceLabel ?? "player"}:${focusTrack?.id ?? "none"}`;

  return {
    focusTrack,
    focusTrackKey,
    playFocusActive: isPlaying || radioPlaying,
    currentTimeMsRef,
    radioPlaying,
    radioNowPlaying,
  };
}

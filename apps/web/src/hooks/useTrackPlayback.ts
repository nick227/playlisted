import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

/** Shared play/pause UI state for a single track (homepage rows, chart cards, playlist rows, bottom player). */
export function useTrackPlayback(trackId: string | undefined, originKey?: string) {
  const { currentTrack, activeOriginKey, isPlaying: playerIsPlaying, state } = useAudioPlayer();

  const trackMatches = Boolean(trackId && currentTrack?.id === trackId);
  const isActive =
    originKey !== undefined
      ? trackMatches && activeOriginKey === originKey
      : trackMatches && activeOriginKey == null;
  const isPlaying = isActive && playerIsPlaying;
  const isPaused = isActive && state === "paused";

  return { isActive, isPlaying, isPaused, playerIsPlaying };
}

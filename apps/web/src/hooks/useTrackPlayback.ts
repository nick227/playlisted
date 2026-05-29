import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

/** Shared play/pause UI state for a single track (homepage rows, chart cards, playlist rows, bottom player). */
export function useTrackPlayback(trackId: string | undefined) {
  const { currentTrack, isPlaying: playerIsPlaying, state } = useAudioPlayer();

  const isActive = Boolean(trackId && currentTrack?.id === trackId);
  const isPlaying = isActive && playerIsPlaying;
  const isPaused = isActive && state === "paused";

  return { isActive, isPlaying, isPaused, playerIsPlaying };
}

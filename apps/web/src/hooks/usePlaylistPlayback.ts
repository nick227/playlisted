import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

/** Playlist play UI — pass originKey on homepage so only the clicked card/row is active. */
export function usePlaylistPlayback(playlistId: string | undefined, originKey?: string) {
  const { playbackContext, activeOriginKey, state, isPlaying: playerIsPlaying } = useAudioPlayer();

  const playlistMatches = Boolean(playlistId && playbackContext.playlistId === playlistId);
  const isActive =
    originKey !== undefined
      ? playlistMatches && activeOriginKey === originKey
      : playlistMatches && activeOriginKey == null;
  const isPlaying = isActive && playerIsPlaying;
  const isPaused = isActive && state === "paused";

  return { isActive, isPlaying, isPaused, playerIsPlaying };
}

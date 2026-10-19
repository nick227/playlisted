type PlaybackArtworkInput = {
  track: { source: "site" | "radio"; artworkUrl?: string | null } | null;
  playerState: string;
  radioHasPlaybackSession: boolean;
};

/** Pause/loading retain artwork; closing or exhausting a session clears it. */
export function resolvePlaybackArtwork({ track, playerState, radioHasPlaybackSession }: PlaybackArtworkInput): string | null {
  if (!track) return null;
  const sessionActive = track.source === "radio" ? radioHasPlaybackSession : playerState !== "idle";
  return sessionActive ? track.artworkUrl ?? null : null;
}

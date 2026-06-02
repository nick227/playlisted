/** Stable keys identifying which UI element started the current playback segment. */
export function playbackOriginKey(...parts: (string | number)[]): string {
  return parts.map(String).join(":");
}

export function homeChartSongOrigin(sectionKey: string, recordingId: string): string {
  return playbackOriginKey("home", "chart", sectionKey, recordingId);
}

export function homeChartPlaylistOrigin(playlistId: string): string {
  return playbackOriginKey("home", "chart", "top-playlists", playlistId);
}

export function homeChartArtistOrigin(userId: string): string {
  return playbackOriginKey("home", "chart", "top-artists", userId);
}

export function homeSpotlightTrackOrigin(playlistId: string, recordingId: string): string {
  return playbackOriginKey("home", "spotlight", playlistId, recordingId);
}

export function homeGenreSongOrigin(genreSlug: string, recordingId: string): string {
  return playbackOriginKey("home", "genre", genreSlug, recordingId);
}

/** Move the active origin to another track in the same UI section (queue next/prev). */
export function shiftPlaybackOriginTrack(origin: string | null, nextTrackId: string): string | null {
  if (!origin) return null;
  const lastColon = origin.lastIndexOf(":");
  if (lastColon < 0) return null;
  return `${origin.slice(0, lastColon + 1)}${nextTrackId}`;
}

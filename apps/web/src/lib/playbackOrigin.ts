import type { PlaybackOriginScope } from "@/lib/playbackSurface";

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

export function homeGridPlaylistOrigin(sectionKey: string, playlistId: string): string {
  return playbackOriginKey("home", "grid", sectionKey, playlistId);
}

export function homeBentoSongOrigin(recordingId: string): string {
  return playbackOriginKey("home", "bento", "songs", recordingId);
}

export function homeBentoPlaylistOrigin(playlistId: string): string {
  return playbackOriginKey("home", "bento", "playlists", playlistId);
}

export function homeBentoArtistOrigin(userId: string): string {
  return playbackOriginKey("home", "bento", "artists", userId);
}

export function homeSpotlightTrackOrigin(playlistId: string, recordingId: string): string {
  return playbackOriginKey("home", "spotlight", playlistId, recordingId);
}

export function homeGenreSongOrigin(genreSlug: string, recordingId: string): string {
  return playbackOriginKey("home", "genre", genreSlug, recordingId);
}

export function artistProfileTrackOrigin(playlistId: string, recordingId: string): string {
  return playbackOriginKey("artist-profile", "playlist", playlistId, recordingId);
}

/** Advance track-scoped origins on queue next/prev; playlist/artist origins stay fixed. */
export function shiftPlaybackOriginForTrack(
  origin: string | null,
  scope: PlaybackOriginScope | null,
  nextTrackId: string,
): string | null {
  if (!origin || scope !== "track") return origin;
  const lastColon = origin.lastIndexOf(":");
  if (lastColon < 0) return origin;
  return `${origin.slice(0, lastColon + 1)}${nextTrackId}`;
}

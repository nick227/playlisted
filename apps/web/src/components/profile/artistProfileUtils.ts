import type { LibrarySong } from "@playlisted/client-sdk";

export function computeArtistStreams(tracks: LibrarySong[]): number {
  return tracks.reduce((sum, track) => sum + (track.playCount ?? 0), 0);
}

export function computePlaylistStreams(
  recordings: { playCount?: number | null }[],
): number {
  return recordings.reduce((sum, track) => sum + (track.playCount ?? 0), 0);
}

import type { LibrarySong, UserDetail } from "@playlisted/client-sdk";

type ProfilePlaylist = UserDetail["publicPlaylists"][number];

/** "More Artists" row: the route loads it alongside the user so short profiles don't grow at the fold. */
export const ARTIST_PROFILE_RELATED_RANGE = "30d";
export const ARTIST_PROFILE_RELATED_LIMIT = 12;

/** Collection panels the profile route waits for; the rest stream in below the fold. */
export const ARTIST_PROFILE_HELD_PANEL_COUNT = 2;

/** Pinned first, then newest release. */
export function sortProfilePlaylists(playlists: ProfilePlaylist[]): ProfilePlaylist[] {
  return [...playlists].sort((a, b) => {
    if (a.isPinnedOnProfile !== b.isPinnedOnProfile) return a.isPinnedOnProfile ? -1 : 1;
    const aDate = a.publishedAt ?? a.createdAt;
    const bDate = b.publishedAt ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

export function computeArtistStreams(tracks: LibrarySong[]): number {
  return tracks.reduce((sum, track) => sum + (track.playCount ?? 0), 0);
}

export function computePlaylistStreams(
  recordings: { playCount?: number | null }[],
): number {
  return recordings.reduce((sum, track) => sum + (track.playCount ?? 0), 0);
}

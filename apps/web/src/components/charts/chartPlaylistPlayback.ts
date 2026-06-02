import type { components } from "@playlisted/client-sdk";

import { authedApi } from "@/lib/authedApi";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";

type PlaylistDetail = components["schemas"]["PlaylistDetail"];
type UserPlaylistSummary = components["schemas"]["UserPlaylistSummary"];

export function playlistRecordingsToQueue(
  recordings: PlaylistDetail["recordings"],
  meta: { playlistTitle: string; ownerName: string },
): QueueTrack[] {
  return (recordings ?? []).map((recording) => ({
    ...recording,
    playlistTitle: meta.playlistTitle,
    ownerName: meta.ownerName,
  }));
}

export async function fetchPlaylistForPlayback(
  accessToken: string | null,
  playlistId: string,
): Promise<PlaylistDetail | null> {
  try {
    return await authedApi(accessToken).playlists.getById(playlistId);
  } catch {
    return null;
  }
}

/** Profile / chart artist play: pinned collection first, else largest public playlist. */
export function pickArtistProfilePlaylist(
  playlists: UserPlaylistSummary[],
): UserPlaylistSummary | null {
  if (playlists.length === 0) return null;
  const pinned = playlists.find((p) => p.isPinnedOnProfile);
  if (pinned && pinned.itemCount > 0) return pinned;
  const sorted = [...playlists].sort((a, b) => b.itemCount - a.itemCount);
  return sorted.find((p) => p.itemCount > 0) ?? sorted[0] ?? null;
}

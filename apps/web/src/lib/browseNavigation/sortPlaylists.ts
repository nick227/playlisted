import type { PlaylistSummary } from "@playlisted/client-sdk";

export function sortPublishedPlaylists(playlists: PlaylistSummary[]): PlaylistSummary[] {
  return [...playlists].sort((a, b) => {
    if (a.isPinnedOnProfile !== b.isPinnedOnProfile) return a.isPinnedOnProfile ? -1 : 1;
    const aDate = a.publishedAt ?? a.createdAt;
    const bDate = b.publishedAt ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

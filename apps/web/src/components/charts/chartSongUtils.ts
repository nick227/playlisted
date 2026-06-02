import type { TopSongItem } from "@playlisted/client-sdk";

import { playlistPath, profilePath } from "@/lib/routes";
import { recordingShareUrl } from "@/lib/shareContent";

export function topSongPanelHref(item: TopSongItem): string {
  return `${playlistPath({
    id: item.publishedPlaylistId,
    username: item.playlist.owner.username,
    slug: item.playlist.slug,
  })}#track-${item.recordingId}`;
}

export function topSongPanelShareUrl(item: TopSongItem): string {
  return recordingShareUrl({
    playlistId: item.playlist.id,
    recordingId: item.recordingId,
    username: item.playlist.owner.username,
    slug: item.playlist.slug,
  });
}

export function topSongPanelSubtitleHref(item: TopSongItem): string {
  return profilePath(item.uploader.username);
}

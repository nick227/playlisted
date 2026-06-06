import type { TopSongItem } from "@playlisted/client-sdk";

import { playlistRecordingPath, profilePath } from "@/lib/routes";
import { recordingShareUrl } from "@/lib/shareContent";

export function topSongPanelHref(item: TopSongItem): string {
  return playlistRecordingPath(
    {
      id: item.publishedPlaylistId,
      username: item.playlist.owner.username,
      slug: item.playlist.slug,
    },
    { title: item.title },
  );
}

export function topSongPanelShareUrl(item: TopSongItem): string {
  return recordingShareUrl({
    playlistId: item.playlist.id,
    recordingId: item.recordingId,
    title: item.title,
    username: item.playlist.owner.username,
    slug: item.playlist.slug,
  });
}

export function topSongPanelSubtitleHref(item: TopSongItem): string {
  return profilePath(item.uploader.username);
}

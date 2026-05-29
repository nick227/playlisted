import type { components, LibrarySong, TopSongItem } from "@playlisted/client-sdk";

import { recordingShareUrl } from "@/lib/shareContent";
import type { PlaybackContext, QueueTrack } from "@/providers/AudioPlayerProvider";

type RecordingSummary = components["schemas"]["RecordingSummary"];

export function librarySongToQueueTrack(song: LibrarySong, context?: string): QueueTrack {
  return {
    ...song,
    ownerName: song.uploader.displayName,
    playlistTitle: context ?? song.playlist.title,
  };
}

export function topSongToQueueTrack(item: TopSongItem, context?: string): QueueTrack {
  return {
    id: item.recordingId,
    uploaderId: item.uploaderId,
    publishedPlaylistId: item.publishedPlaylistId,
    title: item.title,
    audioUrl: item.audioUrl,
    durationSeconds: item.durationSeconds ?? null,
    artworkUrl: item.artworkUrl ?? null,
    recordingType: item.recordingType,
    visibility: item.visibility,
    status: item.status,
    explicit: item.explicit,
    playCount: item.playCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ownerName: item.uploader.displayName,
    playlistTitle: context ?? item.playlist.title,
  };
}

export function chartItemPlaybackContext(item: TopSongItem): PlaybackContext {
  return {
    sourceContext: "charts",
    playlistId: item.playlist.id,
    playlistSlug: item.playlist.slug,
    playlistOwnerUsername: item.uploader.username,
  };
}

export function recordingSummaryToQueueTrack(
  recording: RecordingSummary,
  context?: { playlistTitle?: string; ownerName?: string },
): QueueTrack {
  return {
    ...recording,
    ownerName: context?.ownerName,
    playlistTitle: context?.playlistTitle,
  };
}

export function personalTrackToQueueTrack(
  track: RecordingSummary & { uploader: { displayName: string } },
): QueueTrack {
  return {
    ...track,
    ownerName: track.uploader.displayName,
  };
}

export type PlaylistTrackContext = {
  playlistId: string;
  playlistTitle: string;
  ownerUsername: string;
  ownerDisplayName: string;
  slug: string;
};

export function recordingShareUrlForContext(
  recordingId: string,
  playlist: Pick<PlaylistTrackContext, "playlistId" | "ownerUsername" | "slug">,
): string {
  return recordingShareUrl({
    playlistId: playlist.playlistId,
    recordingId,
    username: playlist.ownerUsername,
    slug: playlist.slug,
  });
}

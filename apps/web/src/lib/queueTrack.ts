import type { components, LibrarySong, TopSongItem } from "@playlisted/client-sdk";

import { recordingShareUrl } from "@/lib/shareContent";
import type { PlaybackContext, QueueTrack } from "@/providers/AudioPlayerProvider";

type RecordingSummary = components["schemas"]["RecordingSummary"];

export function librarySongToQueueTrack(song: LibrarySong, context?: string): QueueTrack {
  return {
    ...song,
    ownerName: song.uploader.displayName,
    ownerUsername: song.uploader.username,
    playlistTitle: context ?? song.playlist.title,
    playlistSlug: song.playlist.slug,
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
    ownerUsername: item.uploader.username,
    playlistTitle: context ?? item.playlist.title,
    playlistSlug: item.playlist.slug,
  };
}

export function chartItemPlaybackContext(item: TopSongItem): PlaybackContext {
  return {
    sourceContext: "charts",
    playlistId: item.playlist.id,
    playlistSlug: item.playlist.slug,
    playlistOwnerUsername: item.playlist.owner.username,
  };
}

export function recordingSummaryToQueueTrack(
  recording: RecordingSummary,
  context?: { playlistTitle?: string; ownerName?: string; ownerUsername?: string; playlistSlug?: string },
): QueueTrack {
  return {
    ...recording,
    ownerName: context?.ownerName,
    ownerUsername: context?.ownerUsername,
    playlistTitle: context?.playlistTitle,
    playlistSlug: context?.playlistSlug,
  };
}

export function personalTrackToQueueTrack(
  track: RecordingSummary & { uploader: { displayName: string; username?: string }; playlist?: { slug?: string } },
): QueueTrack {
  return {
    ...track,
    ownerName: track.uploader.displayName,
    ownerUsername: track.uploader.username,
    playlistSlug: track.playlist?.slug,
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

import type { LibrarySong, TopSongItem } from "@playlisted/client-sdk";

import type { PlaybackContext, QueueTrack } from "@/providers/AudioPlayerProvider";

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

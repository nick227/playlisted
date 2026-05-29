import type { PlaylistDetail } from "@playlisted/client-sdk";

import type { QueueTrack, SegmentPlaybackContext } from "./types";

export function playlistDetailToQueueTracks(playlist: PlaylistDetail): QueueTrack[] {
  return playlist.recordings
    .filter((recording) => recording.status === "PUBLISHED" && Boolean(recording.audioUrl))
    .map((recording) => ({
      ...recording,
      playlistTitle: playlist.title,
      ownerName: playlist.owner.displayName,
    }));
}

export function playbackContextForPlaylist(playlist: PlaylistDetail): SegmentPlaybackContext {
  return {
    playlistId: playlist.id,
    playlistOwnerUsername: playlist.owner.username,
    playlistSlug: playlist.slug,
    sourceContext: "up-next",
  };
}

import type { PlaylistDetail } from "@playlisted/client-sdk";

import { withQueueTrackSubtitleStyle } from "@/lib/queueTrack";
import type { QueueTrack, SegmentPlaybackContext } from "./types";

export function playlistDetailToQueueTracks(playlist: PlaylistDetail): QueueTrack[] {
  return playlist.recordings
    .filter((recording) => recording.status === "PUBLISHED" && Boolean(recording.audioUrl))
    .map((recording) =>
      withQueueTrackSubtitleStyle({
        ...recording,
        playlistTitle: playlist.title,
        ownerName: playlist.owner.displayName,
        artistImageUrl: playlist.owner.avatarUrl,
      }),
    );
}

export function playbackContextForPlaylist(playlist: PlaylistDetail): SegmentPlaybackContext {
  return {
    playlistId: playlist.id,
    playlistOwnerUsername: playlist.owner.username,
    playlistSlug: playlist.slug,
    sourceContext: "up-next",
  };
}

import {
  fetchPlaylistForPlayback,
  pickArtistProfilePlaylist,
  playlistRecordingsToQueue,
} from "@/components/charts/chartPlaylistPlayback";
import { authedApi } from "@/lib/authedApi";
import { api } from "@/lib/api";
import { artistProfileArtistOrigin } from "@/lib/playbackOrigin";
import { playbackContextForPlaylist, playlistDetailToQueueTracks } from "@/lib/upNext/playlistTracks";
import type { BeginSegmentOptions } from "@/lib/upNext/types";
import type { PlaybackContext, QueueTrack } from "@/providers/AudioPlayerProvider";

import type { BrowseNeighbor } from "./types";

export type BrowseNeighborPlayback = {
  tracks: QueueTrack[];
  context: PlaybackContext;
  options: BeginSegmentOptions;
};

export async function loadBrowseNeighborPlayback(
  neighbor: BrowseNeighbor,
  accessToken: string | null,
): Promise<BrowseNeighborPlayback | null> {
  if (neighbor.kind === "playlist") {
    const client = authedApi(accessToken);
    const playlist = await client.users.getPlaylistByUsernameAndSlug(neighbor.username, neighbor.slug);
    const tracks = playlistDetailToQueueTracks(playlist);
    if (tracks.length === 0) return null;

    return {
      tracks,
      context: {
        ...playbackContextForPlaylist(playlist),
        sourceContext: "playlist",
      },
      options: { segmentLabel: playlist.title },
    };
  }

  const user = await api.users.getByUsername(neighbor.username);
  const summary = pickArtistProfilePlaylist(user.publicPlaylists);
  if (!summary) return null;

  const detail = await fetchPlaylistForPlayback(accessToken, summary.id);
  const recordings = detail?.recordings ?? [];
  if (recordings.length === 0) return null;

  const tracks = playlistRecordingsToQueue(recordings, {
    playlistTitle: summary.title,
    ownerName: user.displayName,
    artistImageUrl: user.avatarUrl,
  });

  return {
    tracks,
    context: {
      playlistId: summary.id,
      playlistOwnerUsername: user.username,
      playlistSlug: summary.slug,
      sourceContext: "artist-profile",
    },
    options: {
      segmentLabel: user.displayName,
      playbackOrigin: artistProfileArtistOrigin(user.id),
      originScope: "artist",
    },
  };
}

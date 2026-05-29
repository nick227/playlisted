import { hydratePlaylistSegment } from "./resolveAutopilot";
import { playbackContextForPlaylist, playlistDetailToQueueTracks } from "./playlistTracks";
import { resolveAutopilotSegment } from "./resolveAutopilot";
import type { QueueTrack, SegmentPlaybackContext, UpNextSegment } from "./types";

export type HydratedSegment = {
  tracks: QueueTrack[];
  context: SegmentPlaybackContext;
  playlistId?: string;
};

export async function hydrateUpNextSegment(
  segment: UpNextSegment,
  playedIds: Set<string>,
): Promise<HydratedSegment | null> {
  if (segment.kind === "tracks") {
    const tracks = segment.tracks.filter((t) => Boolean(t.audioUrl));
    if (tracks.length === 0) return null;
    return {
      tracks,
      context: segment.context ?? { sourceContext: "up-next" },
    };
  }

  if (segment.kind === "playlist") {
    const detail = await hydratePlaylistSegment(segment);
    if (!detail) return null;
    const tracks = playlistDetailToQueueTracks(detail);
    if (tracks.length === 0) return null;
    return {
      tracks,
      context: playbackContextForPlaylist(detail),
      playlistId: detail.id,
    };
  }

  const resolved = await resolveAutopilotSegment(segment, playedIds);
  if (!resolved || resolved.kind === "autopilot") return null;
  return hydrateUpNextSegment(resolved, playedIds);
}

import { resolveRecordingArtworkUrl } from "./mediaUrls.js";

export function mapPlaybackHistoryItem(event: {
  id: bigint;
  recordingId: string;
  playlistId: string | null;
  sourceContext: string | null;
  playedSeconds: number | null;
  completed: boolean;
  createdAt: Date;
  recording: {
    id: string;
    uploaderId: string;
    publishedPlaylistId: string;
    title: string;
    description: string | null;
    audioUrl: string;
    audioMimeType: string | null;
    audioBytes: bigint | null;
    durationSeconds: number | null;
    artworkUrl: string | null;
    recordingType: string;
    visibility: string;
    status: string;
    explicit: boolean;
    playCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
  playlist: { id: string; title: string; coverArtUrl?: string | null; owner?: { username?: string | null } | null; slug?: string | null } | null;
}) {
  return {
    id: event.id.toString(),
    recordingId: event.recordingId,
    playlistId: event.playlistId,
    sourceContext: event.sourceContext,
    playedSeconds: event.playedSeconds,
    completed: event.completed,
    createdAt: event.createdAt.toISOString(),
    recording: {
      id: event.recording.id,
      uploaderId: event.recording.uploaderId,
      publishedPlaylistId: event.recording.publishedPlaylistId,
      title: event.recording.title,
      description: event.recording.description,
      audioUrl: event.recording.audioUrl,
      audioMimeType: event.recording.audioMimeType,
      audioBytes: event.recording.audioBytes ? Number(event.recording.audioBytes) : null,
      durationSeconds: event.recording.durationSeconds,
      artworkUrl: resolveRecordingArtworkUrl(event.recording, event.playlist),
      recordingType: event.recording.recordingType,
      visibility: event.recording.visibility,
      status: event.recording.status,
      explicit: event.recording.explicit,
      playCount: event.recording.playCount,
      createdAt: event.recording.createdAt.toISOString(),
      updatedAt: event.recording.updatedAt.toISOString(),
    },
    playlist: event.playlist
      ? {
          id: event.playlist.id,
          title: event.playlist.title,
          href:
            event.playlist.owner?.username && event.playlist.slug
              ? `/@/${encodeURIComponent(event.playlist.owner.username)}/${encodeURIComponent(event.playlist.slug)}`
              : `/playlists/${encodeURIComponent(event.playlist.id)}`,
        }
      : null,
  };
}

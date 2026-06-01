import { PUBLIC_PUBLISHED_PLAYLIST } from "./publicPlaylistFilter.js";

/** Recordings visible in public library and search surfaces. */
export const PUBLIC_PUBLISHED_RECORDING = {
  visibility: "PUBLIC" as const,
  status: "PUBLISHED" as const,
};

/** Browsable songs must also belong to a public published canonical playlist. */
export const BROWSABLE_RECORDING = {
  ...PUBLIC_PUBLISHED_RECORDING,
  publishedPlaylist: PUBLIC_PUBLISHED_PLAYLIST,
} as const;

export type RecordingVisibilityFields = {
  visibility: string;
  status: string;
};

/** Library, search, charts, and genre browse surfaces. */
export function isRecordingBrowsable(recording: RecordingVisibilityFields): boolean {
  return (
    recording.visibility === PUBLIC_PUBLISHED_RECORDING.visibility
    && recording.status === PUBLIC_PUBLISHED_RECORDING.status
  );
}

/** Direct links and tracks inside a public playlist (not library browse). */
export function isRecordingLinkAccessible(recording: RecordingVisibilityFields): boolean {
  return recording.status === "PUBLISHED"
    && (recording.visibility === "PUBLIC" || recording.visibility === "UNLISTED");
}

export function canViewerAccessRecording(
  recording: RecordingVisibilityFields,
  viewer: { userId?: string | null; role?: string | null },
  uploaderId: string,
): boolean {
  if (viewer.role === "ADMIN" || viewer.role === "EDITOR") return true;
  if (viewer.userId && viewer.userId === uploaderId) return true;
  return isRecordingLinkAccessible(recording);
}

export function canViewerSeeAllPlaylistTracks(
  viewer: { userId?: string | null; role?: string | null },
  playlistOwnerId: string,
): boolean {
  if (!viewer.userId && !viewer.role) return false;
  if (viewer.userId === playlistOwnerId) return true;
  return viewer.role === "ADMIN" || viewer.role === "EDITOR";
}

export function filterPlaylistItemsForViewer<T extends { recording: RecordingVisibilityFields }>(
  items: T[],
  viewer: { userId?: string | null; role?: string | null },
  playlistOwnerId: string,
): T[] {
  if (canViewerSeeAllPlaylistTracks(viewer, playlistOwnerId)) return items;
  return items.filter(({ recording }) => isRecordingLinkAccessible(recording));
}

/** Prisma filter for counting only public published recording tags on a genre. */
export const PUBLIC_RECORDING_TAG_COUNT_SELECT = {
  recordingTags: {
    where: {
      recording: PUBLIC_PUBLISHED_RECORDING,
    },
  },
} as const;

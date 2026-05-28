import type { PlaylistDetail } from "@playlisted/client-sdk";

export type CollectionRecording = PlaylistDetail["recordings"][number] & {
  uploader?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
};

export function partitionRecordings(recordings: CollectionRecording[], ownerId: string) {
  const ownUploads: CollectionRecording[] = [];
  const fromOthers: CollectionRecording[] = [];

  for (const recording of recordings) {
    if (recording.uploaderId === ownerId) {
      ownUploads.push(recording);
    } else {
      fromOthers.push(recording);
    }
  }

  return { ownUploads, fromOthers };
}

export function mergeForPlayback(
  ownUploads: CollectionRecording[],
  fromOthers: CollectionRecording[],
) {
  return [...ownUploads, ...fromOthers];
}

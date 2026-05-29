import type { components, PlaylistDetail } from "@playlisted/client-sdk";

export type UploadQueueItem = {
  id: string;
  file: File;
  progress01: number;
  status: "queued" | "uploading" | "registering" | "adding" | "done" | "error";
  error?: string;
};

export type RecordingWithTags = components["schemas"]["RecordingInPlaylist"] & {
  tags?: components["schemas"]["Tag"][];
};

export type PlaylistDetailWithTags = PlaylistDetail & {
  recordings: RecordingWithTags[];
};

import type { PlaylistDetail } from "@playlisted/client-sdk";

export type CollectionRecording = PlaylistDetail["recordings"][number] & {
  uploader?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
};

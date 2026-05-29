import type { components } from "@playlisted/client-sdk";

export type QueueTrack = components["schemas"]["RecordingSummary"] & {
  playlistTitle?: string;
  ownerName?: string;
};

export type SegmentPlaybackContext = {
  playlistId?: string;
  playlistOwnerUsername?: string;
  playlistSlug?: string;
  sourceContext?: string;
};

export type AutopilotResolver = "continue" | "charts" | "homepage";

export type UpNextSegment =
  | {
      id: string;
      kind: "playlist";
      label: string;
      playlistId: string;
      ownerUsername?: string;
      slug?: string;
      source: "user" | "autopilot";
    }
  | {
      id: string;
      kind: "tracks";
      label: string;
      tracks: QueueTrack[];
      context?: SegmentPlaybackContext;
      source: "user";
    }
  | {
      id: string;
      kind: "autopilot";
      label: string;
      resolver: AutopilotResolver;
      seedPlaylistId?: string;
      source: "autopilot";
    };

export type BeginSegmentOptions = {
  seedAutoplay?: boolean;
  segmentLabel?: string;
};

import type { SubtitleSegment } from "@/lib/subtitles";

export type PlaybackFocusFixture =
  | { type: "subtitle"; text: string; cueId: string }
  | {
      type: "titleIntro";
      key: string;
      title: string;
      artist?: FocusArtist | null;
      recording?: FocusRecording | null;
    }
  | {
      type: "finalFallback";
      key: string;
      title: string;
      artistName?: string | null;
      artist?: FocusArtist | null;
      recording?: FocusRecording | null;
    }
  | { type: "none" };

export type SyntheticSubtitleSource = "title-intro";

export type SyntheticSubtitleCue = {
  id: string;
  source: SyntheticSubtitleSource;
  startMs: number;
  endMs: number;
  text: string;
  priority: number;
};

export type FocusRecording = {
  id: string;
  title: string;
  ownerId?: string | null;
  ownerName?: string | null;
  ownerUsername?: string | null;
  artworkUrl?: string | null;
  artistImageUrl?: string | null;
  description?: string | null;
  playlistTitle?: string | null;
  playlistId?: string | null;
  playlistSlug?: string | null;
  recordingType?: string | null;
  genreLabel?: string | null;
  genres?: Array<{ name: string; slug: string }>;
  durationSeconds?: number | null;
  playCount?: number | null;
  hasSubtitleTrack?: boolean;
  subtitlePosition?: string;
  subtitleStyleId?: string;
};

export type FocusArtist = {
  artistName: string;
  imageUrl?: string | null;
  bioLine?: string | null;
};

export type PlaybackFocusState = {
  playFocusActive: boolean;
  hasBodyFaded: boolean;
  bodyFadedAtTrackMs: number | null;
  titleIntroStartedAtMs: number | null;
  titleIntroStartedAtEpochMs: number | null;
};

export type ResolvePlaybackFocusInput = {
  currentTimeMs: number;
  currentEpochMs: number;
  subtitleSegments: SubtitleSegment[] | null | undefined;
  subtitleReady: boolean;
  syntheticCues: SyntheticSubtitleCue[];
  artist: FocusArtist | null;
  recording: FocusRecording | null;
  focusState: PlaybackFocusState;
  subtitlesEnabled: boolean;
  isPlaying: boolean;
};

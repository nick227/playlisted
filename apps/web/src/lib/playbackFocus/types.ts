import type { SubtitleSegment } from "@/lib/subtitles";

export type PlaybackFocusFixture =
  | { type: "subtitle"; text: string; cueId: string }
  | { type: "fallbackSubtitle"; text: string; key: string; source: SyntheticSubtitleSource }
  | { type: "artistVisual"; artistName: string; imageUrl?: string; bioLine?: string }
  | { type: "finalFallback"; key: string; title: string; artistName?: string | null }
  | { type: "none" };

export type SyntheticSubtitleSource = "title-intro" | "artist-info" | "song-info" | "system";

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
  ownerName?: string | null;
  ownerUsername?: string | null;
  artworkUrl?: string | null;
  artistImageUrl?: string | null;
  description?: string | null;
  playlistTitle?: string | null;
  recordingType?: string | null;
  genreLabel?: string | null;
  durationSeconds?: number | null;
  hasSubtitleTrack?: boolean;
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
};

export type ResolvePlaybackFocusInput = {
  currentTimeMs: number;
  subtitleSegments: SubtitleSegment[] | null | undefined;
  subtitleReady: boolean;
  syntheticCues: SyntheticSubtitleCue[];
  artist: FocusArtist | null;
  recording: FocusRecording | null;
  focusState: PlaybackFocusState;
  subtitlesEnabled: boolean;
};

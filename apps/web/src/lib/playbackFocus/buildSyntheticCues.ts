import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { getFocusLaneSequenceWindows } from "@/lib/playbackFocus/focusLaneSequence";
import { buildArtistInfoLine, buildFallbackInfoText } from "@/lib/playbackFocus/formatFocusText";
import type { FocusRecording, SyntheticSubtitleCue } from "@/lib/playbackFocus/types";

export function buildSyntheticSubtitleCues(recording: FocusRecording): SyntheticSubtitleCue[] {
  const { fallbackSubtitle } = playbackFocusTiming;
  const { titleStart, titleEnd, fallbackStart } = getFocusLaneSequenceWindows();
  const cues: SyntheticSubtitleCue[] = [];

  cues.push({
    id: "title-intro",
    source: "title-intro",
    startMs: titleStart,
    endMs: titleEnd,
    text: recording.title,
    priority: 20,
  });

  const fallbackText = buildFallbackInfoText(recording);
  if (fallbackText) {
    cues.push({
      id: "fallback-info",
      source: "song-info",
      startMs: fallbackStart,
      endMs: fallbackStart + fallbackSubtitle.maxVisibleMs,
      text: fallbackText,
      priority: 10,
    });
  }

  const artistLine = buildArtistInfoLine(recording);
  if (artistLine) {
    const artistInfoStart = fallbackStart + fallbackSubtitle.maxVisibleMs;
    cues.push({
      id: "artist-info",
      source: "artist-info",
      startMs: artistInfoStart,
      endMs: artistInfoStart + fallbackSubtitle.maxVisibleMs,
      text: artistLine,
      priority: 10,
    });
  }

  return cues;
}

import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { buildArtistInfoLine, buildFallbackInfoText } from "@/lib/playbackFocus/formatFocusText";
import type { FocusRecording, SyntheticSubtitleCue } from "@/lib/playbackFocus/types";

export function buildSyntheticSubtitleCues(recording: FocusRecording): SyntheticSubtitleCue[] {
  const { titleIntro, fallbackSubtitle, artistVisual } = playbackFocusTiming;
  const cues: SyntheticSubtitleCue[] = [];

  cues.push({
    id: "title-intro",
    source: "title-intro",
    startMs: titleIntro.startMs,
    endMs: titleIntro.startMs + titleIntro.minVisibleMs + titleIntro.fadeOutMs,
    text: recording.title,
    priority: 20,
  });

  const fallbackText = buildFallbackInfoText(recording);
  if (fallbackText) {
    cues.push({
      id: "fallback-info",
      source: "song-info",
      startMs: fallbackSubtitle.delayMs,
      endMs: fallbackSubtitle.delayMs + fallbackSubtitle.maxVisibleMs,
      text: fallbackText,
      priority: 10,
    });
  }

  const artistLine = buildArtistInfoLine(recording);
  if (artistLine) {
    const artistInfoStart = artistVisual.delayMs + 2900;
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

import { getFocusLaneSequenceWindows } from "@/lib/playbackFocus/focusLaneSequence";
import type { FocusRecording, SyntheticSubtitleCue } from "@/lib/playbackFocus/types";

export function buildSyntheticSubtitleCues(recording: FocusRecording): SyntheticSubtitleCue[] {
  const { titleStart, titleEnd } = getFocusLaneSequenceWindows();

  return [
    {
      id: "title-intro",
      source: "title-intro",
      startMs: titleStart,
      endMs: titleEnd,
      text: recording.title,
      priority: 20,
    },
  ];
}

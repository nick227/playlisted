import { useEffect, useMemo, useState } from "react";

import { normalizeSubtitlePosition, normalizeSubtitleStyleId } from "@/lib/subtitleStylePresets";
import { getRememberedRecordingSubtitleStyle } from "@/lib/subtitleStyleMemory";
import { subtitleStyleIdToPlaybackCss } from "@/lib/subtitleStyleToCss";
import {
  RECORDING_SUBTITLE_STYLE_CHANGED_EVENT,
  type RecordingSubtitleStyleChangedEventDetail,
} from "@/lib/subtitles";

type SubtitleStyleSource = {
  subtitlePosition?: string;
  subtitleStyleId?: string;
} | null | undefined;

export function useRecordingSubtitleStyle(
  recordingId: string | undefined,
  recording?: SubtitleStyleSource,
  subtitles?: SubtitleStyleSource,
) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handleSubtitleStyleChange = (event: Event) => {
      const detail = (event as CustomEvent<RecordingSubtitleStyleChangedEventDetail>).detail;
      if (!detail?.recordingId) return;
      if (detail.recordingId === recordingId) {
        setRevision((value) => value + 1);
      }
    };

    window.addEventListener(RECORDING_SUBTITLE_STYLE_CHANGED_EVENT, handleSubtitleStyleChange);
    return () => window.removeEventListener(RECORDING_SUBTITLE_STYLE_CHANGED_EVENT, handleSubtitleStyleChange);
  }, [recordingId]);

  const savedStyle = getRememberedRecordingSubtitleStyle(recordingId);

  const subtitlePosition = useMemo(() => {
    if (savedStyle) {
      return normalizeSubtitlePosition(savedStyle.subtitlePosition);
    }
    if (subtitles?.subtitlePosition) {
      return normalizeSubtitlePosition(subtitles.subtitlePosition);
    }
    return normalizeSubtitlePosition(recording?.subtitlePosition);
  }, [recording?.subtitlePosition, revision, savedStyle, subtitles?.subtitlePosition]);

  const subtitleStyleId = useMemo(() => {
    if (savedStyle) {
      return normalizeSubtitleStyleId(savedStyle.subtitleStyleId);
    }
    if (subtitles?.subtitleStyleId) {
      return normalizeSubtitleStyleId(subtitles.subtitleStyleId);
    }
    return normalizeSubtitleStyleId(recording?.subtitleStyleId);
  }, [recording?.subtitleStyleId, revision, savedStyle, subtitles?.subtitleStyleId]);

  const customSubtitleStyle = useMemo(
    () => subtitleStyleIdToPlaybackCss(subtitleStyleId),
    [subtitleStyleId],
  );

  return { subtitlePosition, subtitleStyleId, customSubtitleStyle };
}

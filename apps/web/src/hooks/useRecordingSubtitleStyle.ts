import { useEffect, useMemo, useState } from "react";

import { normalizeSubtitlePosition, normalizeSubtitleStyleId } from "@/lib/subtitleStylePresets";
import { subtitleStyleIdToCss } from "@/lib/subtitleStyleToCss";
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
  const [styleOverride, setStyleOverride] = useState<RecordingSubtitleStyleChangedEventDetail | null>(null);

  useEffect(() => {
    if (!recordingId) return;

    const handleSubtitleStyleChange = (event: Event) => {
      const detail = (event as CustomEvent<RecordingSubtitleStyleChangedEventDetail>).detail;
      if (detail?.recordingId !== recordingId) return;
      setStyleOverride(detail);
    };

    window.addEventListener(RECORDING_SUBTITLE_STYLE_CHANGED_EVENT, handleSubtitleStyleChange);
    return () => window.removeEventListener(RECORDING_SUBTITLE_STYLE_CHANGED_EVENT, handleSubtitleStyleChange);
  }, [recordingId]);

  useEffect(() => {
    setStyleOverride(null);
  }, [recordingId]);

  const subtitlePosition = useMemo(() => {
    if (styleOverride && styleOverride.recordingId === recordingId) {
      return normalizeSubtitlePosition(styleOverride.subtitlePosition);
    }
    if (subtitles?.subtitlePosition) {
      return normalizeSubtitlePosition(subtitles.subtitlePosition);
    }
    return normalizeSubtitlePosition(recording?.subtitlePosition);
  }, [recording?.subtitlePosition, recordingId, styleOverride, subtitles?.subtitlePosition]);

  const subtitleStyleId = useMemo(() => {
    if (styleOverride && styleOverride.recordingId === recordingId) {
      return normalizeSubtitleStyleId(styleOverride.subtitleStyleId);
    }
    if (subtitles?.subtitleStyleId) {
      return normalizeSubtitleStyleId(subtitles.subtitleStyleId);
    }
    return normalizeSubtitleStyleId(recording?.subtitleStyleId);
  }, [recording?.subtitleStyleId, recordingId, styleOverride, subtitles?.subtitleStyleId]);

  const customSubtitleStyle = useMemo(
    () => subtitleStyleIdToCss(subtitleStyleId),
    [subtitleStyleId],
  );

  return { subtitlePosition, subtitleStyleId, customSubtitleStyle };
}

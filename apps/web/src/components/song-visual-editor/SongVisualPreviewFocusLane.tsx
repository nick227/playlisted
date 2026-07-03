import { useEffect, useMemo, useState } from "react";

import { FocusLaneSubtitleContent } from "@/components/app-shell/PlaybackFocusLane/FocusLaneSubtitleContent";
import { useFocusLaneVisibility } from "@/components/app-shell/PlaybackFocusLane/useFocusLaneVisibility";
import { useRecordingSubtitleStyle } from "@/hooks/useRecordingSubtitleStyle";
import { resolvePlaybackFocusFixture } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
import type { FocusRecording } from "@/lib/playbackFocus/types";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";
import { subtitlePositionClassName } from "@/lib/subtitleStyleToCss";
import {
  fetchRecordingSubtitles,
  RECORDING_SUBTITLES_DISABLED_EVENT,
  type RecordingSubtitlesDisabledEventDetail,
  type RecordingSubtitlesResponse,
} from "@/lib/subtitles";
import { useAuth } from "@/providers/AuthProvider";

type SongVisualPreviewFocusLaneProps = {
  enabled: boolean;
  recording: FocusRecording;
  currentTimeSec: number;
};

export function SongVisualPreviewFocusLane({
  enabled,
  recording,
  currentTimeSec,
}: SongVisualPreviewFocusLaneProps) {
  const { accessToken } = useAuth();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const [subtitles, setSubtitles] = useState<RecordingSubtitlesResponse | null>(null);
  const canLoadSubtitles = Boolean(enabled && subtitlesEnabled && recording.hasSubtitleTrack && recording.id);

  const { subtitlePosition, customSubtitleStyle } = useRecordingSubtitleStyle(
    recording.id,
    recording,
    subtitles,
  );

  useEffect(() => {
    if (!canLoadSubtitles) {
      setSubtitles(null);
      return;
    }

    let cancelled = false;
    let pollTimer: number | null = null;

    const fetchSubs = () => {
      fetchRecordingSubtitles(recording.id, accessToken)
        .then((data) => {
          if (cancelled) return;
          setSubtitles(data);
          if (data.status === "QUEUED" || data.status === "PROCESSING") {
            pollTimer = window.setTimeout(fetchSubs, 3000);
          }
        })
        .catch(() => {
          if (!cancelled) setSubtitles({ status: "FAILED", errorMessage: "Subtitles unavailable" });
        });
    };

    fetchSubs();

    return () => {
      cancelled = true;
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, [accessToken, canLoadSubtitles, recording.id]);

  useEffect(() => {
    if (!recording.id) return;

    const handleSubtitlesDisabledChange = (event: Event) => {
      const detail = (event as CustomEvent<RecordingSubtitlesDisabledEventDetail>).detail;
      if (detail?.recordingId !== recording.id) return;
      setSubtitles(detail.subtitlesDisabled ? { status: "DISABLED" } : null);
    };

    window.addEventListener(RECORDING_SUBTITLES_DISABLED_EVENT, handleSubtitlesDisabledChange);
    return () => window.removeEventListener(RECORDING_SUBTITLES_DISABLED_EVENT, handleSubtitlesDisabledChange);
  }, [recording.id]);

  const activeFixture = useMemo(
    () =>
      resolvePlaybackFocusFixture({
        currentTimeMs: currentTimeSec * 1000,
        subtitleSegments: subtitles?.segments,
        subtitleReady: subtitles?.status === "READY",
        syntheticCues: [],
        artist: null,
        recording: null,
        focusState: {
          playFocusActive: canLoadSubtitles,
          hasBodyFaded: canLoadSubtitles,
          bodyFadedAtTrackMs: canLoadSubtitles ? 0 : null,
        },
        subtitlesEnabled,
      }),
    [
      canLoadSubtitles,
      currentTimeSec,
      subtitles?.segments,
      subtitles?.status,
      subtitlesEnabled,
    ],
  );

  const { displayFixture, displayKey, layerVisible, variantClass } = useFocusLaneVisibility(activeFixture);

  if (!canLoadSubtitles || !displayFixture || displayFixture.type === "none") {
    return null;
  }

  return (
    <div
      data-focus-lane
      className={[
        "song-visual-preview__focus-lane focus-lane",
        layerVisible ? "is-visible" : "",
        variantClass,
        subtitlePositionClassName(subtitlePosition).trim(),
      ].join(" ")}
      aria-hidden={!layerVisible}
    >
      <div key={displayKey} className="focus-lane__content">
        <FocusLaneSubtitleContent fixture={displayFixture} customSubtitleStyle={customSubtitleStyle} />
      </div>
    </div>
  );
}

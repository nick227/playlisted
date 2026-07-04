import { useEffect, useMemo, useState } from "react";

import { FocusLaneSubtitleContent } from "@/components/app-shell/PlaybackFocusLane/FocusLaneSubtitleContent";
import { useFocusLaneVisibility } from "@/components/app-shell/PlaybackFocusLane/useFocusLaneVisibility";
import { useRecordingSubtitleStyle } from "@/hooks/useRecordingSubtitleStyle";
import { buildSyntheticSubtitleCues } from "@/lib/playbackFocus/buildSyntheticCues";
import { resolvePlaybackFocusFixture } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
import { toFocusArtist } from "@/lib/playbackFocus/toFocusRecording";
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
  textOverlaysEnabled?: boolean;
};

export function SongVisualPreviewFocusLane({
  enabled,
  recording,
  currentTimeSec,
  textOverlaysEnabled = true,
}: SongVisualPreviewFocusLaneProps) {
  const { accessToken } = useAuth();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const [subtitles, setSubtitles] = useState<RecordingSubtitlesResponse | null>(null);

  const focusLaneActive = Boolean(enabled && recording.id);

  const canLoadSubtitles = Boolean(
    focusLaneActive &&
      textOverlaysEnabled &&
      subtitlesEnabled &&
      recording.hasSubtitleTrack
  );

  const canRenderTextOverlay = Boolean(focusLaneActive && textOverlaysEnabled);

  const { subtitlePosition, subtitleStyleId, customSubtitleStyle } = useRecordingSubtitleStyle(
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
        syntheticCues: buildSyntheticSubtitleCues(recording),
        artist: toFocusArtist(recording),
        recording,
        focusState: {
          playFocusActive: canRenderTextOverlay,
          hasBodyFaded: canRenderTextOverlay,
          bodyFadedAtTrackMs: canRenderTextOverlay ? 0 : null,
        },
        subtitlesEnabled,
      }),
    [
      canRenderTextOverlay,
      currentTimeSec,
      recording,
      subtitles?.segments,
      subtitles?.status,
      subtitlesEnabled,
    ],
  );

  const { displayFixture, displayKey, layerVisible, variantClass } = useFocusLaneVisibility(activeFixture);

  if (!canRenderTextOverlay || !displayFixture || displayFixture.type === "none") {
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
        <FocusLaneSubtitleContent
          fixture={displayFixture}
          customSubtitleStyle={customSubtitleStyle}
          subtitleStyleId={subtitleStyleId}
          currentTimeSec={currentTimeSec}
          isPlaying={enabled}
        />
      </div>
    </div>
  );
}

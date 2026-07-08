import { useEffect, useMemo, useState } from "react";

import {
  FocusLaneOverlayContent,
  FocusLaneSubtitleContent,
} from "@/components/app-shell/PlaybackFocusLane/FocusLaneSubtitleContent";
import { useFocusLaneVisibility } from "@/components/app-shell/PlaybackFocusLane/useFocusLaneVisibility";
import { useRecordingSubtitleStyle } from "@/hooks/useRecordingSubtitleStyle";
import { buildSyntheticSubtitleCues } from "@/lib/playbackFocus/buildSyntheticCues";
import {
  isTitleIntroFixture,
  resolveOverlayFixture,
  resolveSubtitleFixture,
} from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
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

  const resolveInput = useMemo(
    () => ({
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
      isPlaying: canRenderTextOverlay,
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

  const activeSubtitleFixture = useMemo(
    () => resolveSubtitleFixture(resolveInput),
    [resolveInput],
  );
  const activeOverlayFixture = useMemo(
    () => resolveOverlayFixture(resolveInput),
    [resolveInput],
  );

  const gatedSubtitleFixture = isTitleIntroFixture(activeOverlayFixture)
    ? ({ type: "none" } as const)
    : activeSubtitleFixture;

  const subtitleLane = useFocusLaneVisibility(gatedSubtitleFixture);
  const overlayLane = useFocusLaneVisibility(activeOverlayFixture);

  const titleIntroStillShowing = isTitleIntroFixture(overlayLane.displayFixture);
  const hasOverlay = Boolean(
    overlayLane.displayFixture && overlayLane.displayFixture.type !== "none",
  );
  const hasSubtitle = Boolean(
    !titleIntroStillShowing &&
      subtitleLane.displayFixture &&
      subtitleLane.displayFixture.type !== "none",
  );
  const layerVisible =
    overlayLane.layerVisible || (!titleIntroStillShowing && subtitleLane.layerVisible);
  const variantClass = overlayLane.variantClass || subtitleLane.variantClass;

  if (!canRenderTextOverlay || (!hasOverlay && !hasSubtitle)) {
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
      {hasOverlay ? (
        <div
          key={`overlay:${overlayLane.displayKey}`}
          className={`focus-lane__content focus-lane__content--overlay${
            overlayLane.layerVisible ? " is-visible" : ""
          }`}
          aria-hidden={!overlayLane.layerVisible}
        >
          <FocusLaneOverlayContent
            fixture={overlayLane.displayFixture!}
            isPlaying={enabled}
            withPlayer
          />
        </div>
      ) : null}
      {hasSubtitle ? (
        <div
          key={`subtitle:${subtitleLane.displayKey}`}
          className={`focus-lane__content focus-lane__content--subtitle${
            !titleIntroStillShowing && subtitleLane.layerVisible ? " is-visible" : ""
          }`}
          aria-hidden={titleIntroStillShowing || !subtitleLane.layerVisible}
        >
          <FocusLaneSubtitleContent
            fixture={subtitleLane.displayFixture!}
            customSubtitleStyle={customSubtitleStyle}
            subtitleStyleId={subtitleStyleId}
          />
        </div>
      ) : null}
    </div>
  );
}

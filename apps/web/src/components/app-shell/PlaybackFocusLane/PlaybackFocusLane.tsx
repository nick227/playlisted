import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import { useFocusLanePlayback } from "@/hooks/useFocusLanePlayback";
import { useRecordingSubtitleStyle } from "@/hooks/useRecordingSubtitleStyle";
import { buildSyntheticSubtitleCues } from "@/lib/playbackFocus/buildSyntheticCues";
import {
  resolveOverlayFixture,
  resolveSubtitleFixture,
} from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
import { toFocusArtist, toFocusRecording } from "@/lib/playbackFocus/toFocusRecording";
import type { PlaybackFocusState } from "@/lib/playbackFocus/types";
import {
  fetchRecordingSubtitles,
  RECORDING_SUBTITLES_DISABLED_EVENT,
  type RecordingSubtitlesDisabledEventDetail,
  type RecordingSubtitlesResponse,
} from "@/lib/subtitles";
import { subtitlePositionClassName } from "@/lib/subtitleStyleToCss";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

import { FocusLaneOverlayContent, FocusLaneSubtitleContent } from "./FocusLaneSubtitleContent";
import { useFocusLaneVisibility } from "./useFocusLaneVisibility";

type PlaybackFocusLaneProps = {
  focusState: PlaybackFocusState;
  onSitePlayerCollapseChange?: (collapsed: boolean) => void;
};

const SUBTITLE_POLL_INTERVAL_MS = 3000;
// Give up on a stuck QUEUED/PROCESSING job after ~1 minute instead of
// polling for the entire duration of playback.
const SUBTITLE_POLL_MAX_ATTEMPTS = 20;

export function PlaybackFocusLane({
  focusState,
  onSitePlayerCollapseChange,
}: PlaybackFocusLaneProps) {
  const { accessToken } = useAuth();
  const { playbackContext } = useAudioPlayer();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const { track, isPlaying, currentTime, isRadio } = useFocusLanePlayback();
  const queryClient = useQueryClient();

  const recording = useMemo(
    () => toFocusRecording(track, isRadio ? undefined : playbackContext),
    [isRadio, playbackContext, track],
  );
  const artist = useMemo(() => (recording ? toFocusArtist(recording) : null), [recording]);
  const syntheticCues = useMemo(
    () => (recording ? buildSyntheticSubtitleCues(recording) : []),
    [recording],
  );

  const canLoadSubtitles = Boolean(subtitlesEnabled && isPlaying && recording?.id);

  const subtitlesQuery = useQuery({
    queryKey: ["subtitles", recording?.id, accessToken ? "auth" : "guest"],
    queryFn: () => fetchRecordingSubtitles(recording!.id, accessToken),
    enabled: canLoadSubtitles,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status !== "QUEUED" && status !== "PROCESSING") return false;
      // Give up on a stuck job instead of polling for the whole playback.
      return query.state.dataUpdateCount < SUBTITLE_POLL_MAX_ATTEMPTS
        ? SUBTITLE_POLL_INTERVAL_MS
        : false;
    },
  });

  const subtitles: RecordingSubtitlesResponse | null = !canLoadSubtitles
    ? null
    : subtitlesQuery.data ??
      (subtitlesQuery.isError ? { status: "FAILED", errorMessage: "Subtitles unavailable" } : null);

  useEffect(() => {
    const recordingId = recording?.id;
    if (!recordingId) return;

    const handleSubtitlesDisabledChange = (event: Event) => {
      const detail = (event as CustomEvent<RecordingSubtitlesDisabledEventDetail>).detail;
      if (detail?.recordingId !== recordingId) return;
      if (detail.subtitlesDisabled) {
        queryClient.setQueryData<RecordingSubtitlesResponse>(
          ["subtitles", recordingId, accessToken ? "auth" : "guest"],
          { status: "DISABLED" },
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: ["subtitles", recordingId] });
      }
    };

    window.addEventListener(RECORDING_SUBTITLES_DISABLED_EVENT, handleSubtitlesDisabledChange);
    return () => window.removeEventListener(RECORDING_SUBTITLES_DISABLED_EVENT, handleSubtitlesDisabledChange);
  }, [accessToken, queryClient, recording?.id]);

  const { subtitlePosition, subtitleStyleId, customSubtitleStyle } = useRecordingSubtitleStyle(
    recording?.id,
    recording,
    subtitles,
  );

  const currentTimeMs = currentTime * 1000;

  const resolveInput = useMemo(
    () => ({
      currentTimeMs,
      subtitleSegments: subtitles?.segments,
      subtitleReady: subtitles?.status === "READY",
      syntheticCues,
      artist,
      recording,
      focusState,
      subtitlesEnabled,
      isPlaying,
    }),
    [
      artist,
      currentTimeMs,
      focusState,
      isPlaying,
      recording,
      subtitles?.segments,
      subtitles?.status,
      subtitlesEnabled,
      syntheticCues,
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

  const subtitleLane = useFocusLaneVisibility(activeSubtitleFixture);
  const overlayLane = useFocusLaneVisibility(activeOverlayFixture);

  const hasOverlay = Boolean(
    overlayLane.displayFixture && overlayLane.displayFixture.type !== "none",
  );
  const hasSubtitle = Boolean(
    subtitleLane.displayFixture && subtitleLane.displayFixture.type !== "none",
  );
  const layerVisible = subtitleLane.layerVisible || overlayLane.layerVisible;

  // Site-player minimize follows overlay timing, not lyric cues.
  const shouldCollapseSitePlayer = !isRadio && hasOverlay && overlayLane.layerVisible;
  const positionClassName = subtitlePositionClassName(subtitlePosition);
  const variantClass = overlayLane.variantClass || subtitleLane.variantClass;

  useEffect(() => {
    if (!onSitePlayerCollapseChange) return;

    if (!shouldCollapseSitePlayer) {
      onSitePlayerCollapseChange(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      onSitePlayerCollapseChange(true);
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [onSitePlayerCollapseChange, shouldCollapseSitePlayer]);

  if (!recording?.id || !focusState.hasBodyFaded || !isPlaying) {
    return null;
  }

  if (!hasOverlay && !hasSubtitle) {
    return null;
  }

  return createPortal(
    <div
      data-focus-lane
      className={`focus-lane${layerVisible ? " is-visible" : ""}${variantClass}${positionClassName}`}
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
            isPlaying={isPlaying}
          />
        </div>
      ) : null}
      {hasSubtitle ? (
        <div
          key={`subtitle:${subtitleLane.displayKey}`}
          className={`focus-lane__content focus-lane__content--subtitle${
            subtitleLane.layerVisible ? " is-visible" : ""
          }`}
          aria-hidden={!subtitleLane.layerVisible}
        >
          <FocusLaneSubtitleContent
            fixture={subtitleLane.displayFixture!}
            customSubtitleStyle={customSubtitleStyle}
            subtitleStyleId={subtitleStyleId}
          />
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import { useFocusLanePlayback } from "@/hooks/useFocusLanePlayback";
import { useRecordingSubtitleStyle } from "@/hooks/useRecordingSubtitleStyle";
import { buildSyntheticSubtitleCues } from "@/lib/playbackFocus/buildSyntheticCues";
import { resolvePlaybackFocusFixture } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
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

import { FocusLaneSubtitleContent } from "./FocusLaneSubtitleContent";
import { MinimizedSongPlayer } from "./MinimizedSongPlayer";
import { useArtistVisualMinimized } from "./useArtistVisualMinimized";
import { useFocusLaneVisibility } from "./useFocusLaneVisibility";

type PlaybackFocusLaneProps = {
  focusState: PlaybackFocusState;
  withPlayer?: boolean;
};

const SUBTITLE_POLL_INTERVAL_MS = 3000;
// Give up on a stuck QUEUED/PROCESSING job after ~1 minute instead of
// polling for the entire duration of playback.
const SUBTITLE_POLL_MAX_ATTEMPTS = 20;

export function PlaybackFocusLane({ focusState, withPlayer = false }: PlaybackFocusLaneProps) {
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

  const activeFixture = useMemo(
    () =>
      resolvePlaybackFocusFixture({
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

  const { displayFixture, displayKey, layerVisible, variantClass } = useFocusLaneVisibility(activeFixture);
  const { minimized: artistVisualMinimized, minimize: minimizeArtistVisual, expand: expandArtistVisual } =
    useArtistVisualMinimized(recording?.id, focusState.hasBodyFaded);

  const artistVisualPosition =
    displayFixture?.type === "finalFallback" ||
    (displayFixture?.type === "fallbackSubtitle" && displayFixture.source !== "title-intro");
  const positionClassName = subtitlePositionClassName(artistVisualPosition ? "middle" : subtitlePosition);

  const isSubtitleFixture = displayFixture?.type === "subtitle";
  const isArtistVisualFixture = artistVisualPosition;
  const showMiniPlayer =
    isRadio &&
    layerVisible &&
    (isSubtitleFixture || (isArtistVisualFixture && artistVisualMinimized));

  if (!recording?.id || !focusState.hasBodyFaded || !isPlaying) {
    return null;
  }

  if (!displayFixture || displayFixture.type === "none") {
    return null;
  }

  return createPortal(
    <>
      <div
        data-focus-lane
        className={`focus-lane${layerVisible ? " is-visible" : ""}${variantClass}${positionClassName}`}
        aria-hidden={!layerVisible}
      >
        <div key={displayKey} className="focus-lane__content">
          <FocusLaneSubtitleContent
            fixture={displayFixture}
            customSubtitleStyle={customSubtitleStyle}
            subtitleStyleId={subtitleStyleId}
            currentTimeSec={currentTime}
            isPlaying={isPlaying}
            onMinimizeArtistVisual={minimizeArtistVisual}
            artistVisualMinimized={artistVisualMinimized}
          />
        </div>
      </div>
      {isRadio ? (
        <MinimizedSongPlayer
          recording={recording}
          artistName={artist?.artistName ?? recording.ownerName ?? undefined}
          artistUsername={recording.ownerUsername}
          visible={showMiniPlayer}
          showExpand={Boolean(isArtistVisualFixture && artistVisualMinimized)}
          onExpand={expandArtistVisual}
          withPlayer={withPlayer}
        />
      ) : null}
    </>,
    document.body,
  );
}

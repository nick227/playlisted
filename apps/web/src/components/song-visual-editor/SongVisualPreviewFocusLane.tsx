import { useEffect, useMemo, useState } from "react";

import { ArtistVisual } from "@/components/app-shell/PlaybackFocusLane/ArtistVisual";
import {
  FinalFallbackText,
  fixtureToSubtitleProps,
  SubtitleText,
} from "@/components/app-shell/PlaybackFocusLane/SubtitleText";
import { useFocusLaneVisibility } from "@/components/app-shell/PlaybackFocusLane/useFocusLaneVisibility";
import { buildSyntheticSubtitleCues } from "@/lib/playbackFocus/buildSyntheticCues";
import { resolvePlaybackFocusFixture } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
import type { FocusRecording } from "@/lib/playbackFocus/types";
import { toFocusArtist } from "@/lib/playbackFocus/toFocusRecording";
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
  const [subtitles, setSubtitles] = useState<RecordingSubtitlesResponse | null>(null);

  const syntheticCues = useMemo(() => buildSyntheticSubtitleCues(recording), [recording]);
  const artist = useMemo(() => toFocusArtist(recording), [recording]);

  useEffect(() => {
    if (!enabled || !recording.id) {
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
  }, [accessToken, enabled, recording.id]);

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
        syntheticCues,
        artist,
        recording,
        focusState: {
          playFocusActive: enabled,
          hasBodyFaded: enabled,
          bodyFadedAtTrackMs: enabled ? 0 : null,
        },
        subtitlesEnabled: true,
      }),
    [
      artist,
      currentTimeSec,
      enabled,
      recording,
      subtitles?.segments,
      subtitles?.status,
      syntheticCues,
    ],
  );

  const { displayFixture, displayKey, layerVisible, variantClass } = useFocusLaneVisibility(activeFixture);

  if (!enabled || !displayFixture || displayFixture.type === "none") {
    return null;
  }

  const subtitleProps = fixtureToSubtitleProps(displayFixture);
  const laneContent =
    displayFixture.type === "artistVisual" ? (
      <ArtistVisual
        artistName={displayFixture.artistName}
        imageUrl={displayFixture.imageUrl}
        bioLine={displayFixture.bioLine}
      />
    ) : displayFixture.type === "finalFallback" ? (
      <FinalFallbackText
        title={displayFixture.title}
        artistName={displayFixture.artistName}
      />
    ) : subtitleProps ? (
      <SubtitleText {...subtitleProps} />
    ) : null;

  return (
    <div
      data-focus-lane
      className={[
        "song-visual-preview__focus-lane focus-lane",
        layerVisible ? "is-visible" : "",
        variantClass,
      ].join(" ")}
      aria-hidden={!layerVisible}
    >
      <div key={displayKey} className="focus-lane__content">
        {laneContent}
      </div>
    </div>
  );
}

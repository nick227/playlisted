import { useEffect, useMemo, useRef, useState } from "react";

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
import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { fetchRecordingSubtitles, type RecordingSubtitlesResponse } from "@/lib/subtitles";
import { useAuth } from "@/providers/AuthProvider";

type SongVisualPreviewFocusLaneProps = {
  enabled: boolean;
  recording: FocusRecording;
  currentTimeSec: number;
  isPlaying: boolean;
};

export function SongVisualPreviewFocusLane({
  enabled,
  recording,
  currentTimeSec,
  isPlaying,
}: SongVisualPreviewFocusLaneProps) {
  const { accessToken } = useAuth();
  const [subtitles, setSubtitles] = useState<RecordingSubtitlesResponse | null>(null);
  const [bodyFadedAtTrackMs, setBodyFadedAtTrackMs] = useState<number | null>(null);
  const currentTimeRef = useRef(currentTimeSec);
  currentTimeRef.current = currentTimeSec;

  const syntheticCues = useMemo(() => buildSyntheticSubtitleCues(recording), [recording]);
  const artist = useMemo(() => {
    if (!recording.ownerName) return null;
    return {
      artistName: recording.ownerName,
      imageUrl: recording.artworkUrl,
      bioLine: recording.description?.trim() || undefined,
    };
  }, [recording]);

  useEffect(() => {
    if (!enabled || !isPlaying) {
      setBodyFadedAtTrackMs(null);
      return;
    }

    const fadeAnchorMs = currentTimeRef.current * 1000;
    const timer = window.setTimeout(() => {
      setBodyFadedAtTrackMs(fadeAnchorMs);
    }, playbackFocusTiming.body.delayMs);

    return () => window.clearTimeout(timer);
  }, [enabled, isPlaying]);

  useEffect(() => {
    if (!enabled || !isPlaying || !recording.id) {
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
  }, [accessToken, enabled, isPlaying, recording.id]);

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
          playFocusActive: enabled && isPlaying,
          hasBodyFaded: bodyFadedAtTrackMs != null,
          bodyFadedAtTrackMs,
        },
        subtitlesEnabled: true,
      }),
    [
      artist,
      bodyFadedAtTrackMs,
      currentTimeSec,
      enabled,
      isPlaying,
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

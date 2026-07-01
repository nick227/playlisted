import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useFocusLanePlayback } from "@/hooks/useFocusLanePlayback";
import { buildSyntheticSubtitleCues } from "@/lib/playbackFocus/buildSyntheticCues";
import { resolvePlaybackFocusFixture } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
import { toFocusArtist, toFocusRecording } from "@/lib/playbackFocus/toFocusRecording";
import type { PlaybackFocusState } from "@/lib/playbackFocus/types";
import { fetchRecordingSubtitles, type RecordingSubtitlesResponse } from "@/lib/subtitles";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";
import { useAuth } from "@/providers/AuthProvider";

import { ArtistVisual } from "./ArtistVisual";
import { FinalFallbackText, fixtureToSubtitleProps, SubtitleText } from "./SubtitleText";
import { useFocusLaneVisibility } from "./useFocusLaneVisibility";

type PlaybackFocusLaneProps = {
  focusState: PlaybackFocusState;
};

export function PlaybackFocusLane({ focusState }: PlaybackFocusLaneProps) {
  const { accessToken } = useAuth();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const { track, isPlaying, currentTime } = useFocusLanePlayback();
  const [subtitles, setSubtitles] = useState<RecordingSubtitlesResponse | null>(null);

  const recording = useMemo(() => toFocusRecording(track), [track]);
  const artist = useMemo(() => (recording ? toFocusArtist(recording) : null), [recording]);
  const syntheticCues = useMemo(
    () => (recording ? buildSyntheticSubtitleCues(recording) : []),
    [recording],
  );

  const canLoadSubtitles = Boolean(subtitlesEnabled && isPlaying && recording?.id);

  useEffect(() => {
    if (!canLoadSubtitles || !recording?.id) {
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
  }, [accessToken, canLoadSubtitles, recording?.id]);

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
      }),
    [
      artist,
      currentTimeMs,
      focusState,
      recording,
      subtitles?.segments,
      subtitles?.status,
      subtitlesEnabled,
      syntheticCues,
    ],
  );

  const { displayFixture, displayKey, layerVisible, variantClass } = useFocusLaneVisibility(activeFixture);

  if (!recording?.id || !displayFixture || displayFixture.type === "none") {
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

  return createPortal(
    <div
      data-focus-lane
      className={`focus-lane${layerVisible ? " is-visible" : ""}${variantClass}`}
      aria-hidden={!layerVisible}
    >
      <div key={displayKey} className="focus-lane__content">
        {laneContent}
      </div>
    </div>,
    document.body,
  );
}

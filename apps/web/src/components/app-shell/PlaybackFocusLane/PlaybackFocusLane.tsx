import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useActivePlayback } from "@/hooks/useActivePlayback";
import { buildSyntheticSubtitleCues } from "@/lib/playbackFocus/buildSyntheticCues";
import { resolvePlaybackFocusFixture } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
import { toFocusArtist, toFocusRecording } from "@/lib/playbackFocus/toFocusRecording";
import type { PlaybackFocusState } from "@/lib/playbackFocus/types";
import { fetchRecordingSubtitles, type RecordingSubtitlesResponse } from "@/lib/subtitles";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";
import { useAuth } from "@/providers/AuthProvider";

import { ArtistVisual } from "./ArtistVisual";
import { fixtureToSubtitleProps, SubtitleText } from "./SubtitleText";
import { useFocusLaneVisibility } from "./useFocusLaneVisibility";

type PlaybackFocusLaneProps = {
  focusState: PlaybackFocusState;
};

export function PlaybackFocusLane({ focusState }: PlaybackFocusLaneProps) {
  const { accessToken } = useAuth();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const { track, isPlaying, currentTime, isRadio } = useActivePlayback();
  const [subtitles, setSubtitles] = useState<RecordingSubtitlesResponse | null>(null);

  const recording = useMemo(() => toFocusRecording(track), [track]);
  const artist = useMemo(() => (recording ? toFocusArtist(recording) : null), [recording]);
  const syntheticCues = useMemo(
    () => (recording ? buildSyntheticSubtitleCues(recording) : []),
    [recording],
  );

  const canLoadSubtitles = Boolean(
    subtitlesEnabled &&
    isPlaying &&
    recording?.id &&
    !isRadio &&
    recording.hasSubtitleTrack,
  );

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
        focusState,
        subtitlesEnabled,
      }),
    [
      artist,
      currentTimeMs,
      focusState,
      subtitles?.segments,
      subtitles?.status,
      subtitlesEnabled,
      syntheticCues,
    ],
  );

  const { displayFixture, layerVisible, variantClass } = useFocusLaneVisibility(activeFixture);

  if (!recording?.id || !displayFixture || displayFixture.type === "none") {
    return null;
  }

  const subtitleProps = fixtureToSubtitleProps(displayFixture);

  return createPortal(
    <div
      data-focus-lane
      className={`focus-lane${layerVisible ? " is-visible" : ""}${variantClass}`}
      aria-hidden={!layerVisible}
    >
      {displayFixture.type === "artistVisual" ? (
        <ArtistVisual
          artistName={displayFixture.artistName}
          imageUrl={displayFixture.imageUrl}
          bioLine={displayFixture.bioLine}
        />
      ) : subtitleProps ? (
        <SubtitleText {...subtitleProps} />
      ) : null}
    </div>,
    document.body,
  );
}

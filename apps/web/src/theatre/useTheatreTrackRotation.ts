import { useEffect, useRef } from "react";

import theatreController from "@/theatre/controller/lazyController";

/** Rotate theatre presets when the playback segment identity changes. */
export function useTheatreTrackRotation(
  segmentId: string | null | undefined,
  autoRotateEnabled: boolean,
  durationMs?: number | null,
) {
  const prevSegmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!segmentId) {
      prevSegmentIdRef.current = null;
      return;
    }

    if (prevSegmentIdRef.current === segmentId) return;

    const isSegmentChange = prevSegmentIdRef.current !== null;
    prevSegmentIdRef.current = segmentId;
    if (isSegmentChange) void theatreController.onPlaybackSegmentChanged();
  }, [segmentId]);

  useEffect(() => {
    theatreController.setAutoRotation(autoRotateEnabled);
    return () => theatreController.setAutoRotation(false);
  }, [autoRotateEnabled]);

  useEffect(() => {
    theatreController.setClipDuration(durationMs ?? null);
  }, [durationMs]);
}

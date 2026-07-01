import { useEffect, useRef } from "react";

import theatreController from "@/theatre/controller/lazyController";

/** Pick a new random theatre preset when the playback segment identity changes. */
export function useTheatreTrackRotation(
  segmentId: string | null | undefined,
  enabled: boolean,
  durationMs?: number | null,
) {
  const prevSegmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !segmentId) {
      if (!enabled) prevSegmentIdRef.current = null;
      return;
    }

    if (prevSegmentIdRef.current === segmentId) return;

    const isSegmentChange = prevSegmentIdRef.current !== null;
    prevSegmentIdRef.current = segmentId;
    if (isSegmentChange) void theatreController.rotateRandomPreset();
  }, [segmentId, enabled]);

  useEffect(() => {
    theatreController.setTrackContext(
      enabled && segmentId ? { segmentId, trackId: segmentId } : null,
    );
    return () => theatreController.setTrackContext(null);
  }, [segmentId, enabled]);

  useEffect(() => {
    theatreController.setAutoRotation(enabled);
    return () => theatreController.setAutoRotation(false);
  }, [enabled]);

  useEffect(() => {
    theatreController.setClipDuration(durationMs ?? null);
  }, [durationMs]);
}

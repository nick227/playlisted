import { useEffect, useRef, useState } from "react";

import { computeIntroTerminatedByLyric, type IntroTerminationInput } from "@/lib/playbackFocus/introTermination";

export type UseIntroTerminationLatchInput = IntroTerminationInput & {
  trackKey: string | null | undefined;
};

/**
 * One-way latch: becomes true the first time real playback reaches the
 * earliest real lyric cue, and stays true for the rest of the track. A pure
 * recompute would flicker back to false on a backward seek and resurrect the
 * intro mid-song (the exact failure mode commit da1d667 fixed for the
 * wall-clock intro timer) — so termination is remembered here instead.
 */
export function useIntroTerminationLatch(input: UseIntroTerminationLatchInput): boolean {
  const { trackKey, ...predicateInput } = input;
  const [terminated, setTerminated] = useState(false);
  const trackKeyRef = useRef(trackKey);

  useEffect(() => {
    if (trackKeyRef.current === trackKey) return;
    trackKeyRef.current = trackKey;
    setTerminated(false);
  }, [trackKey]);

  useEffect(() => {
    if (terminated) return;
    if (computeIntroTerminatedByLyric(predicateInput)) setTerminated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    terminated,
    predicateInput.subtitlesEnabled,
    predicateInput.subtitleReady,
    predicateInput.subtitleSegments,
    predicateInput.currentTimeMs,
  ]);

  return terminated;
}

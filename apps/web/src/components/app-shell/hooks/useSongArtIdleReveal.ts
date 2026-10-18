import { useCallback, useEffect, useRef, useState } from "react";

import { usePlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import { playbackFocusTiming } from "@/lib/playbackFocusTiming";

type UseSongArtIdleRevealOptions = {
  /** Shelved theatre with the song-art toggle on. */
  enabled: boolean;
  playFocusActive: boolean;
  /** Re-arms a pending reveal on navigation. */
  pathname: string;
};

/**
 * Shelved-theatre background reveal: after idle playback the song art fades in
 * on every page; the cinematic body fade (usePlaybackFocusBody) follows
 * `songArt.contentFadeAfterMs` later on routes that allow it. A click or key
 * press clears the art and re-arms on the longer restore delay.
 */
export function useSongArtIdleReveal({ enabled, playFocusActive, pathname }: UseSongArtIdleRevealOptions) {
  const playbackFocusSuppressed = usePlaybackFocusSuppressed();
  const active = enabled && playFocusActive && !playbackFocusSuppressed;
  const initialDelayMs = playbackFocusTiming.songArt.delayMs;

  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  /** After a dismiss, activity keeps re-arming on the restore delay until this passes. */
  const restoreUntilRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const arm = useCallback((initialMs: number) => {
    clearTimer();
    const delayMs =
      performance.now() < restoreUntilRef.current ? playbackFocusTiming.body.restoreDelayMs : initialMs;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      visibleRef.current = true;
      setVisible(true);
    }, delayMs);
  }, [clearTimer]);

  // (Re)arm on enable / route change; drop immediately when inactive.
  useEffect(() => {
    if (!active) {
      clearTimer();
      restoreUntilRef.current = 0;
      visibleRef.current = false;
      setVisible(false);
      return;
    }
    if (!visibleRef.current) arm(initialDelayMs);
    return clearTimer;
  }, [active, arm, clearTimer, initialDelayMs, pathname]);

  useEffect(() => {
    if (!active) return;

    // Movement only postpones a pending reveal; it never clears visible art.
    const onActivity = () => {
      if (!visibleRef.current) arm(initialDelayMs);
    };
    // Click / key clears the art. Passive and non-blocking so the page still gets the event.
    const onDismiss = () => {
      if (visibleRef.current) {
        visibleRef.current = false;
        setVisible(false);
        restoreUntilRef.current = performance.now() + playbackFocusTiming.body.restoreDelayMs;
        arm(initialDelayMs);
        return;
      }
      arm(initialDelayMs);
    };

    window.addEventListener("pointermove", onActivity, { passive: true });
    window.addEventListener("wheel", onActivity, { passive: true });
    window.addEventListener("scroll", onActivity, { passive: true, capture: true });
    window.addEventListener("pointerdown", onDismiss, { passive: true, capture: true });
    window.addEventListener("keydown", onDismiss, { capture: true });
    return () => {
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("wheel", onActivity);
      window.removeEventListener("scroll", onActivity, { capture: true });
      window.removeEventListener("pointerdown", onDismiss, { capture: true });
      window.removeEventListener("keydown", onDismiss, { capture: true });
    };
  }, [active, arm, initialDelayMs]);

  return visible;
}

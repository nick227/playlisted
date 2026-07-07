import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject, type SyntheticEvent } from "react";
import { useLocation } from "react-router-dom";

import { isBrowseSwipeNavigation } from "@/lib/browseNavigation/types";

import { getPlaybackFocusBodyFadeSuppressed } from "@/lib/playbackFocusBodyFade";
import { bodyFadedAtTrackMsForArtistVisual } from "@/lib/playbackFocus/focusLaneSequence";
import { isPlaybackFocusInteractiveTarget } from "@/lib/playbackFocus/interactiveTarget";
import { usePlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import type { PlaybackFocusState } from "@/lib/playbackFocus/types";
import { playbackFocusTiming, playbackFocusUserActivityEnabled } from "@/lib/playbackFocusTiming";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";

import { useTheatreMode } from "../useTheatreMode";

type PlayFocusArmReason = "initial" | "activity";

type UsePlaybackFocusBodyOptions = {
  playFocusActive: boolean;
  focusTrackKey: string;
  focusTrackSourceLabel?: string;
  currentTimeMsRef: RefObject<number>;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  pathname: string;
  search: string;
};

function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "a",
        "button",
        "input",
        "select",
        "textarea",
        "[role='button']",
        "[role='link']",
        "[data-bottom-player]",
        ".topbar-chrome",
        ".sidebar-nav-content",
      ].join(","),
    ),
  );
}

/**
 * Manages cinematic body fade: hide page chrome after idle playback,
 * reveal on user activity, and expose focus-lane state for subtitles.
 */
export function usePlaybackFocusBody({
  playFocusActive,
  focusTrackKey,
  focusTrackSourceLabel,
  currentTimeMsRef,
  scrollContainerRef,
  pathname,
  search,
}: UsePlaybackFocusBodyOptions) {
  const playbackFocusSuppressed = usePlaybackFocusSuppressed();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const { theatreFxEnabled } = useTheatreMode();
  const location = useLocation();

  const bodyFocusTimerRef = useRef<number | null>(null);
  const miniViewTimerRef = useRef<number | null>(null);
  const snapRevealTimerRef = useRef<number | null>(null);
  const revealInteractionTimerRef = useRef<number | null>(null);
  const previousFocusTrackKeyRef = useRef(focusTrackKey);
  const previousLocationKeyRef = useRef(`${pathname}\n${search}`);
  const bodyFocusHiddenRef = useRef(false);

  const [bodyFocusHidden, setBodyFocusHidden] = useState(false);
  const [bodyFadedAtTrackMs, setBodyFadedAtTrackMs] = useState<number | null>(null);
  const [miniViewVisible, setMiniViewVisible] = useState(false);
  const [snapReveal, setSnapReveal] = useState(false);
  const [revealInteractionActive, setRevealInteractionActive] = useState(false);

  const fadeConfig = getPlaybackFocusBodyFadeSuppressed({
    pathname,
    subtitlesEnabled,
    theatreFxEnabled,
  });
  const bodyFadeDisabled = fadeConfig.disabled;
  const customBodyDelayMs = fadeConfig.delayMs;

  useEffect(() => {
    bodyFocusHiddenRef.current = bodyFocusHidden;
  }, [bodyFocusHidden]);

  const clearFocusTimer = useCallback(() => {
    if (bodyFocusTimerRef.current !== null) {
      window.clearTimeout(bodyFocusTimerRef.current);
      bodyFocusTimerRef.current = null;
    }
    if (miniViewTimerRef.current !== null) {
      window.clearTimeout(miniViewTimerRef.current);
      miniViewTimerRef.current = null;
    }
  }, []);

  const clearSnapRevealTimer = useCallback(() => {
    if (snapRevealTimerRef.current === null) return;
    window.clearTimeout(snapRevealTimerRef.current);
    snapRevealTimerRef.current = null;
  }, []);

  const clearRevealInteractionTimer = useCallback(() => {
    if (revealInteractionTimerRef.current === null) return;
    window.clearTimeout(revealInteractionTimerRef.current);
    revealInteractionTimerRef.current = null;
  }, []);

  const armPlayFocus = useCallback((reason: PlayFocusArmReason = "initial") => {
    clearFocusTimer();
    setBodyFocusHidden(false);
    setBodyFadedAtTrackMs(null);
    setMiniViewVisible(false);
    if (!playFocusActive || playbackFocusSuppressed || bodyFadeDisabled) return;

    const bodyDelayMs =
      reason === "activity"
        ? playbackFocusTiming.body.restoreDelayMs
        : (customBodyDelayMs ?? playbackFocusTiming.body.delayMs);

    bodyFocusTimerRef.current = window.setTimeout(() => {
      setBodyFocusHidden(true);
      setBodyFadedAtTrackMs(currentTimeMsRef.current);
      bodyFocusTimerRef.current = null;
    }, bodyDelayMs);

    if (focusTrackSourceLabel === "Radio") {
      miniViewTimerRef.current = window.setTimeout(() => {
        setMiniViewVisible(true);
        miniViewTimerRef.current = null;
      }, playbackFocusTiming.miniView.delayMs);
    }
  }, [
    bodyFadeDisabled,
    clearFocusTimer,
    currentTimeMsRef,
    customBodyDelayMs,
    focusTrackSourceLabel,
    playFocusActive,
    playbackFocusSuppressed,
  ]);

  // Disable fade timers when focus is suppressed or body fade is off for this route.
  useEffect(() => {
    if (!playbackFocusSuppressed && !bodyFadeDisabled) return;
    clearFocusTimer();
    setBodyFocusHidden(false);
    setBodyFadedAtTrackMs(null);
    setMiniViewVisible(false);
  }, [bodyFadeDisabled, clearFocusTimer, playbackFocusSuppressed]);

  // Re-arm on track/route change; clear immediately when playback stops.
  useEffect(() => {
    const locationKey = `${pathname}\n${search}`;
    const trackChanged = previousFocusTrackKeyRef.current !== focusTrackKey;
    const locationChanged = previousLocationKeyRef.current !== locationKey;

    previousFocusTrackKeyRef.current = focusTrackKey;
    previousLocationKeyRef.current = locationKey;

    if (
      locationChanged &&
      isBrowseSwipeNavigation(location.state) &&
      location.state.preserveTheatreFocus &&
      bodyFocusHiddenRef.current &&
      !playbackFocusSuppressed &&
      !bodyFadeDisabled
    ) {
      clearFocusTimer();
      setBodyFadedAtTrackMs(bodyFadedAtTrackMsForArtistVisual(currentTimeMsRef.current));
      setMiniViewVisible(false);
      return () => {
        clearFocusTimer();
        clearSnapRevealTimer();
        clearRevealInteractionTimer();
      };
    }

    if (!playFocusActive) {
      clearFocusTimer();
      setBodyFocusHidden(false);
      setBodyFadedAtTrackMs(null);
      setMiniViewVisible(false);
      return;
    }

    if (
      trackChanged &&
      !locationChanged &&
      bodyFocusHiddenRef.current &&
      !playbackFocusSuppressed &&
      !bodyFadeDisabled
    ) {
      clearFocusTimer();
      setBodyFadedAtTrackMs(bodyFadedAtTrackMsForArtistVisual(currentTimeMsRef.current));
      setMiniViewVisible(false);
      return () => {
        clearFocusTimer();
        clearSnapRevealTimer();
        clearRevealInteractionTimer();
      };
    }

    armPlayFocus("initial");
    return () => {
      clearFocusTimer();
      clearSnapRevealTimer();
      clearRevealInteractionTimer();
    };
  }, [
    armPlayFocus,
    bodyFadeDisabled,
    clearFocusTimer,
    clearRevealInteractionTimer,
    clearSnapRevealTimer,
    currentTimeMsRef,
    focusTrackKey,
    pathname,
    playbackFocusSuppressed,
    playFocusActive,
    search,
    location.state,
  ]);

  // Page activity resets the pending hide timer without restoring hidden content.
  useEffect(() => {
    if (!playbackFocusUserActivityEnabled || !playFocusActive) return;

    const onPageActivity = () => {
      if (bodyFocusHiddenRef.current) return;
      armPlayFocus("initial");
    };
    const scrollContainer = scrollContainerRef?.current;

    window.addEventListener("pointermove", onPageActivity, { passive: true });
    window.addEventListener("pointerdown", onPageActivity, { passive: true });
    window.addEventListener("wheel", onPageActivity, { passive: true });
    window.addEventListener("scroll", onPageActivity, { passive: true });
    scrollContainer?.addEventListener("scroll", onPageActivity, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPageActivity);
      window.removeEventListener("pointerdown", onPageActivity);
      window.removeEventListener("wheel", onPageActivity);
      window.removeEventListener("scroll", onPageActivity);
      scrollContainer?.removeEventListener("scroll", onPageActivity);
    };
  }, [armPlayFocus, playFocusActive, scrollContainerRef]);

  const revealPage = useCallback(() => {
    if (!bodyFocusHidden && !miniViewVisible) return;
    clearSnapRevealTimer();
    setSnapReveal(true);
    armPlayFocus("activity");
    snapRevealTimerRef.current = window.setTimeout(() => {
      setSnapReveal(false);
      snapRevealTimerRef.current = null;
    }, playbackFocusTiming.snapRevealMs);
  }, [armPlayFocus, bodyFocusHidden, clearSnapRevealTimer, miniViewVisible]);

  const consumeRevealEvent = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const finishRevealInteraction = useCallback((event: SyntheticEvent) => {
    if (isPlaybackFocusInteractiveTarget(event.target)) return;
    consumeRevealEvent(event);
    clearRevealInteractionTimer();
    revealInteractionTimerRef.current = window.setTimeout(() => {
      setRevealInteractionActive(false);
      revealInteractionTimerRef.current = null;
    }, 250);
  }, [clearRevealInteractionTimer, consumeRevealEvent]);

  const handleRevealPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (isPlaybackFocusInteractiveTarget(event.target)) return;
    consumeRevealEvent(event);
    clearRevealInteractionTimer();
    setRevealInteractionActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    revealPage();
  }, [clearRevealInteractionTimer, consumeRevealEvent, revealPage]);

  const bodyFocusMode =
    playFocusActive && bodyFocusHidden && !playbackFocusSuppressed && !bodyFadeDisabled;
  const miniViewMode = playFocusActive && miniViewVisible && !playbackFocusSuppressed;
  const revealShieldVisible = bodyFocusMode || snapReveal || revealInteractionActive;

  useEffect(() => {
    if (!revealShieldVisible || bodyFocusMode) return;

    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      if (isPlaybackFocusInteractiveTarget(event.target)) return;
      if (isNativeInteractiveTarget(event.target)) return;
      revealPage();
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown, { capture: true });
    };
  }, [bodyFocusMode, revealPage, revealShieldVisible]);

  const focusState = useMemo<PlaybackFocusState>(
    () => ({
      playFocusActive: playFocusActive && !playbackFocusSuppressed,
      hasBodyFaded: bodyFocusMode,
      bodyFadedAtTrackMs: bodyFocusMode ? bodyFadedAtTrackMs : null,
    }),
    [bodyFadedAtTrackMs, bodyFocusMode, playFocusActive, playbackFocusSuppressed],
  );

  return {
    bodyFocusMode,
    miniViewMode,
    revealShieldVisible,
    snapReveal,
    focusState,
    revealPage,
    revealShieldHandlers: {
      onPointerDown: handleRevealPointerDown,
      onPointerUp: finishRevealInteraction,
      onPointerCancel: finishRevealInteraction,
      onLostPointerCapture: finishRevealInteraction,
      onClick: finishRevealInteraction,
    },
  };
}

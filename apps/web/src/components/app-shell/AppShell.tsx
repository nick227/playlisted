import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { useLocation } from "react-router-dom";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";
import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";
import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { isPlaybackFocusBodyFadeSuppressed } from "@/lib/playbackFocusBodyFade";
import { usePlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";

import { BackgroundLayer } from "./BackgroundLayer";
import { useTheatreMode } from "./useTheatreMode";

import { BottomPlayer } from "./BottomPlayer";
import { PlaybackFocusLayer, type PlaybackFocusTrack } from "./PlaybackFocusLayer";
import { QueuePanel } from "./QueuePanel";
import { Sidebar } from "./Sidebar";
import { PlaybackFocusLane } from "./PlaybackFocusLane/PlaybackFocusLane";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

type PlayFocusArmReason = "initial" | "activity";

export function AppShell({ children }: AppShellProps) {
  const mainRef = useRef<HTMLElement | null>(null);
  const bodyFocusTimerRef = useRef<number | null>(null);
  const miniViewTimerRef = useRef<number | null>(null);
  const snapRevealTimerRef = useRef<number | null>(null);
  const resumeAfterNavRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bodyFocusHidden, setBodyFocusHidden] = useState(false);
  const [bodyFadedAtTrackMs, setBodyFadedAtTrackMs] = useState<number | null>(null);
  const [miniViewVisible, setMiniViewVisible] = useState(false);
  const [snapReveal, setSnapReveal] = useState(false);
  const playbackFocusSuppressed = usePlaybackFocusSuppressed();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const { theatreFxEnabled } = useTheatreMode();
  const location = useLocation();
  const bodyFadeDisabled = isPlaybackFocusBodyFadeSuppressed({
    pathname: location.pathname,
    subtitlesEnabled,
    theatreFxEnabled,
  });
  const {
    currentTrack,
    isPlaying,
    playbackContext,
    playerShellActive,
    state,
    resumePlaybackIfPaused,
  } = useAudioPlayer();
  const {
    playing: radioPlaying,
    nowPlaying: radioNowPlaying,
    audioRef: radioAudioRef,
    radioUiMounted,
  } = useRadioPlayer();
  const { currentTime: siteCurrentTime } = usePlaybackTransport();
  const currentTimeMsRef = useRef(0);

  useEffect(() => {
    if (radioPlaying && radioNowPlaying) {
      const audio = radioAudioRef.current;
      currentTimeMsRef.current = (audio?.currentTime ?? radioNowPlaying.elapsedSeconds ?? 0) * 1000;
      return;
    }
    currentTimeMsRef.current = siteCurrentTime * 1000;
  }, [radioAudioRef, radioNowPlaying, radioPlaying, siteCurrentTime]);

  const focusTrack = useMemo<PlaybackFocusTrack | null>(() => {
    if (radioPlaying && radioNowPlaying) {
      return {
        id: radioNowPlaying.id,
        title: radioNowPlaying.title,
        artworkUrl: radioNowPlaying.artworkUrl,
        ownerName: radioNowPlaying.uploader.displayName,
        ownerUsername: radioNowPlaying.uploader.username,
        playlistId: radioNowPlaying.playlist.id,
        playlistTitle: radioNowPlaying.playlist.title,
        playlistSlug: radioNowPlaying.playlist.slug,
        sourceLabel: "Radio",
        sourceHref: "/radio",
      };
    }

    if (isPlaying && currentTrack) {
      return {
        id: currentTrack.id,
        title: currentTrack.title,
        artworkUrl: currentTrack.artworkUrl,
        ownerName: currentTrack.ownerName,
        ownerUsername: currentTrack.ownerUsername ?? playbackContext.playlistOwnerUsername,
        playlistId: playbackContext.playlistId ?? currentTrack.publishedPlaylistId ?? null,
        playlistTitle: currentTrack.playlistTitle,
        playlistSlug: currentTrack.playlistSlug ?? playbackContext.playlistSlug,
      };
    }

    return null;
  }, [currentTrack, isPlaying, playbackContext, radioNowPlaying, radioPlaying]);

  const playFocusActive = Boolean(focusTrack);
  const focusTrackKey = `${focusTrack?.sourceLabel ?? "player"}:${focusTrack?.id ?? "none"}`;

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

  const armPlayFocus = useCallback((reason: PlayFocusArmReason = "initial") => {
    clearFocusTimer();
    setBodyFocusHidden(false);
    setBodyFadedAtTrackMs(null);
    setMiniViewVisible(false);
    if (!playFocusActive || playbackFocusSuppressed || bodyFadeDisabled) return;
    const bodyDelayMs =
      reason === "activity"
        ? playbackFocusTiming.body.restoreDelayMs
        : playbackFocusTiming.body.delayMs;
    const miniViewDelayMs = playbackFocusTiming.miniView.delayMs;
    bodyFocusTimerRef.current = window.setTimeout(() => {
      setBodyFocusHidden(true);
      setBodyFadedAtTrackMs(currentTimeMsRef.current);
      bodyFocusTimerRef.current = null;
    }, bodyDelayMs);
    if (focusTrack?.sourceLabel === "Radio") {
      miniViewTimerRef.current = window.setTimeout(() => {
        setMiniViewVisible(true);
        miniViewTimerRef.current = null;
      }, miniViewDelayMs);
    }
  }, [bodyFadeDisabled, clearFocusTimer, playFocusActive, playbackFocusSuppressed, focusTrack?.sourceLabel]);

  useEffect(() => {
    if (!playbackFocusSuppressed && !bodyFadeDisabled) return;
    clearFocusTimer();
    setBodyFocusHidden(false);
    setBodyFadedAtTrackMs(null);
    setMiniViewVisible(false);
  }, [bodyFadeDisabled, clearFocusTimer, playbackFocusSuppressed]);

  useEffect(() => {
    armPlayFocus("initial");
    return () => {
      clearFocusTimer();
      clearSnapRevealTimer();
    };
  }, [armPlayFocus, bodyFadeDisabled, clearFocusTimer, clearSnapRevealTimer, focusTrackKey, location.pathname, location.search, playbackFocusSuppressed]);

  useEffect(() => {
    return () => {
      resumeAfterNavRef.current = state === "playing" || state === "loading";
    };
  }, [location.pathname, state]);

  useEffect(() => {
    if (!resumeAfterNavRef.current) return;
    resumeAfterNavRef.current = false;
    const timer = window.setTimeout(() => {
      if (radioPlaying) return;
      resumePlaybackIfPaused();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, radioPlaying, resumePlaybackIfPaused]);

  useEffect(() => {
    if (radioPlaying) resumeAfterNavRef.current = false;
  }, [radioPlaying]);

  useEffect(() => {
    if (!playFocusActive) return;

    const onUserActivity = () => {
      // restoreDelayMs only applies when activity revealed a hidden body;
      // while still visible, activity restarts the full initial delay.
      armPlayFocus(bodyFocusHidden ? "activity" : "initial");
    };

    window.addEventListener("pointermove", onUserActivity, { passive: true });
    window.addEventListener("pointerdown", onUserActivity, { passive: true });
    window.addEventListener("wheel", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity);
    return () => {
      window.removeEventListener("pointermove", onUserActivity);
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("wheel", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
    };
  }, [armPlayFocus, bodyFocusHidden, playFocusActive]);

  useLayoutEffect(() => {
    if (location.hash) return;

    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, location.hash]);

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

  const handleRevealEvent = useCallback((event: SyntheticEvent) => {
    consumeRevealEvent(event);
    revealPage();
  }, [consumeRevealEvent, revealPage]);

  const bodyFocusMode =
    playFocusActive && bodyFocusHidden && !playbackFocusSuppressed && !bodyFadeDisabled;
  const miniViewMode = playFocusActive && miniViewVisible && !playbackFocusSuppressed;
  const revealShieldVisible = bodyFocusMode || snapReveal;
  const radioShellActive =
    radioPlaying && Boolean(radioNowPlaying) && location.pathname !== "/radio" && !radioUiMounted;
  const shellHasPlayer = playerShellActive || radioShellActive;
  const isChatPage = location.pathname === "/chat";
  const playFocusHasPlayer = shellHasPlayer;
  const focusState = useMemo(
    () => ({
      playFocusActive: playFocusActive && !playbackFocusSuppressed,
      hasBodyFaded: bodyFocusMode,
      bodyFadedAtTrackMs: bodyFocusMode ? bodyFadedAtTrackMs : null,
    }),
    [bodyFadedAtTrackMs, bodyFocusMode, playFocusActive, playbackFocusSuppressed],
  );

  return (
    <div className="relative flex min-h-full w-full max-w-full overflow-x-clip bg-transparent">
      <BackgroundLayer />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex min-h-full min-w-0 w-full max-w-full flex-1 flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          cinematicBgTransparent={bodyFocusMode}
        />
        <main
          ref={mainRef}
          key={location.pathname}
          className={`player-shell-transition play-focus-content flex-1 min-w-0 max-w-full overflow-x-clip px-4 md:px-8 ${
            bodyFocusMode ? "is-play-focus-hidden" : ""
          } ${
            snapReveal ? "is-play-focus-revealing" : ""
          } ${
            isChatPage
              ? "flex min-h-0 flex-col overflow-hidden pb-0"
              : `overflow-y-auto ${
                  shellHasPlayer
                    ? "pb-[calc(var(--spacing-player-safe-mobile)+1.5rem)] md:pb-[calc(var(--spacing-player)+1.5rem)]"
                    : "pb-6"
                }`
          }`}
        >
          {children}
        </main>
      </div>
      {revealShieldVisible ? (
        <button
          type="button"
          className={`play-focus-theatre-hit-area${playFocusHasPlayer ? "" : " play-focus-theatre-hit-area--no-player"}`}
          onPointerDown={handleRevealEvent}
          onPointerUp={consumeRevealEvent}
          onClick={handleRevealEvent}
          aria-label="Show page content"
        />
      ) : null}
      <PlaybackFocusLayer
        visible={miniViewMode}
        track={focusTrack}
        onReturn={revealPage}
        withPlayer={playFocusHasPlayer}
        snapReveal={snapReveal}
      />
      <BottomPlayer />
      <PlaybackFocusLane focusState={focusState} />
      <QueuePanel />
    </div>
  );
}

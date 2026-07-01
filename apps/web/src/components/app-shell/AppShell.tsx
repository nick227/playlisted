import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";
import { playbackFocusTiming } from "@/lib/playbackFocusTiming";

import { BackgroundLayer } from "./BackgroundLayer";

import { BottomPlayer } from "./BottomPlayer";
import { PlaybackFocusLayer, type PlaybackFocusTrack } from "./PlaybackFocusLayer";
import { QueuePanel } from "./QueuePanel";
import { Sidebar } from "./Sidebar";
import { PlaybackFocusLane } from "./PlaybackFocusLane/PlaybackFocusLane";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const mainRef = useRef<HTMLElement | null>(null);
  const bodyFocusTimerRef = useRef<number | null>(null);
  const miniViewTimerRef = useRef<number | null>(null);
  const snapRevealTimerRef = useRef<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bodyFocusHidden, setBodyFocusHidden] = useState(false);
  const [miniViewVisible, setMiniViewVisible] = useState(false);
  const [snapReveal, setSnapReveal] = useState(false);
  const location = useLocation();
  const {
    currentTrack,
    isPlaying,
    playbackContext,
    playerShellActive,
  } = useAudioPlayer();
  const {
    playing: radioPlaying,
    nowPlaying: radioNowPlaying,
  } = useRadioPlayer();

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

  const armPlayFocus = useCallback(() => {
    clearFocusTimer();
    setBodyFocusHidden(false);
    setMiniViewVisible(false);
    if (!playFocusActive) return;
    const bodyDelayMs = playbackFocusTiming.body.delayMs > 0
      ? playbackFocusTiming.body.delayMs
      : 3000;
    const miniViewDelayMs = playbackFocusTiming.miniView.delayMs > 0
      ? playbackFocusTiming.miniView.delayMs
      : 3000;
    bodyFocusTimerRef.current = window.setTimeout(() => {
      setBodyFocusHidden(true);
      bodyFocusTimerRef.current = null;
    }, bodyDelayMs);
    if (focusTrack?.sourceLabel === "Radio") {
      miniViewTimerRef.current = window.setTimeout(() => {
        setMiniViewVisible(true);
        miniViewTimerRef.current = null;
      }, miniViewDelayMs);
    }
  }, [clearFocusTimer, playFocusActive, focusTrack?.sourceLabel]);

  useEffect(() => {
    armPlayFocus();
    return () => {
      clearFocusTimer();
      clearSnapRevealTimer();
    };
  }, [armPlayFocus, clearFocusTimer, clearSnapRevealTimer, focusTrackKey, location.pathname, location.search]);

  useEffect(() => {
    if (!playFocusActive) return;

    const onUserActivity = () => {
      armPlayFocus();
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
  }, [armPlayFocus, playFocusActive]);

  useLayoutEffect(() => {
    if (location.hash) return;

    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, location.hash]);

  const revealPage = useCallback(() => {
    if (!bodyFocusHidden && !miniViewVisible) return;
    clearSnapRevealTimer();
    setSnapReveal(true);
    armPlayFocus();
    snapRevealTimerRef.current = window.setTimeout(() => {
      setSnapReveal(false);
      snapRevealTimerRef.current = null;
    }, playbackFocusTiming.snapRevealMs);
  }, [armPlayFocus, bodyFocusHidden, clearSnapRevealTimer, miniViewVisible]);

  const bodyFocusMode = playFocusActive && bodyFocusHidden;
  const miniViewMode = playFocusActive && miniViewVisible;
  const playFocusHasPlayer = playerShellActive;
  const focusState = useMemo(
    () => ({
      playFocusActive,
      hasBodyFaded: bodyFocusMode,
    }),
    [bodyFocusMode, playFocusActive],
  );

  return (
    <div className="relative flex min-h-full w-full max-w-full overflow-x-clip bg-transparent">
      <BackgroundLayer />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex min-h-full min-w-0 w-full max-w-full flex-1 flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main
          ref={mainRef}
          key={location.pathname}
          className={`player-shell-transition play-focus-content flex-1 min-w-0 max-w-full overflow-x-clip overflow-y-auto px-4 pt-2 md:px-8 ${
            bodyFocusMode ? "is-play-focus-hidden" : ""
          } ${
            snapReveal ? "is-play-focus-revealing" : ""
          } ${
            playerShellActive
              ? "pb-[calc(var(--spacing-player-safe-mobile)+1.5rem)] md:pb-[calc(var(--spacing-player)+1.5rem)]"
              : "pb-6"
          }`}
        >
          {children}
        </main>
      </div>
      {bodyFocusMode ? (
        <button
          type="button"
          className={`play-focus-theatre-hit-area${playFocusHasPlayer ? "" : " play-focus-theatre-hit-area--no-player"}`}
          onPointerDown={(event) => {
            event.preventDefault();
            revealPage();
          }}
          onClick={revealPage}
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

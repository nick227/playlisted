import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

import type { SwipeDirection } from "@/lib/browseNavigation/types";
import { useSyncPlaybackBodyFocusHidden } from "@/lib/playbackBodyFocus";
import { buildMainContentClassName, isRadioShellActive } from "./appShellLayout";
import { BackgroundLayer } from "./BackgroundLayer";
import { BottomPlayer } from "./BottomPlayer";
import { usePlaybackFocusBody } from "./hooks/usePlaybackFocusBody";
import { usePlaybackFocusTrack } from "./hooks/usePlaybackFocusTrack";
import { usePlayerSpacebarShortcut } from "./hooks/usePlayerSpacebarShortcut";
import { useResumePlaybackAfterNav } from "./hooks/useResumePlaybackAfterNav";
import { useRouteScrollReset } from "./hooks/useRouteScrollReset";
import { PlaybackFocusLane } from "./PlaybackFocusLane/PlaybackFocusLane";
import { PlaybackFocusLayer } from "./PlaybackFocusLayer";
import { QueuePanel } from "./QueuePanel";
import { Sidebar } from "./Sidebar";
import { TheatreGestureLayer } from "./TheatreGestureLayer";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

/**
 * App chrome: sidebar, top bar, main content, player, and playback-focus overlays.
 * Behavior is delegated to hooks; this file only wires state to layout.
 */
export function AppShell({ children }: AppShellProps) {
  const mainRef = useRef<HTMLElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sitePlayerFocusCollapsed, setSitePlayerFocusCollapsed] = useState(false);
  const location = useLocation();

  // --- Playback source -------------------------------------------------------
  const {
    focusTrack,
    focusTrackKey,
    playFocusActive,
    currentTimeMsRef,
    radioPlaying,
    radioNowPlaying,
  } = usePlaybackFocusTrack();

  const { playerShellActive, currentTrack, togglePlay, skipNextTrack, playPreviousTrack } = useAudioPlayer();
  const { radioUiMounted, togglePlayback: toggleRadioPlayback, skipRadioTrack } = useRadioPlayer();

  // --- Cinematic body fade + focus lane --------------------------------------
  const playbackFocus = usePlaybackFocusBody({
    playFocusActive,
    focusTrackKey,
    focusTrackSourceLabel: focusTrack?.sourceLabel,
    currentTimeMsRef,
    scrollContainerRef: mainRef,
    pathname: location.pathname,
    search: location.search,
  });

  useSyncPlaybackBodyFocusHidden(playbackFocus.bodyFocusMode);

  const isRadioFocus = focusTrack?.source === "radio";
  const skipPlayback = useCallback(
    (direction: SwipeDirection) => {
      if (isRadioFocus) {
        skipRadioTrack(direction);
        return;
      }
      if (direction === "next") skipNextTrack();
      else playPreviousTrack();
    },
    [isRadioFocus, playPreviousTrack, skipNextTrack, skipRadioTrack],
  );

  // --- Global shortcuts + navigation side effects ----------------------------
  useResumePlaybackAfterNav(location.pathname, radioPlaying);
  usePlayerSpacebarShortcut({
    currentTrackId: currentTrack?.id,
    radioAudioUrl: radioNowPlaying?.audioUrl,
    radioPlaying,
    togglePlay,
    toggleRadioPlayback,
  });
  useRouteScrollReset(mainRef, location.pathname, location.search, location.hash);

  // --- Derived layout flags --------------------------------------------------
  const radioShellActive = isRadioShellActive(
    radioPlaying,
    Boolean(radioNowPlaying),
    location.pathname,
    radioUiMounted,
  );
  const shellHasPlayer = playerShellActive || radioShellActive;
  const reservePlayerSpace = shellHasPlayer || location.pathname === "/radio";
  const isChatPage = location.pathname === "/chat";
  const mainClassName = buildMainContentClassName({
    bodyFocusMode: playbackFocus.bodyFocusMode,
    snapReveal: playbackFocus.snapReveal,
    contentInputGuarded: playbackFocus.contentInputGuarded,
    isChatPage,
    shellHasPlayer: reservePlayerSpace,
  });

  // Keep collapsed player while advancing tracks in theatre; only expand when body returns.
  useEffect(() => {
    if (!playbackFocus.bodyFocusMode) {
      setSitePlayerFocusCollapsed(false);
    }
  }, [playbackFocus.bodyFocusMode]);

  return (
    <div className="relative flex h-dvh min-h-0 w-full max-w-full overflow-hidden bg-transparent">
      <BackgroundLayer />

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative z-40 flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          cinematicBgTransparent={playbackFocus.bodyFocusMode}
        />

        <main ref={mainRef} className={mainClassName}>
          {children}
        </main>
      </div>

      <TheatreGestureLayer
        visible={playbackFocus.revealShieldVisible}
        withPlayer={shellHasPlayer}
        onSkip={skipPlayback}
        onReveal={playbackFocus.revealPage}
      />

      <PlaybackFocusLayer
        visible={playbackFocus.miniViewMode}
        track={focusTrack}
        onReturn={playbackFocus.revealPage}
        onSkip={skipPlayback}
        withPlayer={shellHasPlayer}
        snapReveal={playbackFocus.snapReveal}
      />

      <BottomPlayer collapsedByFocusLane={sitePlayerFocusCollapsed} />
      <PlaybackFocusLane
        focusState={playbackFocus.focusState}
        withPlayer={shellHasPlayer}
        playerCollapsed={sitePlayerFocusCollapsed}
        onSitePlayerCollapseChange={setSitePlayerFocusCollapsed}
      />
      <QueuePanel />
    </div>
  );
}

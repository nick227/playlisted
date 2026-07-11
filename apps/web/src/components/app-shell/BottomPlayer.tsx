import {
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { VerticalVolumeControl } from "@/components/playback/VerticalVolumeControl";
import { coverFallback, playlistPath, playlistRecordingPath, profilePath } from "@/lib/routes";
import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { usePlaybackVolume } from "@/providers/PlaybackVolumeProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

type PlayerDisplayTrack = {
  id: string;
  title: string;
  artworkUrl?: string | null;
  ownerName?: string | null;
  ownerUsername?: string | null;
  playlistTitle?: string | null;
  playlistSlug?: string | null;
  publishedPlaylistId?: string | null;
};

const playerFooterClass =
  "fixed inset-x-0 bottom-0 z-[10000] w-full isolate overflow-visible border-t border-[var(--color-border)] bg-[var(--color-canvas-alt)] pb-[env(safe-area-inset-bottom,0px)] md:pb-0";

const playerBodyClass =
  "relative flex h-[var(--spacing-player-mobile)] w-full min-w-0 max-w-full items-center gap-3 px-4 py-2.5 md:h-[var(--spacing-player)] md:px-4 md:py-2";

type BottomPlayerProps = {
  collapsedByFocusLane?: boolean;
};

export function BottomPlayer({ collapsedByFocusLane = false }: BottomPlayerProps) {
  const location = useLocation();
  const {
    currentTrack,
    playerDismissSnapshot,
    playerBarExiting,
    isPlaying,
    playbackContext,
    togglePlay,
    playNext,
    playPrevious,
    setQueueOpen,
    autoplayEnabled,
    autoplayNextSegment,
    upNextPipeline,
    skipToUpNext,
  } = useAudioPlayer();
  const {
    playing: radioPlaying,
    nowPlaying: radioNowPlaying,
    audioRef: radioAudioRef,
    radioUiMounted,
    togglePlayback: toggleRadioPlayback,
  } = useRadioPlayer();
  const { volume, setVolume } = usePlaybackVolume();
  const { currentTime, duration } = usePlaybackTransport();

  const [radioCurrentTime, setRadioCurrentTime] = useState(0);

  const radioShellActive =
    radioPlaying && Boolean(radioNowPlaying) && location.pathname !== "/radio" && !radioUiMounted;
  const radioDisplayTrack = useMemo<PlayerDisplayTrack | null>(() => {
    if (!radioShellActive || !radioNowPlaying) return null;
    return {
      id: radioNowPlaying.id,
      title: radioNowPlaying.title,
      artworkUrl: radioNowPlaying.artworkUrl,
      ownerName: radioNowPlaying.uploader.displayName,
      ownerUsername: radioNowPlaying.uploader.username,
      playlistTitle: radioNowPlaying.playlist.title,
      playlistSlug: radioNowPlaying.playlist.slug,
      publishedPlaylistId: radioNowPlaying.playlist.id,
    };
  }, [radioNowPlaying, radioShellActive]);

  useEffect(() => {
    if (!radioShellActive) return;

    const updateTime = () => {
      setRadioCurrentTime(radioAudioRef.current?.currentTime ?? radioNowPlaying?.elapsedSeconds ?? 0);
    };
    updateTime();
    const timer = window.setInterval(updateTime, 500);
    return () => window.clearInterval(timer);
  }, [radioAudioRef, radioNowPlaying?.elapsedSeconds, radioShellActive]);

  const dismiss = playerDismissSnapshot;
  const displayTrack: PlayerDisplayTrack | null = currentTrack ?? dismiss?.track ?? radioDisplayTrack;
  const shellPlaybackContext =
    dismiss && !currentTrack ? dismiss.playbackContext : playbackContext;
  const shellCurrentTime = radioDisplayTrack
    ? radioCurrentTime
    : dismiss && !currentTrack ? dismiss.currentTime : currentTime;
  const shellDuration = radioDisplayTrack
    ? (radioNowPlaying?.durationSeconds ?? 0)
    : dismiss && !currentTrack ? dismiss.duration : duration;
  const shellIsPlaying = radioDisplayTrack
    ? radioPlaying
    : dismiss && !currentTrack ? false : isPlaying;
  const progress = shellDuration > 0 ? (shellCurrentTime / shellDuration) * 100 : 0;
  const sitePlayerActive = Boolean(currentTrack ?? dismiss?.track);
  const showQueueControls = sitePlayerActive && !playerBarExiting;

  if (!displayTrack) {
    return null;
  }

  const artStyle = displayTrack.artworkUrl
    ? undefined
    : { background: coverFallback(displayTrack.title) };

  const ownerUsername =
    displayTrack.ownerUsername ?? shellPlaybackContext.playlistOwnerUsername ?? null;
  const playlistSlug =
    displayTrack.playlistSlug ?? shellPlaybackContext.playlistSlug ?? null;
  const playlistId =
    shellPlaybackContext.playlistId ?? displayTrack.publishedPlaylistId ?? null;

  const playlistHref = playlistId
    ? playlistPath({
        id: playlistId,
        username: ownerUsername ?? undefined,
        slug: playlistSlug ?? undefined,
      })
    : null;

  const songHref = playlistId
    ? playlistRecordingPath(
        {
          id: playlistId,
          username: ownerUsername ?? undefined,
          slug: playlistSlug ?? undefined,
        },
        displayTrack,
      )
    : null;

  const artistHref = ownerUsername ? profilePath(ownerUsername) : null;

  const firstUpNext = upNextPipeline[0];
  const upNextName = firstUpNext?.label ?? autoplayNextSegment?.label;
  const canSkipToUpNext = showQueueControls && (upNextPipeline.length > 0 || autoplayEnabled);
  const upNextText =
    upNextPipeline.length > 1
      ? `${upNextPipeline.length} queued`
      : upNextName;

  return createPortal(
    <footer
      data-bottom-player
      data-gesture-exclude
      className={`${playerFooterClass}${playerBarExiting ? " bottom-player--exit pointer-events-none" : ""}${
        collapsedByFocusLane ? " bottom-player--focus-collapsed" : ""
      }`}
      aria-hidden={playerBarExiting}
    >
      <div
        className={`bottom-player__surface overflow-visible${playerBarExiting ? " bottom-player__surface--exit" : ""}`}
      >
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-surface-elevated)]"
          role="progressbar"
          aria-valuenow={progress}
        >
          <div
            className="h-full bg-[var(--color-brand)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div
          className={`bottom-player__body ${playerBodyClass}`}
          aria-hidden={collapsedByFocusLane}
        >
          <div className="bottom-player__section bottom-player__section--track group/card flex min-w-0 flex-1 items-center gap-3 md:max-w-[calc(50%-6rem)]">
            <div className="relative h-10 w-10 shrink-0 md:h-12 md:w-12">
              {displayTrack.artworkUrl ? (
                <img
                  src={displayTrack.artworkUrl}
                  alt=""
                  className="h-full w-full rounded object-cover"
                />
              ) : (
                <div className="h-full w-full rounded" style={artStyle} />
              )}
              <button
                type="button"
                onClick={radioDisplayTrack ? () => void toggleRadioPlayback() : togglePlay}
                aria-label={shellIsPlaying ? "Pause" : "Play"}
                className="absolute inset-0 grid place-items-center rounded bg-black/35 text-white transition hover:bg-black/45 md:hidden"
                disabled={playerBarExiting}
              >
                {shellIsPlaying ? (
                  <Pause size={17} fill="currentColor" />
                ) : (
                  <Play size={17} fill="currentColor" className="ml-0.5" />
                )}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex w-full min-w-0 items-center justify-between gap-2 md:justify-start">
                <div className="contents md:flex md:min-w-0 md:max-w-full md:items-center md:gap-1.5">
                  {songHref ? (
                    <Link
                      to={songHref}
                      className="block min-w-0 flex-1 cursor-pointer truncate pr-1 text-[15px] font-medium leading-[1.05] text-white hover:underline md:pr-0 md:text-sm md:leading-5"
                    >
                      {displayTrack.title}
                    </Link>
                  ) : (
                    <p className="min-w-0 flex-1 truncate pr-1 text-[15px] font-medium leading-[1.05] text-white md:pr-0 md:text-sm md:leading-5">
                      {displayTrack.title}
                    </p>
                  )}
                  <FavoriteHeartButton
                    className="h-7 w-7 shrink-0 cursor-pointer self-center"
                    target="recording"
                    id={displayTrack.id}
                    variant="inline"
                    inlineAlwaysVisible
                  />
                </div>
              </div>
              {displayTrack.ownerName || displayTrack.playlistTitle ? (
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {displayTrack.ownerName ? (
                    artistHref ? (
                      <Link to={artistHref} className="hover:underline">
                        {displayTrack.ownerName}
                      </Link>
                    ) : (
                      displayTrack.ownerName
                    )
                  ) : null}
                  {displayTrack.ownerName && displayTrack.playlistTitle ? (
                    <span className="mx-1 text-white/20" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {displayTrack.playlistTitle ? (
                    playlistHref ? (
                      <Link to={playlistHref} className="hover:underline">
                        {displayTrack.playlistTitle}
                      </Link>
                    ) : (
                      displayTrack.playlistTitle
                    )
                  ) : null}
                </p>
              ) : null}
              {canSkipToUpNext && upNextText && !playerBarExiting ? (
                <button
                  type="button"
                  onClick={skipToUpNext}
                  className="hidden max-w-full truncate text-left text-[10px] text-[var(--color-text-subtle)] hover:text-white hover:underline md:block"
                >
                  Up next · {upNextText}
                </button>
              ) : null}
            </div>
          </div>
          <div className="bottom-player__section bottom-player__section--controls bottom-player__controls-desktop">
            <div className="flex items-center gap-3">
              {showQueueControls ? (
                <button type="button" onClick={playPrevious} className="bottom-player__transport-button" aria-label="Previous song">
                  <SkipBack size={18} />
                </button>
              ) : (
                <span className="h-9 w-9" aria-hidden />
              )}
              <button
                type="button"
                onClick={radioDisplayTrack ? () => void toggleRadioPlayback() : togglePlay}
                aria-label={shellIsPlaying ? "Pause" : "Play"}
                className="bottom-player__play-button"
                disabled={playerBarExiting}
              >
                {shellIsPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              {showQueueControls ? (
                <button type="button" onClick={playNext} className="bottom-player__transport-button" aria-label="Next song">
                  <SkipForward size={18} />
                </button>
              ) : (
                <span className="h-9 w-9" aria-hidden />
              )}
            </div>
          </div>
          <div className="bottom-player__section bottom-player__section--actions bottom-player__actions-desktop">
            <VerticalVolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              variant="player"
            />

            {showQueueControls ? (
              <>
                <button
                  type="button"
                  onClick={() => setQueueOpen(true)}
                  className="bottom-player__action-button relative z-[60]"
                  aria-label="Next songs"
                >
                  <ListMusic size={18} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </footer>,
    document.body,
  );
}

import {
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { VerticalVolumeControl } from "@/components/playback/VerticalVolumeControl";
import { formatDuration } from "@/lib/format";
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
  "fixed inset-x-0 bottom-0 z-[10000] w-full isolate border-t border-[var(--color-border)] bg-[var(--color-canvas-alt)] pb-[env(safe-area-inset-bottom,0px)] md:pb-0";

const playerBodyClass =
  "relative flex h-[var(--spacing-player-mobile)] w-full min-w-0 max-w-full flex-col justify-center gap-1.5 px-4 py-2 md:grid md:h-[var(--spacing-player)] md:grid-cols-3 md:items-center md:gap-2 md:px-4";

const mobileActionButtonClass =
  "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-[var(--color-text-muted)] transition hover:bg-white/10 hover:text-white";

export function BottomPlayer() {
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
    closePlayback,
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
    pauseRadio,
  } = useRadioPlayer();
  const { volume, setVolume, toggleMute } = usePlaybackVolume();
  const { currentTime, duration, seek } = usePlaybackTransport();

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
  const showQueueControls = !radioDisplayTrack && !playerBarExiting;

  function handleClosePlayer() {
    pauseRadio();
    closePlayback();
  }

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
      className={`${playerFooterClass}${playerBarExiting ? " bottom-player--exit pointer-events-none" : ""}`}
      aria-hidden={playerBarExiting}
    >
      <div
        className={`bottom-player__surface${playerBarExiting ? " bottom-player__surface--exit" : ""}`}
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
        <div className={playerBodyClass}>
          <button
            type="button"
            onClick={handleClosePlayer}
            className="bottom-player__close-mobile"
            aria-label="Close player and stop playback"
            disabled={playerBarExiting}
          >
            <X size={16} />
          </button>
          <div className="bottom-player__section bottom-player__section--track group/card flex min-w-0 items-start gap-3 md:items-center">
            {displayTrack.artworkUrl ? (
              <img
                src={displayTrack.artworkUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded" style={artStyle} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex w-full min-w-0 items-start justify-between gap-2 md:justify-start md:items-center">
                <div className="contents md:flex md:min-w-0 md:max-w-full md:items-center md:gap-1.5">
                  {songHref ? (
                    <Link
                      to={songHref}
                      className="block min-w-0 flex-1 cursor-pointer truncate pr-1 text-sm font-medium leading-5 text-white hover:underline md:pr-0"
                    >
                      {displayTrack.title}
                    </Link>
                  ) : (
                    <p className="min-w-0 flex-1 truncate pr-1 text-sm font-medium leading-5 text-white md:pr-0">
                      {displayTrack.title}
                    </p>
                  )}
                  <FavoriteHeartButton
                    className="h-7 w-7 shrink-0 cursor-pointer self-start md:self-center"
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
          <div className="bottom-player__section bottom-player__section--controls flex flex-col items-center justify-center gap-1 md:gap-1.5">
            <div className="flex items-center gap-4 md:gap-4">
              {showQueueControls ? (
                <button type="button" onClick={playPrevious} className="text-[var(--color-text-muted)] hover:text-white">
                  <SkipBack size={20} />
                </button>
              ) : (
                <span className="h-5 w-5" aria-hidden />
              )}
              <button
                type="button"
                onClick={radioDisplayTrack ? () => void toggleRadioPlayback() : togglePlay}
                aria-label={shellIsPlaying ? "Pause" : "Play"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
                disabled={playerBarExiting}
              >
                {shellIsPlaying ? (
                  <Pause size={20} fill="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              {showQueueControls ? (
                <button type="button" onClick={playNext} className="text-[var(--color-text-muted)] hover:text-white">
                  <SkipForward size={20} />
                </button>
              ) : (
                <span className="h-5 w-5" aria-hidden />
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] leading-none text-[var(--color-text-subtle)] md:text-xs md:leading-normal">
              <span>{formatDuration(shellCurrentTime)}</span>
              <input
                type="range"
                min={0}
                max={shellDuration || 100}
                value={shellCurrentTime}
                onChange={(e) => {
                  if (!radioDisplayTrack) seek(Number(e.target.value));
                }}
                className="hidden w-48 md:block accent-[var(--color-brand)]"
                disabled={playerBarExiting || Boolean(radioDisplayTrack)}
              />
              <span>{formatDuration(shellDuration)}</span>
            </div>
          </div>
          <div className="bottom-player__section bottom-player__section--actions bottom-player__actions-mobile">
            <VerticalVolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
              variant="player"
            />
            {showQueueControls ? (
              <>
                <button
                  type="button"
                  onClick={() => setQueueOpen(true)}
                  className={mobileActionButtonClass}
                  aria-label="Open up next"
                >
                  <ListMusic size={18} />
                </button>
              </>
            ) : null}
          </div>
          <div className="bottom-player__section bottom-player__section--actions bottom-player__actions-desktop">
            <VerticalVolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
              variant="player"
            />

            {showQueueControls ? <div className="mx-1 h-4 w-px bg-white/10" /> : null}

            {showQueueControls ? (
              <>
                <button
                  type="button"
                  onClick={() => setQueueOpen(true)}
                  className="text-[var(--color-text-muted)] transition hover:text-white"
                  aria-label="Open queue"
                >
                  <ListMusic size={20} />
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

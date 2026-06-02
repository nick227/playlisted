import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { formatDuration } from "@/lib/format";
import { coverFallback, playlistPath } from "@/lib/routes";
import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

const playerFooterClass =
  "fixed inset-x-0 bottom-0 z-[55] w-full border-t border-[var(--color-border)] bg-[var(--color-canvas-alt)] pb-[env(safe-area-inset-bottom,0px)] md:pb-0";

const playerBodyClass =
  "relative w-full min-w-0 max-w-full flex-col py-2 justify-center gap-2.5 px-4 md:grid md:h-[var(--spacing-player)] md:grid-cols-3 md:items-center md:gap-2 md:px-4";

export function BottomPlayer() {
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
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    volume,
    setVolume,
  } = useAudioPlayer();
  const { currentTime, duration, seek } = usePlaybackTransport();

  const prevVolumeRef = useRef(1);

  const dismiss = playerDismissSnapshot;
  const displayTrack = currentTrack ?? dismiss?.track ?? null;
  const shellPlaybackContext =
    dismiss && !currentTrack ? dismiss.playbackContext : playbackContext;
  const shellCurrentTime = dismiss && !currentTrack ? dismiss.currentTime : currentTime;
  const shellDuration = dismiss && !currentTrack ? dismiss.duration : duration;
  const shellIsPlaying = dismiss && !currentTrack ? false : isPlaying;
  const progress = shellDuration > 0 ? (shellCurrentTime / shellDuration) * 100 : 0;

  function handleVolumeMute() {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current);
    }
  }

  if (!displayTrack) {
    return null;
  }

  const artStyle = displayTrack.artworkUrl
    ? undefined
    : { background: coverFallback(displayTrack.title) };

  const playlistHref = shellPlaybackContext.playlistId
    ? playlistPath({
        id: shellPlaybackContext.playlistId,
        username: shellPlaybackContext.playlistOwnerUsername,
        slug: shellPlaybackContext.playlistSlug,
      })
    : null;

  const firstUpNext = upNextPipeline[0];
  const upNextName = firstUpNext?.label ?? autoplayNextSegment?.label;
  const canSkipToUpNext = upNextPipeline.length > 0 || autoplayEnabled;
  const upNextText =
    upNextPipeline.length > 1
      ? `${upNextPipeline.length} queued`
      : upNextName;

  return createPortal(
    <footer
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
          <div className="bottom-player__section bottom-player__section--track group/card flex min-w-0 items-center gap-3">
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
              <div className="flex items-center gap-1.5">
                {shellPlaybackContext.playlistId ? (
                  <Link
                    to={`${playlistHref ?? ""}#track-${displayTrack.id}`}
                    className="cursor-pointer block min-w-0 truncate text-sm font-medium text-white hover:underline"
                  >
                    {displayTrack.title}
                  </Link>
                ) : (
                  <p className="min-w-0 truncate text-sm font-medium text-white">{displayTrack.title}</p>
                )}
                <FavoriteHeartButton
                  className="cursor-pointer h-7 w-7 self-center"
                  target="recording"
                  id={displayTrack.id}
                  variant="inline"
                  inlineAlwaysVisible
                />
              </div>
              {playlistHref ? (
                <Link
                  to={playlistHref}
                  className="block truncate text-xs text-[var(--color-text-muted)] hover:underline"
                >
                  {[displayTrack.ownerName, displayTrack.playlistTitle].filter(Boolean).join(" • ")}
                </Link>
              ) : (
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {[displayTrack.ownerName, displayTrack.playlistTitle].filter(Boolean).join(" • ")}
                </p>
              )}
              {canSkipToUpNext && upNextText && !playerBarExiting ? (
                <button
                  type="button"
                  onClick={skipToUpNext}
                  className="block max-w-full truncate text-left text-[10px] text-[var(--color-text-subtle)] hover:text-white hover:underline"
                >
                  Up next · {upNextText}
                </button>
              ) : null}
            </div>
          </div>
          <div className="bottom-player__section bottom-player__section--controls flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-4">
              <button type="button" onClick={playPrevious} className="text-[var(--color-text-muted)] hover:text-white">
                <SkipBack size={20} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
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
              <button type="button" onClick={playNext} className="text-[var(--color-text-muted)] hover:text-white">
                <SkipForward size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
              <span>{formatDuration(shellCurrentTime)}</span>
              <input
                type="range"
                min={0}
                max={shellDuration || 100}
                value={shellCurrentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="hidden w-48 md:block accent-[var(--color-brand)]"
                disabled={playerBarExiting}
              />
              <span>{formatDuration(shellDuration)}</span>
            </div>
          </div>
          <div className="bottom-player__section bottom-player__section--actions hidden items-center justify-end gap-2 md:flex">
            <button
              type="button"
              onClick={handleVolumeMute}
              className="shrink-0 text-[var(--color-text-muted)] transition hover:text-white"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-[var(--color-brand)]"
              aria-label="Volume"
            />

            <div className="mx-1 h-4 w-px bg-white/10" />

            <button
              type="button"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              aria-label="Shuffle"
              className={`transition ${shuffle ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)] hover:text-white"}`}
            >
              <Shuffle size={18} />
            </button>

            <button
              type="button"
              onClick={cycleRepeat}
              aria-label="Repeat"
              className={`relative transition ${repeatMode !== "off" ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)] hover:text-white"}`}
            >
              <Repeat size={18} />
              {repeatMode === "one" && (
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-brand)] text-[8px] font-bold leading-none text-white">
                  1
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              className="text-[var(--color-text-muted)] transition hover:text-white"
              aria-label="Open queue"
            >
              <ListMusic size={20} />
            </button>
          </div>
        </div>
      </div>
    </footer>,
    document.body,
  );
}

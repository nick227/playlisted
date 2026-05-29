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
import { Link } from "react-router-dom";

import { formatDuration } from "@/lib/format";
import { coverFallback, playlistPath } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

export function BottomPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackContext,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setQueueOpen,
    autoplayEnabled,
    upNextPipeline,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    volume,
    setVolume,
  } = useAudioPlayer();

  const prevVolumeRef = useRef(1);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  function handleVolumeMute() {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current);
    }
  }

  if (!currentTrack) {
    return (
<footer className="sticky bottom-0 z-50 flex h-[var(--spacing-player-mobile)] sm:h-[var(--spacing-player)] shrink-0 items-center justify-center border-t border-[var(--color-border)] bg-[var(--color-canvas-alt)] text-sm text-[var(--color-text-muted)]">
  Select a track to start listening
</footer>
    );
  }

  const artStyle = currentTrack.artworkUrl
    ? undefined
    : { background: coverFallback(currentTrack.title) };

  const playlistHref = playbackContext.playlistId
    ? playlistPath({
        id: playbackContext.playlistId,
        username: playbackContext.playlistOwnerUsername,
        slug: playbackContext.playlistSlug,
      })
    : null;

  return (
    <footer className="sticky bottom-0 z-50 shrink-0 border-t border-[var(--color-border)] bg-[var(--color-canvas-alt)]">
      <div
        className="absolute left-0 right-0 top-0 h-0.5 bg-[var(--color-surface-elevated)]"
        role="progressbar"
        aria-valuenow={progress}
      >
        <div
          className="h-full bg-[var(--color-brand)] transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid h-[var(--spacing-player)] grid-cols-1 items-center gap-2 px-4 md:grid-cols-3">
        <div className="flex min-w-0 items-center gap-3">
          {currentTrack.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded" style={artStyle} />
          )}
          <div className="min-w-0">
            {playbackContext.playlistId ? (
              <Link
                to={`${playlistHref ?? ""}#track-${currentTrack.id}`}
                className="block truncate text-sm font-medium text-white hover:underline"
              >
                {currentTrack.title}
              </Link>
            ) : (
              <p className="truncate text-sm font-medium text-white">{currentTrack.title}</p>
            )}
            {playlistHref ? (
              <Link
                to={playlistHref}
                className="block truncate text-xs text-[var(--color-text-muted)] hover:underline"
              >
                {[currentTrack.ownerName, currentTrack.playlistTitle].filter(Boolean).join(" • ")}
              </Link>
            ) : (
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {[currentTrack.ownerName, currentTrack.playlistTitle].filter(Boolean).join(" • ")}
              </p>
            )}
            {autoplayEnabled && upNextPipeline.length > 0 ? (
              <p className="truncate text-[10px] text-[var(--color-text-subtle)]">
                Up next · {upNextPipeline.length} queued
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button type="button" onClick={playPrevious} className="text-[var(--color-text-muted)] hover:text-white">
              <SkipBack size={20} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            >
              {isPlaying ? (
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
            <span>{formatDuration(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="hidden w-48 md:block accent-[var(--color-brand)]"
            />
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
        <div className="hidden items-center justify-end gap-2 md:flex">
          {/* Volume */}
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

          {/* Shuffle */}
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Shuffle"
            className={`transition ${shuffle ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)] hover:text-white"}`}
          >
            <Shuffle size={18} />
          </button>

          {/* Repeat */}
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

          <div className="mx-1 h-4 w-px bg-white/10" />

          {/* Queue */}
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
    </footer>
  );
}

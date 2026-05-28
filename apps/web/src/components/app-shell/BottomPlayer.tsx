import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

import { formatDuration } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

export function BottomPlayer() {
  const {
    currentTrack,
    state,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setQueueOpen,
  } = useAudioPlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack) {
    return (
      <footer className="sticky bottom-0 z-50 flex h-[var(--spacing-player)] shrink-0 items-center justify-center border-t border-[var(--color-border)] bg-[var(--color-canvas-alt)] text-sm text-[var(--color-text-muted)]">
        Select a track to start listening
      </footer>
    );
  }

  const artStyle = currentTrack.artworkUrl
    ? undefined
    : { background: coverFallback(currentTrack.title) };

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
            <p className="truncate text-sm font-medium text-white">{currentTrack.title}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              {[currentTrack.ownerName, currentTrack.playlistTitle].filter(Boolean).join(" • ")}
            </p>
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            >
              {state === "playing" ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
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
        <div className="hidden items-center justify-end gap-3 md:flex">
          <Volume2 size={18} className="text-[var(--color-text-muted)]" />
          <Shuffle size={18} className="text-[var(--color-text-muted)]" />
          <Repeat size={18} className="text-[var(--color-text-muted)]" />
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="text-[var(--color-text-muted)] hover:text-white"
            aria-label="Open queue"
          >
            <ListMusic size={20} />
          </button>
        </div>
      </div>
    </footer>
  );
}

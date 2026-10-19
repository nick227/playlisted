import { type ReactNode, type MouseEvent, type KeyboardEvent } from "react";
import { Pause, Play } from "lucide-react";

import { WaveformScrubber } from "./WaveformScrubber";

export interface WaveformTrackRowProps {
  id: string;
  audioUrl?: string | null;
  isActive: boolean;
  isPlaying: boolean;
  onPlay?: () => void;
  titleSlot: ReactNode;
  subtitleSlot?: ReactNode;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  imageUrl?: string | null;
  imageShape?: "square" | "circle";
  imageOverlay?: ReactNode;
  /** Replaces the artwork thumbnail with a track number that swaps to play/pause on hover. */
  trackNumber?: number;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
}

export function WaveformTrackRow({
  id,
  audioUrl,
  isActive,
  isPlaying,
  onPlay,
  titleSlot,
  subtitleSlot,
  leftSlot,
  rightSlot,
  imageUrl,
  imageShape = "square",
  imageOverlay,
  trackNumber,
  onClick,
  onKeyDown,
  className = "",
}: WaveformTrackRowProps) {
  const rounded = imageShape === "circle" ? "rounded-full" : "rounded-md";

  function isProtectedClickTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest("button, input, select, textarea, a"));
  }

  function handleRowClick(e: MouseEvent<HTMLDivElement>) {
    if (isProtectedClickTarget(e.target)) return;
    if (onClick) onClick(e);
    else if (onPlay) onPlay();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (isProtectedClickTarget(e.target)) return;
    if (onKeyDown) onKeyDown(e);
    else if (e.key === " " && onPlay) {
      e.preventDefault();
      onPlay();
    }
  }

  const playPauseButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onPlay) onPlay();
      }}
      className={`absolute inset-0 flex items-center justify-center transition-opacity ${
        trackNumber == null ? `bg-black/50 ${rounded}` : ""
      } ${isActive ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"}`}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause size={16} className={trackNumber == null ? "text-white" : "text-[var(--color-brand)]"} fill="currentColor" />
      ) : (
        <Play size={16} className={`ml-0.5 ${trackNumber == null ? "text-white" : isActive ? "text-[var(--color-brand)]" : "text-white"}`} fill="currentColor" />
      )}
    </button>
  );

  if (trackNumber != null) {
    return (
      <div
        data-gesture-exclude
        id={`track-${id}`}
        className={`group/card relative flex min-h-14 items-start gap-3 px-2 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:gap-4 ${
          isActive ? "bg-[var(--color-surface)]/80" : "hover:bg-white/[0.04]"
        } ${className}`}
        role={onPlay ? "button" : undefined}
        tabIndex={onPlay ? 0 : undefined}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex h-10 w-8 shrink-0 items-center justify-center">
          <span
            className={`text-sm tabular-nums transition-opacity ${
              isActive ? "opacity-0" : "text-[var(--color-text-muted)] group-hover/card:opacity-0"
            }`}
          >
            {String(trackNumber).padStart(2, "0")}
          </span>
          {playPauseButton}
        </div>

        <div className="flex min-w-0 flex-1 flex-col text-left">
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col pt-0.5">
              {titleSlot}
              {subtitleSlot ? (
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 truncate text-xs text-[var(--color-text-muted)]">
                  {subtitleSlot}
                </div>
              ) : null}
            </div>
            {rightSlot ? (
              <div className="flex shrink-0 items-center justify-end gap-1.5 pt-0.5">{rightSlot}</div>
            ) : null}
          </div>

          {audioUrl ? (
            <div className="mt-2 w-full">
              <WaveformScrubber audioUrl={audioUrl} isActive={isActive} compact />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-gesture-exclude
      id={`track-${id}`}
      className={`group/card relative flex flex-col gap-1.5 rounded-lg py-1.5 transition-colors sm:py-2 outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
        isActive ? "bg-[var(--color-surface)]/80" : "hover:bg-white/[0.04]"
      } ${className}`}
      role={onPlay ? "button" : undefined}
      tabIndex={onPlay ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full items-start gap-3 sm:gap-4">
        <div className="flex shrink-0 flex-col items-center">
          <div className={`relative h-14 w-14 overflow-hidden sm:h-16 sm:w-16 ${rounded}`}>
            {imageUrl ? (
              <img src={imageUrl} alt="" className={`h-full w-full object-cover ${rounded}`} />
            ) : (
              <div className={`h-full w-full bg-white/10 ${rounded}`} />
            )}

            {imageOverlay || playPauseButton}

            {leftSlot}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-start text-left">
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col pt-0.5">
              {titleSlot}
              {subtitleSlot ? (
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 truncate text-xs text-[var(--color-text-muted)]">
                  {subtitleSlot}
                </div>
              ) : null}
            </div>
            
            {rightSlot ? (
              <div className="flex shrink-0 items-center justify-end gap-1.5 pt-0.5">{rightSlot}</div>
            ) : null}
          </div>

          {audioUrl ? (
            <div className="mt-1.5 max-w-[95%]">
              <WaveformScrubber audioUrl={audioUrl} isActive={isActive} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading stand-in for a numbered row. Mirrors the real row's spacing and line
 * boxes (title, subtitle, compact waveform) so swapping in data never moves
 * the content below it.
 */
export function WaveformTrackRowSkeleton() {
  return (
    <div className="flex min-h-14 items-start gap-3 px-2 py-3 sm:gap-4" aria-hidden="true">
      <div className="h-10 w-8 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col pt-0.5">
          <div className="flex h-5 items-center">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-white/[0.08]" />
          </div>
          <div className="mt-0.5 flex h-4 items-center">
            <div className="h-3 w-1/5 animate-pulse rounded bg-white/[0.05]" />
          </div>
        </div>
        <div className="mt-2 flex h-4 w-full items-center opacity-50">
          <div className="h-0.5 w-full bg-[var(--color-text-muted)] opacity-30" />
        </div>
      </div>
    </div>
  );
}

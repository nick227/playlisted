import { type ReactNode, type MouseEvent, type KeyboardEvent } from "react";
import { Pause, Play } from "lucide-react";

import { ArtworkCompactBars } from "./ArtworkCompactBars";
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

  return (
    <div
      id={`track-${id}`}
      className={`group/card relative flex flex-col gap-1.5 rounded-lg py-1.5 transition-colors sm:py-2 ${
        isActive ? "bg-[var(--color-surface)]/80" : "hover:bg-white/[0.04]"
      } ${className}`}
      role={onPlay ? "button" : undefined}
      tabIndex={onPlay ? 0 : undefined}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full items-start gap-2">
        <div className={`relative h-10 w-10 shrink-0 overflow-hidden sm:h-11 sm:w-11 ${rounded}`}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className={`h-full w-full object-cover ${rounded}`} />
          ) : (
            <div className={`h-full w-full bg-white/10 ${rounded}`} />
          )}

          {imageOverlay || (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlay) onPlay();
              }}
              className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${rounded} ${
                isActive ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
              }`}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={16} className="text-white" fill="currentColor" />
              ) : (
                <Play size={16} className="ml-0.5 text-white" fill="currentColor" />
              )}
            </button>
          )}

          {leftSlot}
          {!leftSlot ? <ArtworkCompactBars isActive={isActive} isPlaying={isPlaying} /> : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-start pt-0.5 text-left">
          {titleSlot}
          {subtitleSlot ? (
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 truncate text-xs text-[var(--color-text-muted)]">
              {subtitleSlot}
            </div>
          ) : null}
          {audioUrl ? (
            <div className="mt-1 w-full">
              <WaveformScrubber audioUrl={audioUrl} isActive={isActive} />
            </div>
          ) : null}
        </div>

        {rightSlot ? (
          <div className="flex shrink-0 items-center justify-end gap-1.5 pt-0.5">{rightSlot}</div>
        ) : null}
      </div>
    </div>
  );
}

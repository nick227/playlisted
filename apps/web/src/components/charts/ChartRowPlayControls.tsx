import { Pause, Play } from "lucide-react";

import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";

interface ChartRowPlayControlsProps {
  rank: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}

export function ChartRowPlayControls({ rank, isActive, isPlaying, onPlay }: ChartRowPlayControlsProps) {
  return (
    <>
      <PlaybackBars active={isActive} playing={isPlaying} />
      <button
        type="button"
        onClick={onPlay}
        className="flex w-8 items-center justify-center"
        aria-label={isPlaying ? "Pause" : isActive ? "Resume" : "Play"}
      >
        {isPlaying ? (
          <Pause size={16} className="text-white" fill="currentColor" />
        ) : (
          <>
            <span className="text-sm tabular-nums text-[var(--color-text-subtle)] group-hover/row:hidden">
              {rank}
            </span>
            <Play
              size={16}
              className="hidden text-white group-hover/row:block"
              fill="currentColor"
            />
          </>
        )}
      </button>
    </>
  );
}

import { Pause, Play } from "lucide-react";

import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";

interface ChartRowPlayControlsProps {
  rank: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}

export function ChartRowPlayControls({ rank, isActive, isPlaying, onPlay }: ChartRowPlayControlsProps) {
  const playLabel = isPlaying ? "Pause" : isActive ? "Resume" : "Play";

  return (
    <>
      <button
        type="button"
        onClick={onPlay}
        className="flex cursor-pointer items-center"
        aria-label={playLabel}
      >
        <PlaybackBars active={isActive} playing={isPlaying} />
      </button>
      <button
        type="button"
        onClick={onPlay}
        className="group/play flex w-8 cursor-pointer items-center justify-center"
        aria-label={playLabel}
      >
        {isPlaying ? (
          <Pause size={16} className="text-white" fill="currentColor" />
        ) : (
          <>
            <span className="text-sm tabular-nums text-[var(--color-text-subtle)] group-hover/play:hidden">
              {rank}
            </span>
            <Play
              size={16}
              className="hidden text-white group-hover/play:block"
              fill="currentColor"
            />
          </>
        )}
      </button>
    </>
  );
}

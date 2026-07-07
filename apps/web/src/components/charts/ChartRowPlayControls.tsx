import { ArtworkCompactBars } from "@/components/tracks/ArtworkCompactBars";

interface ChartRowPlayControlsProps {
  rank: number;
  isActive: boolean;
  isPlaying: boolean;
}

export function ChartRowPlayControls({ rank, isActive, isPlaying }: ChartRowPlayControlsProps) {
  if (isActive) {
    return <ArtworkCompactBars isActive={isActive} isPlaying={isPlaying} />;
  }

  return (
    <span className="pointer-events-none absolute left-1 top-0.5 text-[10px] font-semibold tabular-nums text-white/85 drop-shadow-sm">
      {rank}
    </span>
  );
}

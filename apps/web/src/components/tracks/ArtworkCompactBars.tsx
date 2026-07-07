import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";

interface ArtworkCompactBarsProps {
  isActive: boolean;
  isPlaying: boolean;
}

export function ArtworkCompactBars({ isActive, isPlaying }: ArtworkCompactBarsProps) {
  if (!isActive) return null;

  return (
    <div className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-black/45 px-0.5 py-px">
      <PlaybackBars active={isActive} playing={isPlaying} variant="row-compact" />
    </div>
  );
}

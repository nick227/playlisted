import type { CSSProperties } from "react";

type PlaybackBarsVariant = "row" | "row-compact" | "thumb";
type BarStyle = CSSProperties & {
  "--bar-index": number;
  "--bar-rest-height": string;
  "--bar-peak-height": string;
};

interface PlaybackBarsProps {
  active?: boolean;
  playing?: boolean;
  variant?: PlaybackBarsVariant;
  className?: string;
  barCount?: number;
}

export function PlaybackBars({
  active = false,
  playing = false,
  variant = "row",
  className = "",
  barCount = 4,
}: PlaybackBarsProps) {
  const bars = Array.from({ length: barCount });
  const restHeights = ["38%", "62%", "48%", "72%", "54%"];
  const peakHeights = ["86%", "58%", "92%", "68%", "82%"];

  return (
    <span
      className={[
        "playback-bars",
        `playback-bars--${variant}`,
        active ? "is-active" : "is-inactive",
        playing ? "is-playing" : "is-paused",
        className,
      ].join(" ")}
      aria-hidden="true"
      data-playback-indicator=""
    >
      {bars.map((_, index) => (
        <span
          key={index}
          className="playback-bars__bar"
          style={
            {
              "--bar-index": index,
              "--bar-rest-height": restHeights[index % restHeights.length],
              "--bar-peak-height": peakHeights[index % peakHeights.length],
            } as BarStyle
          }
        />
      ))}
    </span>
  );
}

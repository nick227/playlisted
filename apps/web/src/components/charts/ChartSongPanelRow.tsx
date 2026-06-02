import { Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";

interface ChartSongPanelRowProps {
  rank: number;
  recordingId: string;
  playbackOrigin: string;
  title: string;
  titleHref: string;
  subtitle: string;
  subtitleHref: string;
  imageUrl?: string | null;
  playCount: number;
  onPlay: () => void;
  actionSlot: ReactNode;
}

export function ChartSongPanelRow({
  rank,
  recordingId,
  playbackOrigin,
  title,
  titleHref,
  subtitle,
  subtitleHref,
  imageUrl,
  playCount,
  onPlay,
  actionSlot,
}: ChartSongPanelRowProps) {
  const { isActive, isPlaying } = useTrackPlayback(recordingId, playbackOrigin);

  return (
    <li>
      <div
        className={[
          "group/row grid w-full grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition",
          isActive ? "bg-white/10" : "hover:bg-white/[0.04]",
        ].join(" ")}
      >
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

        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: coverFallback(title) }}
              aria-hidden
            />
          )}
        </div>

        <div className="min-w-0">
          <Link
            to={titleHref}
            className={[
              "block truncate text-sm font-medium hover:underline",
              isActive ? "text-[var(--color-brand)]" : "text-white",
            ].join(" ")}
          >
            {title}
          </Link>
          <Link
            to={subtitleHref}
            className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)] hover:text-white"
          >
            {subtitle}
          </Link>
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-1 pl-2">
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {actionSlot}
          </div>
          <div className="flex items-center gap-2">
            {playCount > 0 ? (
              <span className="hidden text-xs tabular-nums text-[var(--color-text-subtle)] sm:inline">
                {formatPlayCount(playCount)}
              </span>
            ) : null}
            <FavoriteHeartButton
              target="recording"
              id={recordingId}
              variant="inline"
              inlineAlwaysVisible
              className="-mr-1.5"
            />
          </div>
        </div>
      </div>
    </li>
  );
}

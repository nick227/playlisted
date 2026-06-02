import type { ReactNode } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";

import { ChartRowPlayControls } from "./ChartRowPlayControls";
import { ChartRowSubtitle, ChartRowTitle } from "./ChartRowText";

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
        <ChartRowPlayControls
          rank={rank}
          isActive={isActive}
          isPlaying={isPlaying}
          onPlay={onPlay}
        />

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
          <ChartRowTitle title={title} href={titleHref} active={isActive} />
          <ChartRowSubtitle text={subtitle} href={subtitleHref} />
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

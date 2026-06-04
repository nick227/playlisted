import type { ReactNode } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";

import { ChartRowPlayControls } from "./ChartRowPlayControls";
import { ChartRowSubtitle, ChartRowTitle } from "./ChartRowText";

type ChartPanelFavorite = {
  target: "recording" | "playlist" | "artist";
  id: string;
};

export type ChartPanelPlayState = {
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
};

interface ChartPanelRowProps {
  rank: number;
  title: string;
  titleHref: string;
  subtitle: string;
  subtitleHref: string;
  genre?: { name: string; slug: string } | null;
  imageUrl?: string | null;
  imageShape?: "square" | "circle";
  playCount: number;
  play: ChartPanelPlayState;
  favorite: ChartPanelFavorite;
  actionSlot?: ReactNode;
}

export function ChartPanelRow({
  rank,
  title,
  titleHref,
  subtitle,
  subtitleHref,
  genre,
  imageUrl,
  imageShape = "square",
  playCount,
  play,
  favorite,
  actionSlot,
}: ChartPanelRowProps) {
  const rounded = imageShape === "circle" ? "rounded-full" : "rounded-md";
  const { isActive, isPlaying, onPlay } = play;

  return (
    <li>
      <div
        className={[
          "grid w-full grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition",
          isActive ? "bg-white/10" : "hover:bg-white/[0.04]",
        ].join(" ")}
      >
        <ChartRowPlayControls
          rank={rank}
          isActive={isActive}
          isPlaying={isPlaying}
          onPlay={onPlay}
        />

        <button
          type="button"
          onClick={onPlay}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className={`h-10 w-10 shrink-0 cursor-pointer overflow-hidden ${rounded}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className={`h-full w-full object-cover ${rounded}`} />
          ) : (
            <div
              className={`h-full w-full ${rounded}`}
              style={{ background: coverFallback(title) }}
              aria-hidden
            />
          )}
        </button>

        <div className="min-w-0">
          <ChartRowTitle title={title} href={titleHref} active={isActive} />
          <ChartRowSubtitle text={subtitle} href={subtitleHref} genre={genre} />
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-1 pl-2">
          <div
            className="flex w-8 shrink-0 justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {actionSlot}
          </div>
          <div className="flex items-center gap-2">
            {playCount > 0 ? (
              <span className="hidden text-xs tabular-nums text-[var(--color-text-subtle)] sm:inline">
                {formatPlayCount(playCount)}
              </span>
            ) : null}
            <FavoriteHeartButton
              target={favorite.target}
              id={favorite.id}
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

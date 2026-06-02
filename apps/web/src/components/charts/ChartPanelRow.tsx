import type { ReactNode } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { coverFallback } from "@/lib/routes";

import { ChartRowPlayControls } from "./ChartRowPlayControls";
import { ChartRowSubtitle, ChartRowTitle } from "./ChartRowText";

type ChartPanelFavorite = {
  target: "playlist" | "artist";
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
  titleHref?: string;
  subtitle?: string;
  subtitleHref?: string;
  imageUrl?: string | null;
  imageShape?: "square" | "circle";
  lead?: ReactNode;
  stat?: ReactNode;
  favorite?: ChartPanelFavorite;
  actionSlot?: ReactNode;
  play?: ChartPanelPlayState;
}

function ChartPanelArtwork({
  title,
  imageUrl,
  rounded,
}: {
  title: string;
  imageUrl?: string | null;
  rounded: string;
}) {
  return (
    <div className={`h-10 w-10 shrink-0 overflow-hidden ${rounded}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className={`h-full w-full object-cover ${rounded}`} />
      ) : (
        <div
          className={`h-full w-full ${rounded}`}
          style={{ background: coverFallback(title) }}
          aria-hidden
        />
      )}
    </div>
  );
}

export function ChartPanelRow({
  rank,
  title,
  titleHref,
  subtitle,
  subtitleHref,
  imageUrl,
  imageShape = "square",
  lead,
  stat,
  favorite,
  actionSlot,
  play,
}: ChartPanelRowProps) {
  const rounded = imageShape === "circle" ? "rounded-full" : "rounded-md";
  const playable = Boolean(play);

  return (
    <li>
      <div
        className={[
          playable
            ? "group/row grid w-full grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition"
            : "grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition hover:bg-white/[0.04]",
          playable && play?.isActive ? "bg-white/10" : playable ? "hover:bg-white/[0.04]" : "",
        ].join(" ")}
      >
        {playable && play ? (
          <ChartRowPlayControls
            rank={rank}
            isActive={play.isActive}
            isPlaying={play.isPlaying}
            onPlay={play.onPlay}
          />
        ) : (
          <span className="w-5 text-center text-sm tabular-nums text-[var(--color-text-subtle)]">
            {rank}
          </span>
        )}

        {lead ?? <ChartPanelArtwork title={title} imageUrl={imageUrl} rounded={rounded} />}

        <div className="min-w-0">
          <ChartRowTitle title={title} href={titleHref} active={play?.isActive} />
          {subtitle ? <ChartRowSubtitle text={subtitle} href={subtitleHref} /> : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-1 pl-2">
          {actionSlot ? (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actionSlot}
            </div>
          ) : null}
          {stat || favorite ? (
            <div className="flex items-center gap-2">
              {stat ? (
                <div className="text-xs font-medium tabular-nums text-[var(--color-text-muted)]">
                  {stat}
                </div>
              ) : null}
              {favorite ? (
                <FavoriteHeartButton
                  target={favorite.target}
                  id={favorite.id}
                  variant="inline"
                  inlineAlwaysVisible
                  className="-mr-1.5"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

import type { ReactNode } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { WaveformTrackRow } from "@/components/tracks/WaveformTrackRow";
import { TrackRowPlayCount, stopRowPropagation } from "@/components/tracks/trackRowUi";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";

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
  secondaryMeta?: string;
  variant?: "panel" | "page";
  audioUrl?: string | null;
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
  secondaryMeta,
  variant = "panel",
  audioUrl,
}: ChartPanelRowProps) {
  const { isActive, isPlaying, onPlay } = play;
  const isPage = variant === "page";

  const leftSlot = (
    <ChartRowPlayControls rank={rank} isActive={isActive} isPlaying={isPlaying} />
  );

  const titleSlot = <ChartRowTitle title={title} href={titleHref} active={isActive} />;
  const subtitleSlot = (
    <div className="flex items-end gap-1.5 shrink-0">
      <PlaybackBars active={isActive} playing={isPlaying} variant="row-compact" className="opacity-80 mb-[2px]" />
      <div className="leading-none flex items-center">
        <ChartRowSubtitle text={subtitle} href={subtitleHref} genre={genre} />
      </div>
    </div>
  );

  const rightSlot = (
    <>
      {secondaryMeta ? (
        <span className="hidden shrink-0 text-xs text-[var(--color-text-subtle)] md:inline">
          {secondaryMeta}
        </span>
      ) : null}



      <TrackRowPlayCount count={playCount} suffix={isPage ? " plays" : ""} />
      <FavoriteHeartButton
        target={favorite.target}
        id={favorite.id}
        variant="inline"
        inlineAlwaysVisible
      />
    </>
  );

  return (
    <li>
      <WaveformTrackRow
        id={favorite.id}
        audioUrl={audioUrl}
        isActive={isActive}
        isPlaying={isPlaying}
        onPlay={onPlay}
        imageUrl={imageUrl}
        imageShape={imageShape}
        leftSlot={leftSlot}
        titleSlot={titleSlot}
        subtitleSlot={subtitleSlot}
        rightSlot={rightSlot}
        className={isPage ? "px-4 py-3" : "px-3 py-2.5"}
      />
    </li>
  );
}

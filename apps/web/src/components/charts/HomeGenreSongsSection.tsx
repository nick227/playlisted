import type { LibraryGenre, TopSongItem } from "@playlisted/client-sdk";
import { useMemo } from "react";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { useTopSongs } from "@/hooks/useCharts";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { homeChartSongOrigin } from "@/lib/playbackOrigin";
import { topSongToQueueTrack } from "@/lib/queueTrack";

import {
  CHART_PANELS_GRID_CLASS,
  HOME_CHART_ITEM_LIMIT,
  HOME_CHART_RANGE_LABEL,
} from "./chartConfig";
import { ChartPanelContainer } from "./ChartPanelContainer";
import { SkeletonRow } from "./ChartPanelSkeleton";
import { ChartSongPanelRow } from "./ChartSongPanelRow";
import {
  topSongPanelHref,
  topSongPanelShareUrl,
  topSongPanelSubtitleHref,
} from "./chartSongUtils";
import { useHomeChartSongPlayback } from "./useHomeChartSongPlayback";

const GENRE_CHART_RANGE = "all" as const;
const GENRE_PANEL_COUNT = 3;
const GENRE_MIN_SONGS = 5;

function stablePickGenresByDay(genres: LibraryGenre[], count: number): LibraryGenre[] {
  const seed = Math.floor(Date.now() / 86_400_000);
  return genres
    .map((item, i) => ({ item, sort: Math.sin(seed + i * 127) }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, count)
    .map(({ item }) => item);
}

function GenreSongPanel({ genre }: { genre: LibraryGenre }) {
  const { data, isLoading } = useTopSongs(GENRE_CHART_RANGE, HOME_CHART_ITEM_LIMIT, genre.slug);
  const { play } = useHomeChartSongPlayback(`genre-${genre.slug}`, genre.name);
  const songs = data?.data ?? [];

  if (!isLoading && songs.length === 0) return null;

  return (
    <ChartPanelContainer
      title={genre.name}
      subtitle={`Top songs — ${HOME_CHART_RANGE_LABEL[GENRE_CHART_RANGE]}`}
    >
      {isLoading
        ? Array.from({ length: HOME_CHART_ITEM_LIMIT }).map((_, i) => <SkeletonRow key={i} />)
        : songs.map((item: TopSongItem) => (
            <ChartSongPanelRow
              key={item.recordingId}
              rank={item.rank}
              recordingId={item.recordingId}
              playbackOrigin={homeChartSongOrigin(`genre-${genre.slug}`, item.recordingId)}
              title={item.title}
              titleHref={topSongPanelHref(item)}
              subtitle={item.uploader.displayName}
              subtitleHref={topSongPanelSubtitleHref(item)}
              genre={item.genre}
              imageUrl={item.artworkUrl}
              playCount={item.playCount}
              onPlay={() => play(item, songs)}
              actionSlot={
                <RecordingActionMenu
                  recordingId={item.recordingId}
                  title={item.title}
                  queueTrack={topSongToQueueTrack(item)}
                  shareUrl={topSongPanelShareUrl(item)}
                />
              }
            />
          ))}
    </ChartPanelContainer>
  );
}

export function HomeGenreSongsSection() {
  const { data: genreData, isLoading } = useLibraryGenres({ minSongCount: GENRE_MIN_SONGS });

  const picks = useMemo(
    () => stablePickGenresByDay(genreData?.data ?? [], GENRE_PANEL_COUNT),
    [genreData],
  );

  if (isLoading || picks.length === 0) return null;

  return (
    <section className={CHART_PANELS_GRID_CLASS} aria-label="Songs by Genre">
      {picks.map((genre) => (
        <GenreSongPanel key={genre.id} genre={genre} />
      ))}
    </section>
  );
}

import type { TopSongItem } from "@playlisted/client-sdk";
import { useMemo } from "react";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { useTopSongs } from "@/hooks/useCharts";
import { homeChartSongOrigin } from "@/lib/playbackOrigin";
import { topSongToQueueTrack } from "@/lib/queueTrack";

import { ChartPanelContainer } from "./ChartPanelContainer";
import { SkeletonRow } from "./ChartPanelSkeleton";
import { ChartSongPanelRow } from "./ChartSongPanelRow";
import {
  topSongPanelHref,
  topSongPanelShareUrl,
  topSongPanelSubtitleHref,
} from "./chartSongUtils";
import { useHomeChartSongPlayback } from "./useHomeChartSongPlayback";

const RANDOM_SONG_COUNT = 5;
const RANDOM_SONG_POOL_SIZE = 50;
const RANDOM_SONG_RANGE = "all" as const;
const RANDOM_PANEL_ID = "random-songs";

function randomSortValue(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }

  return Math.random();
}

function pickRandomSongs(items: TopSongItem[], count: number): TopSongItem[] {
  return [...items]
    .map((item) => ({
      item,
      sort: randomSortValue(),
    }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, count)
    .map(({ item }) => item);
}

export function RandomSongsSection() {
  const { data, isLoading } = useTopSongs(RANDOM_SONG_RANGE, RANDOM_SONG_POOL_SIZE);
  const { play } = useHomeChartSongPlayback(RANDOM_PANEL_ID, "Random Songs");

  const songs = useMemo(
    () => pickRandomSongs(data?.data ?? [], RANDOM_SONG_COUNT),
    [data],
  );

  if (!isLoading && songs.length === 0) return null;

  return (
    <section className="w-full" aria-label="Random Songs">
      <ChartPanelContainer title="Random Songs" subtitle="Five wild picks from the catalog">
        {isLoading
          ? Array.from({ length: RANDOM_SONG_COUNT }).map((_, i) => <SkeletonRow key={i} />)
          : songs.map((item, i) => (
              <ChartSongPanelRow
                key={item.recordingId}
                rank={i + 1}
                recordingId={item.recordingId}
                playbackOrigin={homeChartSongOrigin(RANDOM_PANEL_ID, item.recordingId)}
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
    </section>
  );
}
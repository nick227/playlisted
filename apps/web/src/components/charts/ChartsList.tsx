import type { ChartRange } from "@playlisted/client-sdk";
import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";

import { EmptyState } from "@/components/feedback/EmptyState";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { PlaylistActionMenu } from "@/components/media/PlaylistActionMenu";
import { formatProfileDate } from "@/lib/format";
import { chartsPageSongOrigin } from "@/lib/playbackOrigin";
import { topSongToQueueTrack } from "@/lib/queueTrack";
import { playlistPath, profilePath } from "@/lib/routes";
import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";

import { CHARTS_PAGE_ITEM_LIMIT, HOME_CHART_RANGE_LABEL } from "./chartConfig";
import { ChartPanelRow } from "./ChartPanelRow";
import { SkeletonRow } from "./ChartPanelSkeleton";
import { ChartSongPanelRow } from "./ChartSongPanelRow";
import {
  topSongPanelHref,
  topSongPanelShareUrl,
  topSongPanelSubtitleHref,
} from "./chartSongUtils";
import {
  useChartsPageArtistPlayback,
  useChartsPagePlaylistPlayback,
  useChartsPageSongPlayback,
} from "./useChartsPagePlayback";
import type { ChartsTab } from "@/lib/chartsPageState";

interface ChartsListProps {
  tab: ChartsTab;
  range: ChartRange;
  genre: string | null;
}

function ChartsListSkeleton() {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </ul>
  );
}

function ChartsSongsList({ range, genre }: { range: ChartRange; genre: string | null }) {
  const { data, isLoading } = useTopSongs(range, CHARTS_PAGE_ITEM_LIMIT, genre ?? undefined);
  const { play } = useChartsPageSongPlayback();
  const songs = data?.data ?? [];

  if (isLoading) return <ChartsListSkeleton />;
  if (songs.length === 0) {
    return <EmptyState title="No songs in this chart" description="Try a different period or genre." />;
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {songs.map((item: TopSongItem) => (
        <ChartSongPanelRow
          key={item.recordingId}
          variant="page"
          rank={item.rank}
          recordingId={item.recordingId}
          playbackOrigin={chartsPageSongOrigin(item.recordingId)}
          title={item.title}
          titleHref={topSongPanelHref(item)}
          subtitle={item.uploader.displayName}
          subtitleHref={topSongPanelSubtitleHref(item)}
          genre={item.genre}
          imageUrl={item.artworkUrl}
          playCount={item.playCount}
          secondaryMeta={formatProfileDate(item.createdAt)}
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
    </ul>
  );
}

function ChartsPlaylistsList({ range }: { range: ChartRange }) {
  const { data, isLoading } = useTopPlaylists(range, CHARTS_PAGE_ITEM_LIMIT);
  const { play, isActive, isPlaying } = useChartsPagePlaylistPlayback();
  const playlists = data?.data ?? [];

  if (isLoading) return <ChartsListSkeleton />;
  if (playlists.length === 0) {
    return <EmptyState title="No playlists in this chart" description="Try a different period." />;
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {playlists.map((item: TopPlaylistItem) => (
        <ChartPanelRow
          key={item.playlistId}
          variant="page"
          rank={item.rank}
          title={item.title}
          titleHref={playlistPath({
            id: item.playlistId,
            username: item.owner.username,
            slug: item.slug,
          })}
          subtitle={`by ${item.owner.displayName}`}
          subtitleHref={profilePath(item.owner.username)}
          genre={item.genre}
          imageUrl={item.coverArtUrl}
          playCount={item.playCount}
          secondaryMeta={`${item.itemCount} track${item.itemCount === 1 ? "" : "s"}`}
          play={{
            isActive: isActive(item.playlistId),
            isPlaying: isPlaying(item.playlistId),
            onPlay: () => void play(item),
          }}
          favorite={{ target: "playlist", id: item.playlistId }}
          actionSlot={
            <PlaylistActionMenu
              playlistId={item.playlistId}
              title={item.title}
              ownerUsername={item.owner.username}
              slug={item.slug}
            />
          }
        />
      ))}
    </ul>
  );
}

function ChartsArtistsList({ range }: { range: ChartRange }) {
  const { data, isLoading } = useTopArtists(range, CHARTS_PAGE_ITEM_LIMIT);
  const { play, isActive, isPlaying } = useChartsPageArtistPlayback();
  const artists = data?.data ?? [];

  if (isLoading) return <ChartsListSkeleton />;
  if (artists.length === 0) {
    return <EmptyState title="No artists in this chart" description="Try a different period." />;
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {artists.map((item: TopArtistItem) => (
        <ChartPanelRow
          key={item.userId}
          variant="page"
          rank={item.rank}
          title={item.displayName}
          titleHref={profilePath(item.username)}
          subtitle={`@${item.username}`}
          subtitleHref={profilePath(item.username)}
          imageUrl={item.avatarUrl}
          imageShape="circle"
          playCount={item.playCount}
          play={{
            isActive: isActive(item.userId),
            isPlaying: isPlaying(item.userId),
            onPlay: () => void play(item),
          }}
          favorite={{ target: "artist", id: item.userId }}
        />
      ))}
    </ul>
  );
}

export function ChartsList({ tab, range, genre }: ChartsListProps) {
  const rangeLabel = HOME_CHART_RANGE_LABEL[range];

  return (
    <section aria-label={`Top ${tab}`}>
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">
        Ranked by most played · {rangeLabel}
      </p>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {tab === "songs" ? (
          <ChartsSongsList range={range} genre={genre} />
        ) : tab === "playlists" ? (
          <ChartsPlaylistsList range={range} />
        ) : (
          <ChartsArtistsList range={range} />
        )}
      </div>
    </section>
  );
}

import type { ChartRange } from "@playlisted/client-sdk";
import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { PlaylistActionMenu } from "@/components/media/PlaylistActionMenu";
import { formatProfileDate } from "@/lib/format";
import { chartsPageSongOrigin } from "@/lib/playbackOrigin";
import { topSongToQueueTrack } from "@/lib/queueTrack";
import { playlistPath, profilePath } from "@/lib/routes";
import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import type { ChartsTab } from "@/lib/chartsPageState";

import { CHARTS_PAGE_ITEM_LIMIT } from "./chartConfig";
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

interface ChartsListProps {
  tab: ChartsTab;
  range: ChartRange;
  genre: string | null;
  limit?: number;
}

function ChartsListSkeleton({ count }: { count: number }) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </ul>
  );
}

function ChartsTabPanel({
  tab,
  activeTab,
  label,
  children,
}: {
  tab: ChartsTab;
  activeTab: ChartsTab;
  label: string;
  children: ReactNode;
}) {
  const isActive = tab === activeTab;
  return (
    <section
      aria-label={label}
      hidden={!isActive}
      className={isActive ? undefined : "hidden"}
    >
      {children}
    </section>
  );
}

export function ChartsList({ tab, range, genre, limit = CHARTS_PAGE_ITEM_LIMIT }: ChartsListProps) {
  const { play: playSong } = useChartsPageSongPlayback();
  const { play: playPlaylist, isActive: playlistActive, isPlaying: playlistPlaying } =
    useChartsPagePlaylistPlayback();
  const { play: playArtist, isActive: artistActive, isPlaying: artistPlaying } =
    useChartsPageArtistPlayback();

  const topSongs = useTopSongs(range, limit, genre ?? undefined, true, true);
  const topPlaylists = useTopPlaylists(range, limit, true, true);
  const topArtists = useTopArtists(range, limit, true, true);

  const songs = topSongs.data?.data ?? [];
  const playlists = topPlaylists.data?.data ?? [];
  const artists = topArtists.data?.data ?? [];

  const songsLoading = topSongs.isPending && songs.length === 0;
  const playlistsLoading = topPlaylists.isPending && playlists.length === 0;
  const artistsLoading = topArtists.isPending && artists.length === 0;

  return (
    <>
        <ChartsTabPanel tab="songs" activeTab={tab} label="Top songs">
          {songsLoading ? (
            <ChartsListSkeleton count={limit} />
          ) : songs.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No songs in this chart" description="Try a different period or genre." />
            </div>
          ) : (
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
                  onPlay={() => playSong(item, songs)}
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
          )}
        </ChartsTabPanel>

        <ChartsTabPanel tab="playlists" activeTab={tab} label="Top playlists">
          {playlistsLoading ? (
            <ChartsListSkeleton count={limit} />
          ) : playlists.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No playlists in this chart" description="Try a different period." />
            </div>
          ) : (
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
                    isActive: playlistActive(item.playlistId),
                    isPlaying: playlistPlaying(item.playlistId),
                    onPlay: () => void playPlaylist(item),
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
          )}
        </ChartsTabPanel>

        <ChartsTabPanel tab="artists" activeTab={tab} label="Top artists">
          {artistsLoading ? (
            <ChartsListSkeleton count={limit} />
          ) : artists.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No artists in this chart" description="Try a different period." />
            </div>
          ) : (
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
                    isActive: artistActive(item.userId),
                    isPlaying: artistPlaying(item.userId),
                    onPlay: () => void playArtist(item),
                  }}
                  favorite={{ target: "artist", id: item.userId }}
                />
              ))}
            </ul>
          )}
        </ChartsTabPanel>
    </>
  );
}

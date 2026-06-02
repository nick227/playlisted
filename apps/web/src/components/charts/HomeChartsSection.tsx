import { Play } from "lucide-react";
import type { ChartRange, TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { PlaylistActionMenu } from "@/components/media/PlaylistActionMenu";
import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import { useIsMdUp } from "@/hooks/useIsMdUp";
import { formatPlayCount } from "@/lib/format";
import { homeChartSongOrigin } from "@/lib/playbackOrigin";
import { chartItemPlaybackContext, topSongToQueueTrack } from "@/lib/queueTrack";
import { playlistPath, profilePath } from "@/lib/routes";
import { recordingShareUrl } from "@/lib/shareContent";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { ChartPanelContainer } from "./ChartPanelContainer";
import { ChartPanelRow } from "./ChartPanelRow";
import { ChartPanelSkeleton } from "./ChartPanelSkeleton";
import { ChartSongPanelRow } from "./ChartSongPanelRow";

const CHART_RANGE: ChartRange = "7d";
const CHART_RANGE_LABEL = "last 7 days";
const CHART_SECTION_KEY = "top-songs";
const TOP_SONGS_LIMIT = 6;
const TOP_ARTISTS_LIMIT = 6;

function viewportLimit(mobile: number, desktop: number, isMdUp: boolean): number {
  return isMdUp ? desktop : mobile;
}

function PlayStat({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Play size={12} className="opacity-70" aria-hidden />
      {formatPlayCount(count)}
    </span>
  );
}

export function HomeChartsSection() {
  const isMdUp = useIsMdUp();
  const topPlaylistsLimit = viewportLimit(4, 6, isMdUp);

  const topSongs = useTopSongs(CHART_RANGE, TOP_SONGS_LIMIT);
  const topPlaylists = useTopPlaylists(CHART_RANGE, topPlaylistsLimit);
  const topArtists = useTopArtists(CHART_RANGE, TOP_ARTISTS_LIMIT);

  const { playTrack, currentTrack, activeOriginKey, togglePlay } = useAudioPlayer();

  function playChartSong(item: TopSongItem, siblings: TopSongItem[]) {
    const origin = homeChartSongOrigin(CHART_SECTION_KEY, item.recordingId);
    if (currentTrack?.id === item.recordingId && activeOriginKey === origin) {
      togglePlay();
      return;
    }
    const idx = siblings.findIndex((s) => s.recordingId === item.recordingId);
    if (idx < 0) return;
    const tracks = siblings.map((s) => topSongToQueueTrack(s, "Top Songs"));
    playTrack(topSongToQueueTrack(item, "Top Songs"), tracks, chartItemPlaybackContext(item), {
      segmentLabel: "Top Songs",
      playbackOrigin: origin,
    });
  }

  const loading = topSongs.isLoading || topPlaylists.isLoading || topArtists.isLoading;
  const songs = topSongs.data?.data ?? [];
  const playlists = topPlaylists.data?.data ?? [];
  const artists = topArtists.data?.data ?? [];

  if (loading) return <ChartPanelSkeleton />;

  const hasCharts = songs.length > 0 || playlists.length > 0 || artists.length > 0;
  if (!hasCharts) return null;

  return (
    <section className="mb-10 grid gap-4 lg:grid-cols-3" aria-label="Charts">
      {songs.length > 0 ? (
        <ChartPanelContainer
          title="Top Songs"
          subtitle={`Most-played — ${CHART_RANGE_LABEL}`}
        >
          {songs.map((item: TopSongItem) => (
            <ChartSongPanelRow
              key={item.recordingId}
              rank={item.rank}
              recordingId={item.recordingId}
              playbackOrigin={homeChartSongOrigin(CHART_SECTION_KEY, item.recordingId)}
              title={item.title}
              titleHref={`${playlistPath({
                id: item.publishedPlaylistId,
                username: item.playlist.owner.username,
                slug: item.playlist.slug,
              })}#track-${item.recordingId}`}
              subtitle={item.uploader.displayName}
              subtitleHref={profilePath(item.uploader.username)}
              imageUrl={item.artworkUrl}
              playCount={item.playCount}
              onPlay={() => playChartSong(item, songs)}
              actionSlot={
                <RecordingActionMenu
                  recordingId={item.recordingId}
                  title={item.title}
                  queueTrack={topSongToQueueTrack(item)}
                  shareUrl={recordingShareUrl({
                    playlistId: item.playlist.id,
                    recordingId: item.recordingId,
                    username: item.playlist.owner.username,
                    slug: item.playlist.slug,
                  })}
                />
              }
            />
          ))}
        </ChartPanelContainer>
      ) : null}

      {playlists.length > 0 ? (
        <ChartPanelContainer
          title="Top Playlists"
          subtitle={`Most-played collections — ${CHART_RANGE_LABEL}`}
        >
          {playlists.map((item: TopPlaylistItem) => (
            <ChartPanelRow
              key={item.playlistId}
              rank={item.rank}
              title={item.title}
              titleHref={playlistPath({
                id: item.playlistId,
                username: item.owner.username,
                slug: item.slug,
              })}
              subtitle={`by ${item.owner.displayName}`}
              subtitleHref={profilePath(item.owner.username)}
              imageUrl={item.coverArtUrl}
              stat={<PlayStat count={item.playCount} />}
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
        </ChartPanelContainer>
      ) : null}

      {artists.length > 0 ? (
        <ChartPanelContainer
          title="Top Artists"
          subtitle={`Creators driving the most plays — ${CHART_RANGE_LABEL}`}
        >
          {artists.map((item: TopArtistItem) => (
            <ChartPanelRow
              key={item.userId}
              rank={item.rank}
              title={item.displayName}
              titleHref={profilePath(item.username)}
              subtitle={`@${item.username}`}
              imageUrl={item.avatarUrl}
              imageShape="circle"
              stat={<PlayStat count={item.playCount} />}
            />
          ))}
        </ChartPanelContainer>
      ) : null}
    </section>
  );
}

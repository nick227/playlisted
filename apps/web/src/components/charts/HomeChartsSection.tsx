import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";

import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { PlaylistActionMenu } from "@/components/media/PlaylistActionMenu";
import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import { useIsMdUp } from "@/hooks/useIsMdUp";
import { CHARTS_PATH } from "@/lib/browsePaths";
import { homeChartSongOrigin } from "@/lib/playbackOrigin";
import { topSongToQueueTrack } from "@/lib/queueTrack";
import { playlistPath, profilePath } from "@/lib/routes";

import {
  CHART_PANELS_GRID_CLASS,
  HOME_CHART_ITEM_LIMIT,
  HOME_CHART_PLAYLIST_LIMIT,
  HOME_CHART_RANGE,
  HOME_CHART_RANGE_LABEL,
  HOME_CHART_SONG_SECTION,
} from "./chartConfig";
import { ChartPanelContainer } from "./ChartPanelContainer";
import { ChartPanelRow } from "./ChartPanelRow";
import { ChartPanelSkeleton } from "./ChartPanelSkeleton";
import { ChartSongPanelRow } from "./ChartSongPanelRow";
import {
  topSongPanelHref,
  topSongPanelShareUrl,
  topSongPanelSubtitleHref,
} from "./chartSongUtils";
import { useHomeChartArtistPlayback } from "./useHomeChartArtistPlayback";
import { useHomeChartPlaylistPlayback } from "./useHomeChartPlaylistPlayback";
import { useHomeChartSongPlayback } from "./useHomeChartSongPlayback";

function chartPlaylistLimit(isMdUp: boolean): number {
  return isMdUp ? HOME_CHART_PLAYLIST_LIMIT.desktop : HOME_CHART_PLAYLIST_LIMIT.mobile;
}

export function HomeChartsSection() {
  const isMdUp = useIsMdUp();
  const { play: playChartSong } = useHomeChartSongPlayback();
  const { play: playChartPlaylist, isActive: playlistActive, isPlaying: playlistPlaying } =
    useHomeChartPlaylistPlayback();
  const { play: playChartArtist, isActive: artistActive, isPlaying: artistPlaying } =
    useHomeChartArtistPlayback();

  const topSongs = useTopSongs(HOME_CHART_RANGE, HOME_CHART_ITEM_LIMIT);
  const topPlaylists = useTopPlaylists(HOME_CHART_RANGE, chartPlaylistLimit(isMdUp));
  const topArtists = useTopArtists(HOME_CHART_RANGE, HOME_CHART_ITEM_LIMIT);

  const loading = topSongs.isLoading || topPlaylists.isLoading || topArtists.isLoading;
  const songs = topSongs.data?.data ?? [];
  const playlists = topPlaylists.data?.data ?? [];
  const artists = topArtists.data?.data ?? [];

  if (loading) return <ChartPanelSkeleton />;

  if (songs.length === 0 && playlists.length === 0 && artists.length === 0) return null;

  const rangeLabel = HOME_CHART_RANGE_LABEL[HOME_CHART_RANGE];

  return (
    <section className={CHART_PANELS_GRID_CLASS} aria-label="Charts">
      {songs.length > 0 ? (
        <ChartPanelContainer
          title="Top Songs"
          subtitle={`Most-played — ${rangeLabel}`}
          viewAllHref={`${CHARTS_PATH}?tab=songs`}
        >
          {songs.map((item: TopSongItem) => (
            <ChartSongPanelRow
              key={item.recordingId}
              rank={item.rank}
              recordingId={item.recordingId}
              playbackOrigin={homeChartSongOrigin(HOME_CHART_SONG_SECTION, item.recordingId)}
              title={item.title}
              titleHref={topSongPanelHref(item)}
              subtitle={item.uploader.displayName}
              subtitleHref={topSongPanelSubtitleHref(item)}
              genre={item.genre}
              imageUrl={item.artworkUrl}
              playCount={item.playCount}
              onPlay={() => playChartSong(item, songs)}
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
      ) : null}

      {playlists.length > 0 ? (
        <ChartPanelContainer
          title="Top Playlists"
          subtitle={`Most-played collections — ${rangeLabel}`}
          viewAllHref={`${CHARTS_PATH}?tab=playlists`}
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
              genre={item.genre}
              imageUrl={item.coverArtUrl}
              playCount={item.playCount}
              play={{
                isActive: playlistActive(item.playlistId),
                isPlaying: playlistPlaying(item.playlistId),
                onPlay: () => void playChartPlaylist(item),
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
        </ChartPanelContainer>
      ) : null}

      {artists.length > 0 ? (
        <ChartPanelContainer
          title="Top Artists"
          subtitle={`Creators driving the most plays — ${rangeLabel}`}
          viewAllHref={`${CHARTS_PATH}?tab=artists`}
        >
          {artists.map((item: TopArtistItem) => (
            <ChartPanelRow
              key={item.userId}
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
                onPlay: () => void playChartArtist(item),
              }}
              favorite={{ target: "artist", id: item.userId }}
            />
          ))}
        </ChartPanelContainer>
      ) : null}
    </section>
  );
}

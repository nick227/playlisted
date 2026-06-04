import type { TopArtistItem, TopPlaylistItem, TopSongItem } from "@playlisted/client-sdk";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { HOME_CHART_RANGE, HOME_CHART_RANGE_LABEL } from "@/components/charts/chartConfig";
import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import { ARTISTS_PATH, PLAYLISTS_PATH, SONGS_PATH } from "@/lib/browsePaths";

import {
  HOME_BENTO_DEFAULT_LIMITS,
  HOME_BENTO_SLOTS,
  resolveHomeBentoLimits,
  selectBentoSlots,
  type HomeExploreBentoLimits,
} from "./homeBentoLayout";
import {
  bentoChartFetchSize,
  pickBentoArtists,
  pickBentoPlaylists,
  pickBentoSongs,
  type HomeBentoExcludeIds,
} from "./homeBentoPool";
import { HomeBentoMediaGrid } from "./homeBentoPanels";
import {
  useHomeBentoArtistPlayback,
  useHomeBentoPlaylistPlayback,
  useHomeBentoSongPlayback,
} from "./homeBentoPlayback";

export type { HomeExploreBentoLimits, HomeBentoExcludeIds };

export type HomeExploreBentoProps = {
  /** Per-category item caps; slots and API fetch sizes follow these counts. */
  limits?: Partial<HomeExploreBentoLimits>;
  /**
   * Skip the first N rows from the 7d chart lists (same source as HomeChartsSection)
   * so the bento shows deeper picks instead of repeating the chart panels.
   */
  skipChartOverlap?: boolean;
  /** Extra ids to omit (e.g. playlists already in Discover / Featured). */
  exclude?: HomeBentoExcludeIds;
};

export function HomeExploreBento({
  limits: limitsProp,
  skipChartOverlap = false,
  exclude,
}: HomeExploreBentoProps = {}) {
  const limits = useMemo(
    () => resolveHomeBentoLimits(limitsProp),
    [limitsProp?.songs, limitsProp?.playlists, limitsProp?.artists],
  );
  const slots = useMemo(
    () => selectBentoSlots(HOME_BENTO_SLOTS, limits),
    [limits.songs, limits.playlists, limits.artists],
  );

  const poolOptions = useMemo(
    () => ({ skipChartOverlap, exclude }),
    [skipChartOverlap, exclude],
  );

  const { play: playSong } = useHomeBentoSongPlayback();
  const { play: playPlaylist, isActive: playlistActive, isPlaying: playlistPlaying } =
    useHomeBentoPlaylistPlayback();
  const { play: playArtist, isActive: artistActive, isPlaying: artistPlaying } =
    useHomeBentoArtistPlayback();

  const topSongs = useTopSongs(
    HOME_CHART_RANGE,
    bentoChartFetchSize(limits.songs, skipChartOverlap, "songs"),
  );
  const topPlaylists = useTopPlaylists(
    HOME_CHART_RANGE,
    bentoChartFetchSize(limits.playlists, skipChartOverlap, "playlists"),
  );
  const topArtists = useTopArtists(
    HOME_CHART_RANGE,
    bentoChartFetchSize(limits.artists, skipChartOverlap, "artists"),
  );

  const songs = useMemo(
    (): TopSongItem[] =>
      pickBentoSongs(topSongs.data?.data ?? [], limits.songs, poolOptions),
    [topSongs.data, limits.songs, poolOptions],
  );
  const playlists = useMemo(
    (): TopPlaylistItem[] =>
      pickBentoPlaylists(topPlaylists.data?.data ?? [], limits.playlists, poolOptions),
    [topPlaylists.data, limits.playlists, poolOptions],
  );
  const artists = useMemo(
    (): TopArtistItem[] =>
      pickBentoArtists(topArtists.data?.data ?? [], limits.artists, poolOptions),
    [topArtists.data, limits.artists, poolOptions],
  );

  const loading = topSongs.isLoading || topPlaylists.isLoading || topArtists.isLoading;

  if (slots.length === 0) return null;

  const hasContent = loading || songs.length > 0 || playlists.length > 0 || artists.length > 0;
  if (!hasContent) return null;

  const rangeLabel = HOME_CHART_RANGE_LABEL[HOME_CHART_RANGE];

  return (
    <section className="mb-6" aria-label="Trending music">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Trending — {rangeLabel}
          </p>
          {skipChartOverlap ? (
            <p className="text-[9px] text-[var(--color-text-muted)]">More from the charts, past the homepage top lists</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-3 text-[10px] font-medium text-[var(--color-text-muted)]">
          <Link to={SONGS_PATH} className="hover:text-white">
            Songs
          </Link>
          <Link to={PLAYLISTS_PATH} className="hover:text-white">
            Playlists
          </Link>
          <Link to={ARTISTS_PATH} className="hover:text-white">
            Artists
          </Link>
        </div>
      </div>

      <HomeBentoMediaGrid
        slots={slots}
        songs={songs}
        playlists={playlists}
        artists={artists}
        loading={loading}
        onPlaySong={playSong}
        onPlayPlaylist={(item) => void playPlaylist(item)}
        playlistActive={playlistActive}
        playlistPlaying={playlistPlaying}
        onPlayArtist={playArtist}
        artistActive={artistActive}
        artistPlaying={artistPlaying}
      />
    </section>
  );
}

export { HOME_BENTO_DEFAULT_LIMITS };

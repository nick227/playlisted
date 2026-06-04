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
import { HomeBentoMediaGrid } from "./homeBentoPanels";
import {
  useHomeBentoArtistPlayback,
  useHomeBentoPlaylistPlayback,
  useHomeBentoSongPlayback,
} from "./homeBentoPlayback";

export type { HomeExploreBentoLimits };

export type HomeExploreBentoProps = {
  /** Per-category item caps; slots and API fetch sizes follow these counts. */
  limits?: Partial<HomeExploreBentoLimits>;
};

export function HomeExploreBento({ limits: limitsProp }: HomeExploreBentoProps = {}) {
  const limits = useMemo(
    () => resolveHomeBentoLimits(limitsProp),
    [limitsProp?.songs, limitsProp?.playlists, limitsProp?.artists],
  );
  const slots = useMemo(() => selectBentoSlots(HOME_BENTO_SLOTS, limits), [limits]);

  const { play: playSong } = useHomeBentoSongPlayback();
  const { play: playPlaylist, isActive: playlistActive, isPlaying: playlistPlaying } =
    useHomeBentoPlaylistPlayback();
  const { play: playArtist, isActive: artistActive, isPlaying: artistPlaying } =
    useHomeBentoArtistPlayback();

  const topSongs = useTopSongs(HOME_CHART_RANGE, limits.songs);
  const topPlaylists = useTopPlaylists(HOME_CHART_RANGE, limits.playlists);
  const topArtists = useTopArtists(HOME_CHART_RANGE, limits.artists);

  const songs = topSongs.data?.data ?? [];
  const playlists = topPlaylists.data?.data ?? [];
  const artists = topArtists.data?.data ?? [];
  const loading = topSongs.isLoading || topPlaylists.isLoading || topArtists.isLoading;

  if (!loading && slots.length === 0) return null;
  if (!loading && songs.length === 0 && playlists.length === 0 && artists.length === 0) {
    return null;
  }

  const rangeLabel = HOME_CHART_RANGE_LABEL[HOME_CHART_RANGE];

  return (
    <section className="mb-6" aria-label="Trending music">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          Trending — {rangeLabel}
        </p>
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

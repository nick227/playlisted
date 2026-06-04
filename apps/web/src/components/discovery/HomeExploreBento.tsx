import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import { HOME_CHART_RANGE, HOME_CHART_RANGE_LABEL } from "@/components/charts/chartConfig";

import {
  BentoArtistsPanel,
  BentoPlaylistsPanel,
  BentoSongsPanel,
  HOME_BENTO_ITEM_LIMIT,
} from "./homeBentoPanels";
import {
  useHomeBentoArtistPlayback,
  useHomeBentoPlaylistPlayback,
  useHomeBentoSongPlayback,
} from "./homeBentoPlayback";

export function HomeExploreBento() {
  const { play: playSong } = useHomeBentoSongPlayback();
  const { play: playPlaylist, isActive: playlistActive, isPlaying: playlistPlaying } =
    useHomeBentoPlaylistPlayback();
  const { play: playArtist, isActive: artistActive, isPlaying: artistPlaying } =
    useHomeBentoArtistPlayback();

  const topSongs = useTopSongs(HOME_CHART_RANGE, HOME_BENTO_ITEM_LIMIT);
  const topPlaylists = useTopPlaylists(HOME_CHART_RANGE, HOME_BENTO_ITEM_LIMIT);
  const topArtists = useTopArtists(HOME_CHART_RANGE, HOME_BENTO_ITEM_LIMIT);

  const songs = topSongs.data?.data ?? [];
  const playlists = topPlaylists.data?.data ?? [];
  const artists = topArtists.data?.data ?? [];
  const loading = topSongs.isLoading || topPlaylists.isLoading || topArtists.isLoading;

  if (!loading && songs.length === 0 && playlists.length === 0 && artists.length === 0) {
    return null;
  }

  const rangeLabel = HOME_CHART_RANGE_LABEL[HOME_CHART_RANGE];

  return (
    <section className="mb-6" aria-label="Trending music">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        Trending — {rangeLabel}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-1">
        {(loading || songs.length > 0) && (
          <BentoSongsPanel songs={songs} loading={loading} onPlay={playSong} />
        )}
        {(loading || playlists.length > 0) && (
          <BentoPlaylistsPanel
            playlists={playlists}
            loading={loading}
            isActive={playlistActive}
            isPlaying={playlistPlaying}
            onPlay={(item) => void playPlaylist(item)}
          />
        )}
        {(loading || artists.length > 0) && (
          <BentoArtistsPanel
            artists={artists}
            loading={loading}
            isActive={artistActive}
            isPlaying={artistPlaying}
            onPlay={playArtist}
          />
        )}
      </div>
    </section>
  );
}

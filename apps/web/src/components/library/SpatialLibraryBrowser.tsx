import { useMemo } from "react";

import {
  EMPTY_LIBRARY_ARTISTS,
  EMPTY_LIBRARY_GENRES,
  EMPTY_LIBRARY_SONGS,
  EMPTY_PLAYLISTS,
} from "@/components/library/libraryFilterUtils";
import { RootPanel, type RootPreviewData } from "@/components/library/libraryPanels";
import {
  useLibraryArtists,
  useLibraryGenres,
  useLibraryPlaylists,
  useLibrarySongs,
} from "@/hooks/useLibrary";
import { BROWSE_LAYOUT_CLASS } from "@/lib/browsePaths";

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function SpatialLibraryBrowser() {
  const genresQuery = useLibraryGenres();
  const artistsQuery = useLibraryArtists();
  const playlistsQuery = useLibraryPlaylists();
  const songsQuery = useLibrarySongs();

  const allGenres = genresQuery.data?.data
    ? genresQuery.data.data.filter((g) => g.songCount > 0)
    : EMPTY_LIBRARY_GENRES;
  const allArtists = artistsQuery.data?.data ?? EMPTY_LIBRARY_ARTISTS;
  const allPlaylists = playlistsQuery.data?.data ?? EMPTY_PLAYLISTS;
  const allSongs = songsQuery.data?.data ?? EMPTY_LIBRARY_SONGS;

  const previews = useMemo<RootPreviewData>(
    () => ({
      genres: sample(allGenres, 3),
      artists: sample(allArtists, 3),
      playlists: sample(allPlaylists, 3),
      songs: sample(allSongs, 3),
    }),
    [genresQuery.data, artistsQuery.data, playlistsQuery.data, songsQuery.data], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className={`${BROWSE_LAYOUT_CLASS} min-h-[72vh]`}>
      <RootPanel
        genreCount={allGenres.length}
        artistCount={allArtists.length}
        playlistCount={allPlaylists.length}
        songCount={allSongs.length}
        previews={previews}
      />
    </div>
  );
}

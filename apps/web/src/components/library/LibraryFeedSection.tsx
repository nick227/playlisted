import { useMemo } from "react";

import {
  EMPTY_LIBRARY_ARTISTS,
  EMPTY_LIBRARY_SONGS,
  EMPTY_PLAYLISTS,
} from "@/components/library/libraryFilterUtils";
import { MuseumFeed } from "@/components/library/museum/MuseumFeed";
import { PanelSkeleton } from "@/components/library/libraryPanels";
import {
  useLibraryArtists,
  useLibraryPlaylists,
  useLibrarySongs,
} from "@/hooks/useLibrary";

/** Infinite library discovery feed (artists, songs, playlists). */
export function LibraryFeedSection() {
  const artistsQuery = useLibraryArtists();
  const playlistsQuery = useLibraryPlaylists();
  const songsQuery = useLibrarySongs(null, true, 100);

  const allArtists = artistsQuery.data?.data ?? EMPTY_LIBRARY_ARTISTS;
  const allPlaylists = playlistsQuery.data?.data ?? EMPTY_PLAYLISTS;
  const allSongs = songsQuery.data?.data ?? EMPTY_LIBRARY_SONGS;

  const pools = useMemo(
    () => ({
      artists: allArtists,
      songs: allSongs,
      playlists: allPlaylists,
    }),
    [allArtists, allSongs, allPlaylists],
  );

  const isLoading =
    artistsQuery.isLoading ||
    playlistsQuery.isLoading ||
    songsQuery.isLoading;

  return (
    <section id="library" aria-label="Library" className="scroll-mt-4">
      {isLoading ? <PanelSkeleton /> : <MuseumFeed pools={pools} />}
    </section>
  );
}

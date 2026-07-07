import { useMemo } from "react";

import {
  EMPTY_LIBRARY_ARTISTS,
  EMPTY_LIBRARY_SONGS,
  EMPTY_PLAYLISTS,
} from "@/components/library/libraryFilterUtils";
import { LibraryBrowseLayout } from "@/components/library/LibraryBrowseLayout";
import { MuseumFeed } from "@/components/library/museum/MuseumFeed";
import { PanelSkeleton } from "@/components/library/libraryPanels";
import {
  useLibraryArtists,
  useLibraryPlaylists,
  useLibrarySongs,
} from "@/hooks/useLibrary";
import { LIBRARY_FEED_LAYOUT_CLASS } from "@/lib/browsePaths";

export function SpatialLibraryBrowser() {
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

  if (isLoading) {
    return (
      <LibraryBrowseLayout crumbs={[]} layoutClass={LIBRARY_FEED_LAYOUT_CLASS}>
        <PanelSkeleton />
      </LibraryBrowseLayout>
    );
  }

  return (
    <LibraryBrowseLayout crumbs={[]} layoutClass={LIBRARY_FEED_LAYOUT_CLASS}>
      <MuseumFeed pools={pools} />
    </LibraryBrowseLayout>
  );
}

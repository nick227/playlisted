import { useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LibraryBrowseLayout } from "@/components/library/LibraryBrowseLayout";
import {
  ArtistDetailPanel,
  ArtistsPanel,
  GenreDetailPanel,
  GenresPanel,
  PanelSkeleton,
  PlaylistsPanel,
  SongsPanel,
} from "@/components/library/libraryPanels";
import { useLibraryArtists, useLibraryGenres } from "@/hooks/useLibrary";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  artistDetailCrumbs,
  artistsBrowseCrumbs,
  genreDetailCrumbs,
  genresBrowseCrumbs,
  playlistsBrowseCrumbs,
  songsBrowseCrumbs,
} from "@/lib/browsePaths";

export function LibrarySongsPage() {
  usePageMeta({ title: "Songs", description: "Browse every public recording in the catalog." });
  return (
    <LibraryBrowseLayout crumbs={songsBrowseCrumbs()}>
      <SongsPanel />
    </LibraryBrowseLayout>
  );
}

export function LibraryGenresPage() {
  usePageMeta({ title: "Genres", description: "Browse music by genre." });
  return (
    <LibraryBrowseLayout crumbs={genresBrowseCrumbs()}>
      <GenresPanel />
    </LibraryBrowseLayout>
  );
}

export function LibraryGenrePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data } = useLibraryGenres();
  const genre = data?.data.find((item) => item.slug === slug);
  const name = genre?.name ?? slug;

  usePageMeta({ title: name, description: `Browse ${name} recordings in the catalog.` });

  if (data && !genre) {
    return <EmptyState title="Genre not found" />;
  }

  return (
    <LibraryBrowseLayout crumbs={genreDetailCrumbs(name)}>
      <GenreDetailPanel slug={slug} name={name} />
    </LibraryBrowseLayout>
  );
}

export function LibraryArtistsPage() {
  usePageMeta({ title: "Artists", description: "Browse artists in the catalog." });
  return (
    <LibraryBrowseLayout crumbs={artistsBrowseCrumbs()}>
      <ArtistsPanel />
    </LibraryBrowseLayout>
  );
}

export function LibraryArtistPage() {
  const { username = "" } = useParams<{ username: string }>();
  const decoded = decodeURIComponent(username);
  const { data, isLoading } = useLibraryArtists();
  const artist = data?.data.find(
    (item) => item.username.toLowerCase() === decoded.replace(/^@/, "").toLowerCase(),
  );

  usePageMeta({
    title: artist?.displayName ?? decoded,
    description: artist ? `Browse ${artist.displayName}'s catalog recordings.` : undefined,
  });

  if (isLoading) {
    return (
      <LibraryBrowseLayout crumbs={artistsBrowseCrumbs()}>
        <PanelSkeleton />
      </LibraryBrowseLayout>
    );
  }

  if (!artist) {
    return <EmptyState title="Artist not found" />;
  }

  return (
    <LibraryBrowseLayout crumbs={artistDetailCrumbs(artist.displayName)}>
      <ArtistDetailPanel
        artistId={artist.id}
        artistName={artist.displayName}
        artistUsername={artist.username}
        artistGenres={artist.genres}
        yearRange={artist.yearRange}
      />
    </LibraryBrowseLayout>
  );
}

export function LibraryPlaylistsPage() {
  usePageMeta({ title: "Playlists", description: "Browse curated playlists from the community." });
  return (
    <LibraryBrowseLayout crumbs={playlistsBrowseCrumbs()}>
      <PlaylistsPanel />
    </LibraryBrowseLayout>
  );
}

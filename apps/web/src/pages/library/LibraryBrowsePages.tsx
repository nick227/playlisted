import { Navigate, useParams } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LibraryBrowseLayout } from "@/components/library/LibraryBrowseLayout";
import {
  ArtistsPanel,
  GenreDetailPanel,
  GenresPanel,
  PlaylistsPanel,
  SongsPanel,
} from "@/components/library/libraryPanels";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  artistsBrowseCrumbs,
  genreDetailCrumbs,
  genresBrowseCrumbs,
  playlistsBrowseCrumbs,
  songsBrowseCrumbs,
} from "@/lib/browsePaths";
import { profilePath } from "@/lib/routes";

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

export function LibraryArtistRedirect() {
  const { username = "" } = useParams<{ username: string }>();
  return <Navigate to={profilePath(decodeURIComponent(username))} replace />;
}

export function LibraryPlaylistsPage() {
  usePageMeta({ title: "Playlists", description: "Browse curated playlists from the community." });
  return (
    <LibraryBrowseLayout crumbs={playlistsBrowseCrumbs()}>
      <PlaylistsPanel />
    </LibraryBrowseLayout>
  );
}

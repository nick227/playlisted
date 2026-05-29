import { Link, useSearchParams } from "react-router-dom";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RowSkeleton } from "@/components/feedback/Skeleton";
import { LibraryTrackRow } from "@/components/library/LibraryTrackRow";
import { api } from "@/lib/api";
import { libraryGenrePath } from "@/lib/libraryPaths";
import { usePageMeta } from "@/hooks/usePageMeta";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useQuery } from "@tanstack/react-query";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const hasQuery = q.length > 0;
  const { currentTrack, playTrack, togglePlay } = useAudioPlayer();

  usePageMeta({
    title: q ? `Search: ${q}` : "Search",
    description: q ? `Search results for "${q}" on Playlisted` : "Search songs, playlists, and artists.",
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", "unified", q],
    queryFn: () => api.search.unified({ q, pageSize: 20 }),
    enabled: hasQuery,
  });

  const songResults = results?.songs ?? [];
  const artistResults = results?.artists ?? [];
  const playlistResults = results?.playlists ?? [];
  const genreResults = results?.genres ?? [];

  function playSong(song: (typeof songResults)[number]) {
    if (currentTrack?.id === song.id) {
      togglePlay();
      return;
    }

    const queue = songResults.map((item) => librarySongToQueueTrack(item, "Search"));
    playTrack(
      librarySongToQueueTrack(song, "Search"),
      queue,
      {
        playlistId: song.playlist.id,
        playlistOwnerUsername: song.uploader.username,
        playlistSlug: song.playlist.slug,
        sourceContext: "search",
      },
      { segmentLabel: "Search" },
    );
  }

  if (!q) {
    return (
      <EmptyState
        title="Search Playlisted"
        description="Find songs, playlists, and artists from the search bar above."
      />
    );
  }

  const hasResults =
    songResults.length > 0 ||
    artistResults.length > 0 ||
    playlistResults.length > 0 ||
    genreResults.length > 0;

  if (isLoading && !hasResults) return <RowSkeleton />;

  if (!hasResults) {
    return <EmptyState title={`No results for "${q}"`} description="Try a different search term." />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-2xl font-bold">
        Results for <span className="text-[var(--color-brand)]">{q}</span>
      </h1>
      {songResults.length > 0 ? (
        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Songs</h2>
          </div>
          <div className="space-y-1">
            {songResults.map((song) => (
              <LibraryTrackRow
                key={song.id}
                song={song}
                onPlay={() => playSong(song)}
                queueTrack={librarySongToQueueTrack(song, "Search")}
              />
            ))}
          </div>
        </section>
      ) : null}
      {artistResults.length > 0 ? (
        <ContentRow title="Artists">
          {artistResults.map((u) => (
            <ArtistCard
              key={u.id}
              id={u.id}
              username={u.username}
              displayName={u.displayName}
              subtitle={`@${u.username}`}
              avatarUrl={u.avatarUrl}
            />
          ))}
        </ContentRow>
      ) : null}
      {playlistResults.length > 0 ? (
        <ContentRow title="Playlists">
          {playlistResults.map((p) => (
            <SmartPlaylistCard
              key={p.id}
              id={p.id}
              title={p.title}
              creatorName={p.owner.displayName}
              coverArtUrl={p.coverArtUrl}
              ownerUsername={p.owner.username}
              slug={p.slug}
            />
          ))}
        </ContentRow>
      ) : null}
      {genreResults.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Genres</h2>
          <ul className="flex flex-wrap gap-2">
            {genreResults.map((genre) => (
              <li key={genre.id}>
                <Link
                  to={libraryGenrePath(genre.slug)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-[var(--color-surface-hover)]"
                >
                  <span className="font-medium">{genre.name}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {genre.songCount.toLocaleString()} {genre.songCount === 1 ? "track" : "tracks"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
